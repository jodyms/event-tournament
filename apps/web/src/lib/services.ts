import { and, asc, desc, eq, ilike, inArray, type InferSelectModel } from 'drizzle-orm';
import { db } from '@/db/client';
import { ageGroups, auditLogs, coachNameSubmissions, jerseySubmissions, jobOutbox, matchEvents, matches, playerSubmissions, players, sports, stages, standings, teamStatistics, teams, tournaments } from '@/db/schema';
import { AppError } from './errors';
import { timeRangesOverlap } from './competition';
import { scoresFromGoals } from './tournament-status';
import type { z } from 'zod';
import type { matchSchema, playerPayloadSchema, teamSchema, tournamentSchema } from './validation';

type TournamentInput = z.infer<typeof tournamentSchema>;
type TeamInput = z.infer<typeof teamSchema>;
type MatchInput = z.infer<typeof matchSchema>;
type PlayerPayload = z.infer<typeof playerPayloadSchema>;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type MutationExecutor = Pick<Transaction, 'insert'>;
async function audit(tx: MutationExecutor, actorId: string | undefined, action: string, entityType: string, entityId: string, before?: Record<string, unknown>, after?: Record<string, unknown>, reason?: string) {
  await tx.insert(auditLogs).values({ actorId, action, entityType, entityId, before, after, reason });
}
async function outbox(tx: MutationExecutor, type: string, payload: Record<string, unknown>) { await tx.insert(jobOutbox).values({ type, payload }); }

export const tournamentService = {
  async create(input: TournamentInput, actorId: string) {
    const [row] = await db.insert((await import('@/db/schema')).tournaments).values(input).returning();
    await audit(db, actorId, 'tournament.create', 'tournament', row.id, undefined, { name: row.name });
    return row;
  },
};

export const teamService = {
  async create(input: TeamInput, actorId: string) {
    const [group] = await db.select().from(ageGroups).where(eq(ageGroups.id, input.ageGroupId)).limit(1);
    if (!group || group.tournamentId !== input.tournamentId) throw new AppError('INVALID_AGE_GROUP', 'The age group does not belong to this tournament.');
    const [team] = await db.insert(teams).values(input).returning();
    await audit(db, actorId, 'team.create', 'team', team.id, undefined, { name: team.name });
    return team;
  },
  async list(query: string | undefined, page: number, pageSize: number) {
    const where = query ? ilike(teams.name, `%${query}%`) : undefined;
    const rows = await db.select().from(teams).where(where).orderBy(asc(teams.name)).limit(pageSize).offset((page - 1) * pageSize);
    return rows;
  },
};

export const submissionService = {
  async submitPlayer(teamId: string, submittedBy: string, payload: PlayerPayload, playerId?: string) {
    const prior = playerId ? await db.select().from(players).where(eq(players.id, playerId)).limit(1) : [];
    if (prior[0] && prior[0].teamId !== teamId) throw new AppError('INVALID_PLAYER', 'Player does not belong to this team.');
    const [latest] = await db.select().from(playerSubmissions).where(and(eq(playerSubmissions.teamId, teamId), playerId ? eq(playerSubmissions.playerId, playerId) : eq(playerSubmissions.payload, payload))).orderBy(desc(playerSubmissions.revision)).limit(1);
    if (latest?.status === 'PENDING') throw new AppError('SUBMISSION_PENDING', 'This player already has a pending submission.');
    const [submission] = await db.insert(playerSubmissions).values({ teamId, submittedBy, playerId, payload, revision: (latest?.revision ?? 0) + 1 }).returning();
    await outbox(db, 'coach.player.submitted', { submissionId: submission.id, teamId });
    return submission;
  },
  async reviewPlayer(submissionId: string, reviewerId: string, approve: boolean, rejectionReason?: string) {
    return db.transaction(async (tx) => {
      const [submission] = await tx.select().from(playerSubmissions).where(eq(playerSubmissions.id, submissionId)).limit(1);
      if (!submission) throw new AppError('NOT_FOUND', 'Submission was not found.', 404);
      if (submission.status !== 'PENDING') throw new AppError('INVALID_SUBMISSION_STATE', 'Only pending submissions can be reviewed.');
      if (!approve && !rejectionReason?.trim()) throw new AppError('REJECTION_REASON_REQUIRED', 'A rejection reason is required.');
      if (!approve) {
        await tx.update(playerSubmissions).set({ status: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason }).where(eq(playerSubmissions.id, submissionId));
        await audit(tx, reviewerId, 'player_submission.reject', 'player_submission', submissionId, { status: 'PENDING' }, { status: 'REJECTED' }, rejectionReason);
        await outbox(tx, 'coach.player.rejected', { submissionId, teamId: submission.teamId, reason: rejectionReason ?? '' });
        return { status: 'REJECTED' as const };
      }
      const [team] = await tx.select().from(teams).where(eq(teams.id, submission.teamId)).limit(1);
      if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
      const [group] = await tx.select().from(ageGroups).where(eq(ageGroups.id, team.ageGroupId)).limit(1);
      const existing = await tx.select().from(players).where(and(eq(players.teamId, team.id), eq(players.approvalStatus, 'APPROVED')));
      if (!submission.playerId && existing.length >= group.maxSquadSize) throw new AppError('SQUAD_LIMIT_REACHED', 'The approved squad has reached its maximum size.');
      const duplicate = existing.find((p) => p.jerseyNumber === submission.payload.jerseyNumber && p.id !== submission.playerId);
      if (duplicate) throw new AppError('JERSEY_NUMBER_DUPLICATE', 'Jersey number is already used by this team.', 409, { jerseyNumber: 'Already used' });
      let playerId = submission.playerId;
      if (playerId) await tx.update(players).set({ ...submission.payload, approvalStatus: 'APPROVED', updatedAt: new Date() }).where(eq(players.id, playerId));
      else { const [created] = await tx.insert(players).values({ teamId: team.id, ...submission.payload, approvalStatus: 'APPROVED' }).returning(); playerId = created.id; }
      await tx.update(playerSubmissions).set({ status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date() }).where(eq(playerSubmissions.id, submissionId));
      await audit(tx, reviewerId, 'player_submission.approve', 'player_submission', submissionId, { status: 'PENDING' }, { status: 'APPROVED', playerId });
      await outbox(tx, 'coach.player.approved', { submissionId, teamId: team.id, playerId });
      return { status: 'APPROVED' as const, playerId };
    });
  },
  async reviewCoachName(submissionId: string, reviewerId: string, approve: boolean, rejectionReason?: string) {
    const [submission] = await db.select().from(coachNameSubmissions).where(eq(coachNameSubmissions.id, submissionId)).limit(1);
    if (!submission) throw new AppError('NOT_FOUND', 'Coach-name submission was not found.', 404);
    if (submission.status !== 'PENDING') throw new AppError('INVALID_SUBMISSION_STATE', 'Only pending submissions can be reviewed.');
    if (!approve && !rejectionReason?.trim()) throw new AppError('REJECTION_REASON_REQUIRED', 'A rejection reason is required.');
    const status = approve ? 'APPROVED' : 'REJECTED' as const;
    await db.transaction(async (tx) => {
      await tx.update(coachNameSubmissions).set({ status, reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason: approve ? null : rejectionReason }).where(eq(coachNameSubmissions.id, submissionId));
      await audit(tx, reviewerId, `coach_name_submission.${approve ? 'approve' : 'reject'}`, 'coach_name_submission', submissionId, { status: 'PENDING' }, { status }, rejectionReason);
      await outbox(tx, `coach.name.${approve ? 'approved' : 'rejected'}`, { submissionId, teamId: submission.teamId, reason: rejectionReason ?? '' });
    });
  },
  async reviewJersey(submissionId: string, reviewerId: string, approve: boolean, rejectionReason?: string) {
    const [submission] = await db.select().from(jerseySubmissions).where(eq(jerseySubmissions.id, submissionId)).limit(1);
    if (!submission) throw new AppError('NOT_FOUND', 'Jersey submission was not found.', 404);
    if (submission.status !== 'PENDING') throw new AppError('INVALID_SUBMISSION_STATE', 'Only pending submissions can be reviewed.');
    if (!approve && !rejectionReason?.trim()) throw new AppError('REJECTION_REASON_REQUIRED', 'A rejection reason is required.');
    const status = approve ? 'APPROVED' : 'REJECTED' as const;
    await db.transaction(async (tx) => {
      if (approve) await tx.update(teams).set({ homeJersey: submission.homeJersey, awayJersey: submission.awayJersey, updatedAt: new Date() }).where(eq(teams.id, submission.teamId));
      await tx.update(jerseySubmissions).set({ status, reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason: approve ? null : rejectionReason }).where(eq(jerseySubmissions.id, submissionId));
      await audit(tx, reviewerId, `jersey_submission.${approve ? 'approve' : 'reject'}`, 'jersey_submission', submissionId, { status: 'PENDING' }, { status }, rejectionReason);
      await outbox(tx, `coach.jersey.${approve ? 'approved' : 'rejected'}`, { submissionId, teamId: submission.teamId, reason: rejectionReason ?? '' });
    });
  },
};

export const scheduleService = {
  async assertNoConflict(input: MatchInput, ignoreId?: string) {
    const candidates = await db.select().from(matches).where(inArray(matches.status, ['SCHEDULED', 'LIVE']));
    const end = new Date(input.startsAt.getTime() + (input.scheduledDurationMinutes + input.bufferMinutes) * 60_000);
    const conflict = candidates.find((m) => {
      if (m.id === ignoreId) return false;
      const matchEnd = new Date(m.startsAt.getTime() + (m.scheduledDurationMinutes + m.bufferMinutes) * 60_000);
      const sharesResource = (input.pitchId && input.pitchId === m.pitchId) || [m.homeTeamId, m.awayTeamId].includes(input.homeTeamId) || [m.homeTeamId, m.awayTeamId].includes(input.awayTeamId);
      return sharesResource && timeRangesOverlap(input.startsAt, end, m.startsAt, matchEnd);
    });
    if (conflict) throw new AppError('SCHEDULE_CONFLICT', 'The pitch or one of the teams is already scheduled during this period.', 409, { startsAt: `Conflicts with match ${conflict.id}` });
  },
  async create(input: MatchInput, actorId: string) { await this.assertNoConflict(input); const [match] = await db.insert(matches).values(input).returning(); await audit(db, actorId, 'match.schedule', 'match', match.id, undefined, { startsAt: match.startsAt.toISOString() }); return match; },
  async roundRobin(stageId: string, actorId: string, startsAt: Date, pitchId?: string, duration = 60, buffer = 10) {
    const stageTeams = await db.select().from(teams).where(eq(teams.stageId, stageId)).orderBy(asc(teams.name));
    const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    if (!stage || stageTeams.length < 2) throw new AppError('INSUFFICIENT_TEAMS', 'At least two teams are required to generate a round-robin schedule.');
    const [group] = await db.select().from(ageGroups).where(eq(ageGroups.id, stage.ageGroupId)).limit(1);
    const [tournament] = await db.select({ sportCode: sports.code }).from(tournaments).innerJoin(sports, eq(tournaments.sportId, sports.id)).where(eq(tournaments.id, group.tournamentId)).limit(1);
    if (tournament?.sportCode !== 'FOOTBALL') throw new AppError('UNSUPPORTED_SPORT_ENGINE', 'Round-robin generation is available only for Football tournaments.', 422);
    const created = [];
    let next = startsAt;
    for (let i = 0; i < stageTeams.length; i++) for (let j = i + 1; j < stageTeams.length; j++) {
      const match = await this.create({ tournamentId: group.tournamentId, ageGroupId: group.id, stageId, homeTeamId: stageTeams[i].id, awayTeamId: stageTeams[j].id, pitchId, startsAt: next, scheduledDurationMinutes: duration, bufferMinutes: buffer }, actorId);
      created.push(match); next = new Date(next.getTime() + (duration + buffer) * 60_000);
    }
    return created;
  },
};

export const standingsService = {
  async override(stageId: string, teamId: string, position: number, reason: string, actorId: string) {
    if (!reason.trim()) throw new AppError('OVERRIDE_REASON_REQUIRED', 'A reason is required for a manual standing override.');
    const [row] = await db.update(standings).set({ manualRankOverride: position, manualRankReason: reason, position, calculatedAt: new Date() }).where(and(eq(standings.stageId, stageId), eq(standings.teamId, teamId))).returning();
    if (!row) throw new AppError('NOT_FOUND', 'Standing row was not found.', 404);
    await audit(db, actorId, 'standing.manual_override', 'standing', row.id, { position: row.position }, { position, reason }, reason);
    return row;
  },
};

export const matchService = {
  async setLive(matchId: string, actorId: string, minute: number) { const [match] = await db.update(matches).set({ status: 'LIVE', matchMinute: minute, updatedAt: new Date() }).where(eq(matches.id, matchId)).returning(); if (!match) throw new AppError('NOT_FOUND', 'Match was not found.', 404); await audit(db, actorId, 'match.live', 'match', matchId, undefined, { minute }); return match; },
  async finalize(matchId: string, actorId: string, score: { homeScore: number; awayScore: number; events: { eventType: 'GOAL'; teamId: string; playerId?: string; minute: number }[] }, correction = false) {
    return db.transaction(async (tx) => {
      const [match] = await tx.select().from(matches).where(eq(matches.id, matchId)).limit(1);
      if (!match) throw new AppError('NOT_FOUND', 'Match was not found.', 404);
      if (match.status === 'FINISHED' && !correction) throw new AppError('MATCH_ALREADY_FINISHED', 'Finished matches can only be corrected by a Super Admin.', 409);
      if (score.events.some((event) => ![match.homeTeamId, match.awayTeamId].includes(event.teamId))) throw new AppError('INVALID_EVENT_TEAM', 'An event team must participate in the match.');
      await tx.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
      if (score.events.length) await tx.insert(matchEvents).values(score.events.map((event, index) => ({ ...event, matchId, sortOrder: index, createdBy: actorId })));
      const [updated] = await tx.update(matches).set({ homeScore: score.homeScore, awayScore: score.awayScore, status: 'FINISHED', finalizedAt: new Date(), updatedAt: new Date(), version: match.version + 1 }).where(eq(matches.id, matchId)).returning();
      await recalculateCompetition(tx, match.stageId);
      await audit(tx, actorId, correction ? 'match.score_correct' : 'match.finalize', 'match', matchId, { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status }, { homeScore: score.homeScore, awayScore: score.awayScore, status: 'FINISHED' });
      await outbox(tx, correction ? 'match.score.corrected' : 'match.finished', { matchId, stageId: match.stageId });
      return updated;
    });
  },
  async recordGoals(matchId: string, actorId: string, events: { eventType: 'GOAL'; teamId: string; playerId?: string; minute: number }[]) {
    return db.transaction(async (tx) => {
      const [match] = await tx.select().from(matches).where(eq(matches.id, matchId)).limit(1);
      if (!match) throw new AppError('NOT_FOUND', 'Match was not found.', 404);
      if (match.status === 'FINISHED' || match.status === 'CANCELLED') throw new AppError('MATCH_CLOSED', 'This match no longer accepts live goals.', 409);
      if (events.some((event) => ![match.homeTeamId, match.awayTeamId].includes(event.teamId))) throw new AppError('INVALID_EVENT_TEAM', 'An event team must participate in the match.');
      await tx.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
      if (events.length) await tx.insert(matchEvents).values(events.map((event, index) => ({ ...event, matchId, sortOrder: index, createdBy: actorId })));
      const scores = scoresFromGoals(match.homeTeamId, match.awayTeamId, events);
      const [updated] = await tx.update(matches).set({ ...scores, status: match.status === 'SCHEDULED' ? 'LIVE' : match.status, matchMinute: events.at(-1)?.minute ?? match.matchMinute, updatedAt: new Date() }).where(eq(matches.id, matchId)).returning();
      await audit(tx, actorId, 'match.goals', 'match', matchId, { homeScore: match.homeScore, awayScore: match.awayScore }, scores);
      return updated;
    });
  },
};

async function recalculateCompetition(tx: Transaction, stageId: string) {
  type MatchRow = InferSelectModel<typeof matches>;
  const finished = await tx.select().from(matches).where(and(eq(matches.stageId, stageId), eq(matches.status, 'FINISHED'))) as MatchRow[];
  const ids: string[] = [...new Set(finished.flatMap((m: MatchRow) => [m.homeTeamId, m.awayTeamId]))];
  const totals = new Map(ids.map((id) => [id, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const m of finished) { const home = totals.get(m.homeTeamId)!; const away = totals.get(m.awayTeamId)!; home.played++; away.played++; home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore; away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore; if (m.homeScore > m.awayScore) { home.wins++; home.points += 3; away.losses++; } else if (m.homeScore < m.awayScore) { away.wins++; away.points += 3; home.losses++; } else { home.draws++; away.draws++; home.points++; away.points++; } }
  const ordered = [...totals.entries()].sort((a, b) => b[1].points - a[1].points || (b[1].goalsFor - b[1].goalsAgainst) - (a[1].goalsFor - a[1].goalsAgainst) || b[1].goalsFor - a[1].goalsFor);
  await tx.delete(standings).where(eq(standings.stageId, stageId));
  if (ordered.length) await tx.insert(standings).values(ordered.map(([teamId, stats], index) => ({ stageId, teamId, position: index + 1, ...stats, goalDifference: stats.goalsFor - stats.goalsAgainst, calculatedAt: new Date() })));
  const allFinished = await tx.select().from(matches).where(eq(matches.status, 'FINISHED')) as MatchRow[];
  for (const teamId of ids) { const stats = allFinished.filter((m: MatchRow) => m.homeTeamId === teamId || m.awayTeamId === teamId).reduce((acc: { totalMatches: number; matchesWon: number; matchesDrawn: number; matchesLost: number; goalsScored: number; goalsConceded: number }, m: MatchRow) => { const home = m.homeTeamId === teamId; const gf = home ? m.homeScore : m.awayScore; const ga = home ? m.awayScore : m.homeScore; acc.totalMatches++; acc.goalsScored += gf; acc.goalsConceded += ga; if (gf > ga) acc.matchesWon++; else if (gf === ga) acc.matchesDrawn++; else acc.matchesLost++; return acc; }, { totalMatches: 0, matchesWon: 0, matchesDrawn: 0, matchesLost: 0, goalsScored: 0, goalsConceded: 0 }); await tx.delete(teamStatistics).where(eq(teamStatistics.teamId, teamId)); await tx.insert(teamStatistics).values({ teamId, ...stats, updatedAt: new Date() }); }
}
