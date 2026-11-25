'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ageGroups, matches, stages, teams } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { matchSchema, scoreSchema } from '@/lib/api/validation';
import { requirePermission } from '@/lib/auth/session';
import { matchService, scheduleService, standingsService } from '@/lib/domain/services';
import { parseClockMinutes, scoresFromGoals } from '@/lib/domain/tournament-status';
import { date, failure, goalEvents, read, refresh, requireConfirmed, type ActionState } from './shared';

export async function createMatchAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('match.schedule');
    await scheduleService.create(matchSchema.parse({ tournamentId: read(form, 'tournamentId'), ageGroupId: read(form, 'ageGroupId'), stageId: read(form, 'stageId'), homeTeamId: read(form, 'homeTeamId'), awayTeamId: read(form, 'awayTeamId'), pitchId: read(form, 'pitchId') || undefined, startsAt: date(form, 'startsAt'), scheduledDurationMinutes: Number(read(form, 'scheduledDurationMinutes') || 60), bufferMinutes: Number(read(form, 'bufferMinutes') || 10) }), actor.id);
    refresh('/matches', '/live-score', '/dashboard');
    return { message: 'Match scheduled.' };
  } catch (error) {
    return failure(error);
  }
}

export async function generateRoundRobinAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('match.schedule');
    const created = await scheduleService.roundRobin(read(form, 'stageId'), actor.id, date(form, 'startsAt'), read(form, 'pitchId') || undefined, Number(read(form, 'duration') || 60), Number(read(form, 'buffer') || 10));
    refresh('/matches', '/stages');
    return { message: `${created.length} Football fixtures generated.` };
  } catch (error) {
    return failure(error);
  }
}

export async function setLiveAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('match.score');
    await matchService.setLive(read(form, 'matchId'), actor.id, Number(read(form, 'minute') || 0));
    refresh('/matches', '/live-score', '/dashboard');
    return { message: 'Match is now live.' };
  } catch (error) {
    return failure(error);
  }
}

export async function finalizeMatchAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    requireConfirmed(form);
    const actor = await requirePermission('match.score');
    const matchId = read(form, 'matchId');
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    const correction = match?.status === 'FINISHED';
    if (correction && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AppError('FORBIDDEN', 'Only Super Admin may correct a finished score.', 403);
    }
    await matchService.finalize(matchId, actor.id, scoreSchema.parse({ homeScore: Number(read(form, 'homeScore')), awayScore: Number(read(form, 'awayScore')), events: [] }), correction);
    refresh('/matches', '/live-score', '/stages', '/dashboard');
    return { message: correction ? 'Official score corrected.' : 'Match finalized and standings recalculated.' };
  } catch (error) {
    return failure(error);
  }
}

export async function overrideStandingAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    requireConfirmed(form);
    const actor = await requirePermission('tournament.write');
    await standingsService.override(read(form, 'stageId'), read(form, 'teamId'), Number(read(form, 'position')), read(form, 'reason'), actor.id);
    refresh('/stages');
    return { message: 'Manual ranking override saved to the audit log.' };
  } catch (error) {
    return failure(error);
  }
}

export async function saveMatchScoreAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('match.score');
    const matchId = read(form, 'matchId');
    const [match] = await db.select().from(matches).where(and(eq(matches.id, matchId), eq(matches.tournamentId, tournamentId))).limit(1);
    if (!match) throw new AppError('NOT_FOUND', 'Match was not found.', 404);
    const events = goalEvents(form);
    const finished = read(form, 'finished') === 'on';
    const scores = events.length ? scoresFromGoals(match.homeTeamId, match.awayTeamId, events) : { homeScore: match.homeScore, awayScore: match.awayScore };
    if (finished || match.status === 'FINISHED') {
      if (match.status === 'FINISHED' && !actor.roles.includes('SUPER_ADMIN')) {
        throw new AppError('FORBIDDEN', 'Only Super Admin may correct a finished score.', 403);
      }
      await matchService.finalize(matchId, actor.id, { ...scores, events }, match.status === 'FINISHED');
    } else if (events.length) {
      await matchService.recordGoals(matchId, actor.id, events);
    }
    refresh(`/tournaments/${tournamentId}`, '/dashboard');
  } catch (error) {
    return failure(error);
  }
  redirect(`/tournaments/${tournamentId}?tab=matches`);
}

export async function createTournamentMatchAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  try {
    const actor = await requirePermission('match.schedule');
    const stageId = read(form, 'stageId');
    const [stage] = await db.select({ stage: stages, group: ageGroups }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).where(and(eq(stages.id, stageId), eq(ageGroups.tournamentId, tournamentId))).limit(1);
    if (!stage) throw new AppError('NOT_FOUND', 'Group was not found.', 404);
    if (read(form, 'ageGroupId') && read(form, 'ageGroupId') !== stage.group.id) {
      throw new AppError('VALIDATION_ERROR', 'The age category does not match the selected group.');
    }
    const homeTeamId = read(form, 'homeTeamId');
    const awayTeamId = read(form, 'awayTeamId');
    const startsAt = new Date(read(form, 'startsAt'));
    if (!homeTeamId || homeTeamId === awayTeamId) throw new AppError('VALIDATION_ERROR', 'Choose two different teams.');
    if (Number.isNaN(startsAt.getTime())) throw new AppError('VALIDATION_ERROR', 'Match date is required.');
    const participants = await db.select({ id: teams.id }).from(teams).where(and(eq(teams.tournamentId, tournamentId), eq(teams.stageId, stageId), inArray(teams.id, [homeTeamId, awayTeamId])));
    if (participants.length !== 2) throw new AppError('VALIDATION_ERROR', 'Both teams must belong to the selected group.');
    const created = await scheduleService.create({ tournamentId, ageGroupId: stage.group.id, stageId, homeTeamId, awayTeamId, pitchId: read(form, 'pitchId') || undefined, startsAt, scheduledDurationMinutes: parseClockMinutes(read(form, 'duration'), 60), bufferMinutes: parseClockMinutes(read(form, 'buffer'), 10) }, actor.id);
    const status = read(form, 'status');
    if (status === 'LIVE') await matchService.setLive(created.id, actor.id, 0);
    else if (status === 'POSTPONED' || status === 'CANCELLED') await db.update(matches).set({ status, updatedAt: new Date() }).where(eq(matches.id, created.id));
    refresh(`/tournaments/${tournamentId}`, '/dashboard');
  } catch (error) {
    return failure(error);
  }
  redirect(`/tournaments/${tournamentId}?tab=matches`);
}

export async function overrideTournamentStandingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const tournamentId = read(form, 'tournamentId');
  const stageId = read(form, 'stageId');
  try {
    const actor = await requirePermission('match.score');
    const position = Number(read(form, 'position'));
    if (!Number.isInteger(position) || position < 1) {
      throw new AppError('VALIDATION_ERROR', 'Position must be a whole number starting at 1.');
    }
    await standingsService.override(stageId, read(form, 'teamId'), position, read(form, 'reason'), actor.id);
    refresh(`/tournaments/${tournamentId}`);
  } catch (error) {
    return failure(error);
  }
  redirect(`/tournaments/${tournamentId}?tab=groups&stage=${stageId}`);
}
