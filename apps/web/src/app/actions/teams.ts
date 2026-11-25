'use server';

import { and, eq, inArray, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { ageGroups, certificates, coachNameSubmissions, jerseySubmissions, matchEvents, matches, media, playerSubmissions, playerTeamHistory, players, standings, teams, tournamentCertificates } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { teamSchema } from '@/lib/api/validation';
import { requirePermission } from '@/lib/auth/session';
import { submissionService, teamService } from '@/lib/domain/services';
import { saveUpload, uploadFile } from '@/lib/infra/uploads';
import { audit, failure, read, refresh, requireConfirmed, teamPlacement, uuidPattern, type ActionState } from './shared';

export async function createTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('team.write');
    await teamService.create(teamSchema.parse({ tournamentId: read(form, 'tournamentId'), ageGroupId: read(form, 'ageGroupId'), stageId: read(form, 'stageId') || undefined, name: read(form, 'name') }), actor.id);
    refresh('/teams', '/dashboard');
    return { message: 'Team created.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createAdminTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requirePermission('team.write');
    const name = read(form, 'name');
    if (name.length < 2) throw new AppError('VALIDATION_ERROR', 'Team name is required.');
    const placement = await teamPlacement(read(form, 'stageId'), read(form, 'ageGroupId'));
    const logo = uploadFile(form, 'logo');
    const logoUrl = logo ? await saveUpload(logo) : null;
    const team = await teamService.create({ tournamentId: placement.tournamentId, ageGroupId: placement.ageGroupId, ...(placement.stageId ? { stageId: placement.stageId } : {}), name }, actor.id);
    if (logoUrl) await db.update(teams).set({ crestUrl: logoUrl }).where(eq(teams.id, team.id));
    refresh('/teams', '/dashboard', `/tournaments/${placement.tournamentId}`);
  } catch (error) {
    return failure(error);
  }
  redirect('/teams');
}

export async function updateAdminTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  try {
    const actor = await requirePermission('team.write');
    if (!uuidPattern.test(teamId)) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
    const [current] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!current) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
    const name = read(form, 'name');
    if (name.length < 2) throw new AppError('VALIDATION_ERROR', 'Team name is required.');
    const placement = await teamPlacement(read(form, 'stageId'), read(form, 'ageGroupId'));
    const nextStageId = placement.stageId ?? null;
    const structureChanged = placement.tournamentId !== current.tournamentId || placement.ageGroupId !== current.ageGroupId || nextStageId !== current.stageId;
    if (structureChanged) {
      const [used] = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))).limit(1);
      if (used) throw new AppError('TEAM_IN_USE', 'This team is on a match. You can change its name and logo, but not its tournament, age category, or group.');
    }
    if (placement.tournamentId !== current.tournamentId) {
      const [certificate] = await db.select({ id: tournamentCertificates.id }).from(tournamentCertificates).where(eq(tournamentCertificates.teamId, teamId)).limit(1);
      const [issued] = await db.select({ id: certificates.id }).from(certificates).where(eq(certificates.teamId, teamId)).limit(1);
      if (certificate || issued) throw new AppError('TEAM_IN_USE', 'This team has a certificate. Its tournament stays the same. Name, age category, group, and logo can still change.');
    }
    const logo = uploadFile(form, 'logo');
    const uploaded = logo ? await saveUpload(logo) : null;
    await db.update(teams).set({ name, tournamentId: placement.tournamentId, ageGroupId: placement.ageGroupId, stageId: nextStageId, crestUrl: uploaded ?? current.crestUrl, updatedAt: new Date() }).where(eq(teams.id, teamId));
    if (nextStageId !== current.stageId) await db.delete(standings).where(eq(standings.teamId, teamId));
    await audit(actor.id, 'team.update', 'team', teamId, { name, tournamentId: placement.tournamentId, ageGroupId: placement.ageGroupId, stageId: nextStageId });
    refresh('/teams', '/dashboard', `/tournaments/${current.tournamentId}`, `/tournaments/${placement.tournamentId}`);
  } catch (error) {
    return failure(error);
  }
  redirect('/teams');
}

export async function deleteTeamAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requirePermission('team.write');
    const id = read(form, 'teamId');
    const [used] = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.homeTeamId, id), eq(matches.awayTeamId, id))).limit(1);
    if (used) throw new AppError('TEAM_IN_USE', 'This team is on a match and cannot be deleted.');
    const squadIds = (await db.select({ id: players.id }).from(players).where(eq(players.teamId, id))).map((row) => row.id);
    await db.update(certificates).set({ teamId: null }).where(eq(certificates.teamId, id));
    await db.delete(playerTeamHistory).where(or(eq(playerTeamHistory.toTeamId, id), eq(playerTeamHistory.fromTeamId, id)));
    if (squadIds.length) {
      await db.update(media).set({ highlightPlayerId: null }).where(inArray(media.highlightPlayerId, squadIds));
      await db.delete(matchEvents).where(inArray(matchEvents.playerId, squadIds));
      await db.delete(players).where(eq(players.teamId, id));
    }
    await db.delete(matchEvents).where(eq(matchEvents.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
    refresh('/teams', '/dashboard');
  } catch (error) {
    return failure(error);
  }
  redirect('/teams');
}

export async function saveTeamSetupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  try {
    const actor = await requirePermission('team.write');
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
    await db.update(teams).set({ homeJersey: { color: read(form, 'homeJersey') }, awayJersey: { color: read(form, 'awayJersey') }, updatedAt: new Date() }).where(eq(teams.id, teamId));
    await db.update(ageGroups).set({ maxSquadSize: Number(read(form, 'maxSquadSize') || 20) }).where(eq(ageGroups.id, team.ageGroupId));
    const existingCoaches = await db.select({ coachName: coachNameSubmissions.coachName }).from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, teamId), eq(coachNameSubmissions.status, 'APPROVED')));
    const known = new Set(existingCoaches.map((row) => row.coachName.trim().toLowerCase()));
    for (const coachName of [read(form, 'coach1'), read(form, 'coach2')].filter(Boolean)) {
      if (known.has(coachName.toLowerCase())) continue;
      await db.insert(coachNameSubmissions).values({ teamId, submittedBy: actor.id, coachName, status: 'APPROVED', reviewedBy: actor.id, reviewedAt: new Date() });
      known.add(coachName.toLowerCase());
    }
    await audit(actor.id, 'team.manual_setup', 'team', teamId, { name: team.name });
    refresh('/teams', '/dashboard');
  } catch (error) {
    return failure(error);
  }
  redirect(`/teams?modal=team&id=${teamId}&panel=setup`);
}

export async function reviewSubmissionAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    requireConfirmed(form);
    const kind = read(form, 'kind');
    const actor = await requirePermission(kind === 'player' ? 'player.review' : 'coach.review');
    const approve = read(form, 'decision') === 'APPROVED';
    const reason = read(form, 'rejectionReason') || undefined;
    const id = read(form, 'submissionId');
    if (kind === 'coach') await submissionService.reviewCoachName(id, actor.id, approve, reason);
    else if (kind === 'jersey') await submissionService.reviewJersey(id, actor.id, approve, reason);
    else await submissionService.reviewPlayer(id, actor.id, approve, reason);
    refresh('/coaches', '/players', '/teams', '/dashboard');
    return { message: approve ? 'Submission approved.' : 'Submission rejected with its reason.' };
  } catch (error) {
    return failure(error);
  }
}

export async function reviewTeamSetupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  try {
    const actor = await requirePermission('coach.review');
    const approve = read(form, 'decision') === 'APPROVED';
    const reason = read(form, 'reason') || undefined;
    if (!approve && !reason) throw new AppError('VALIDATION_ERROR', 'A rejection reason is required.');
    const [coachRows, jerseyRows, playerRows] = await Promise.all([
      db.select().from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, teamId), eq(coachNameSubmissions.status, 'PENDING'))),
      db.select().from(jerseySubmissions).where(and(eq(jerseySubmissions.teamId, teamId), eq(jerseySubmissions.status, 'PENDING'))),
      db.select().from(playerSubmissions).where(and(eq(playerSubmissions.teamId, teamId), eq(playerSubmissions.status, 'PENDING'))),
    ]);
    if (!coachRows.length && !jerseyRows.length && !playerRows.length) {
      throw new AppError('NOTHING_PENDING', 'This team has no pending coach, jersey, or player submission.');
    }
    for (const row of coachRows) await submissionService.reviewCoachName(row.id, actor.id, approve, reason);
    for (const row of jerseyRows) await submissionService.reviewJersey(row.id, actor.id, approve, reason);
    for (const row of playerRows) await submissionService.reviewPlayer(row.id, actor.id, approve, reason);
    refresh('/teams', '/players', '/coaches', '/dashboard');
  } catch (error) {
    return failure(error);
  }
  redirect(`/teams?modal=team&id=${teamId}&panel=${read(form, 'panel') || 'setup'}`);
}

export async function addPlayerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const teamId = read(form, 'teamId');
  const back = read(form, 'back') || '/players';
  try {
    const actor = await requirePermission('team.write');
    const name = read(form, 'name');
    const jerseyNumber = Number(read(form, 'jerseyNumber'));
    if (name.length < 2 || !Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      throw new AppError('VALIDATION_ERROR', 'Player name and a jersey number from 1 to 99 are required.');
    }
    const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
    const photo = uploadFile(form, 'photo');
    const photoUrl = photo ? await saveUpload(photo) : null;
    const [player] = await db.insert(players).values({ teamId, name, position: read(form, 'position') || null, jerseyNumber, photoUrl, approvalStatus: 'APPROVED', status: 'ACTIVE' }).returning();
    await db.insert(playerTeamHistory).values({ playerId: player.id, toTeamId: teamId, changedBy: actor.id, note: 'Added by admin' });
    refresh('/players', '/teams');
  } catch (error) {
    return failure(error);
  }
  redirect(back);
}

export async function transferPlayerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const back = read(form, 'back') || '/players';
  try {
    const actor = await requirePermission('team.write');
    const playerId = read(form, 'playerId');
    const teamId = read(form, 'teamId');
    const [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!player || !team) throw new AppError('NOT_FOUND', 'Player or team was not found.', 404);
    if (player.teamId === teamId) throw new AppError('VALIDATION_ERROR', 'Choose a different team.');
    const jerseyNumber = Number(read(form, 'jerseyNumber') || player.jerseyNumber);
    if (!Number.isInteger(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
      throw new AppError('VALIDATION_ERROR', 'Jersey number must be from 1 to 99.');
    }
    await db.update(players).set({ teamId, jerseyNumber, status: 'ACTIVE', updatedAt: new Date() }).where(eq(players.id, playerId));
    await db.insert(playerTeamHistory).values({ playerId, fromTeamId: player.teamId, toTeamId: teamId, changedBy: actor.id, note: 'Transferred by admin' });
    refresh('/players', '/teams');
  } catch (error) {
    return failure(error);
  }
  redirect(back);
}
