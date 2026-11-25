import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db/client';
import { ageGroups, certificates, coachNameSubmissions, favorites, jerseySubmissions, matchEvents, matches, media, news, notifications, playerSubmissions, players, pitches, stages, standings, teamStatistics, teams, tournamentRules, tournaments, venues } from '@/db/schema';
import { AppError } from '@/lib/api/errors';
import { bucketHomeMatches, rollupStatus, setupProgress, toTeamDto, type MatchDto, type MatchEventDto, type NewsDto, type PlayerDto, type StandingDto, type TeamDto } from '@/lib/api/mobile-dto';

const homeTeam = alias(teams, 'home_team');
const awayTeam = alias(teams, 'away_team');
const homeAge = alias(ageGroups, 'home_age');
const awayAge = alias(ageGroups, 'away_age');
const homeStage = alias(stages, 'home_stage');
const awayStage = alias(stages, 'away_stage');
const publicMatchStatus = ['SCHEDULED', 'LIVE', 'FINISHED'] as const;

const publishedTournament = and(eq(matches.tournamentId, tournaments.id), eq(tournaments.status, 'PUBLISHED'));

function matchSelect() {
  return {
    id: matches.id,
    status: matches.status,
    homeScore: matches.homeScore,
    awayScore: matches.awayScore,
    startsAt: matches.startsAt,
    tournamentName: tournaments.name,
    stageName: stages.name,
    pitchName: pitches.name,
    venueName: venues.name,
    homeId: homeTeam.id, homeName: homeTeam.name, homeCrest: homeTeam.crestUrl, homeHomeJersey: homeTeam.homeJersey, homeAwayJersey: homeTeam.awayJersey, homeAge: homeAge.name, homeStage: homeStage.name,
    awayId: awayTeam.id, awayName: awayTeam.name, awayCrest: awayTeam.crestUrl, awayHomeJersey: awayTeam.homeJersey, awayAwayJersey: awayTeam.awayJersey, awayAge: awayAge.name, awayStage: awayStage.name,
  };
}

type MatchRow = {
  id: string; status: MatchDto['status']; homeScore: number; awayScore: number; startsAt: Date; tournamentName: string; stageName: string; pitchName: string | null; venueName: string | null;
  homeId: string; homeName: string; homeCrest: string | null; homeHomeJersey: Record<string, string> | null; homeAwayJersey: Record<string, string> | null; homeAge: string; homeStage: string | null;
  awayId: string; awayName: string; awayCrest: string | null; awayHomeJersey: Record<string, string> | null; awayAwayJersey: Record<string, string> | null; awayAge: string; awayStage: string | null;
};

function toMatch(row: MatchRow, events?: MatchEventDto[]): MatchDto {
  const side = (prefix: 'home' | 'away'): TeamDto => toTeamDto({
    id: row[`${prefix}Id`], name: row[`${prefix}Name`], crestUrl: row[`${prefix}Crest`], ageGroupName: row[`${prefix}Age`], stageName: row[`${prefix}Stage`], homeJersey: row[`${prefix}HomeJersey`], awayJersey: row[`${prefix}AwayJersey`],
  });
  return { id: row.id, status: row.status, homeScore: row.homeScore, awayScore: row.awayScore, startsAt: row.startsAt.toISOString(), venue: row.pitchName || row.venueName || '', competitionLabel: `${row.tournamentName} · ${row.stageName}`, homeTeam: side('home'), awayTeam: side('away'), ...(events ? { events } : {}) };
}

function matchBase() {
  return db.select(matchSelect()).from(matches)
    .innerJoin(tournaments, publishedTournament)
    .innerJoin(stages, eq(matches.stageId, stages.id))
    .innerJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .innerJoin(homeAge, eq(homeTeam.ageGroupId, homeAge.id))
    .innerJoin(awayAge, eq(awayTeam.ageGroupId, awayAge.id))
    .leftJoin(homeStage, eq(homeTeam.stageId, homeStage.id))
    .leftJoin(awayStage, eq(awayTeam.stageId, awayStage.id))
    .leftJoin(pitches, eq(matches.pitchId, pitches.id))
    .leftJoin(venues, eq(pitches.venueId, venues.id));
}

const teamSelect = { id: teams.id, name: teams.name, crestUrl: teams.crestUrl, homeJersey: teams.homeJersey, awayJersey: teams.awayJersey, ageGroupName: ageGroups.name, stageName: stages.name, ageGroupId: teams.ageGroupId, maxSquadSize: ageGroups.maxSquadSize };

function teamBase() {
  return db.select(teamSelect).from(teams)
    .innerJoin(tournaments, and(eq(teams.tournamentId, tournaments.id), eq(tournaments.status, 'PUBLISHED')))
    .innerJoin(ageGroups, eq(teams.ageGroupId, ageGroups.id))
    .leftJoin(stages, eq(teams.stageId, stages.id));
}

export async function resolveTournamentId(id: string) {
  if (id !== 'current') return id;
  const [row] = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.status, 'PUBLISHED')).orderBy(desc(tournaments.startsAt)).limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'Tournament was not found.', 404);
  return row.id;
}

export async function listTournaments() {
  const rows = await db.select({ id: tournaments.id, name: tournaments.name, slug: tournaments.slug, startsAt: tournaments.startsAt, endsAt: tournaments.endsAt, status: tournaments.status }).from(tournaments).where(eq(tournaments.status, 'PUBLISHED')).orderBy(desc(tournaments.startsAt));
  return rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString() }));
}

export async function listTeams(q?: string) {
  const rows = await teamBase().where(and(eq(teams.active, true), q ? ilike(teams.name, `%${q}%`) : undefined)).orderBy(asc(teams.name));
  return rows.map((row) => toTeamDto(row));
}

export async function getTeam(id: string) {
  const [row] = await teamBase().where(eq(teams.id, id)).limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
  return toTeamDto(row);
}

export async function listAgeGroups(tournamentId: string) {
  const id = await resolveTournamentId(tournamentId);
  return db.select({ id: ageGroups.id, name: ageGroups.name, sortOrder: ageGroups.sortOrder }).from(ageGroups).innerJoin(tournaments, and(eq(ageGroups.tournamentId, tournaments.id), eq(tournaments.status, 'PUBLISHED'))).where(and(eq(ageGroups.tournamentId, id), eq(ageGroups.active, true))).orderBy(asc(ageGroups.sortOrder));
}

export async function listStages(ageGroupId: string) {
  return db.select({ id: stages.id, name: stages.name, ageGroupId: stages.ageGroupId, sortOrder: stages.sortOrder }).from(stages).innerJoin(ageGroups, eq(stages.ageGroupId, ageGroups.id)).innerJoin(tournaments, and(eq(ageGroups.tournamentId, tournaments.id), eq(tournaments.status, 'PUBLISHED'))).where(and(eq(stages.ageGroupId, ageGroupId), eq(stages.published, true))).orderBy(asc(stages.sortOrder));
}

export async function getStage(id: string) {
  const [stage] = await db.select({ id: stages.id, name: stages.name, ageGroupId: stages.ageGroupId, sortOrder: stages.sortOrder }).from(stages).where(and(eq(stages.id, id), eq(stages.published, true))).limit(1);
  if (!stage) throw new AppError('NOT_FOUND', 'Stage was not found.', 404);
  return stage;
}

export async function listMatches() {
  const rows = await matchBase().where(inArray(matches.status, [...publicMatchStatus])).orderBy(asc(matches.startsAt));
  return rows.map((row) => toMatch(row as MatchRow));
}

export async function listStageMatches(stageId: string) {
  const rows = await matchBase().where(and(eq(matches.stageId, stageId), inArray(matches.status, [...publicMatchStatus]))).orderBy(asc(matches.startsAt));
  return rows.map((row) => toMatch(row as MatchRow));
}

export async function listTeamMatches(teamId: string) {
  const rows = await matchBase().where(and(inArray(matches.status, [...publicMatchStatus]), or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))).orderBy(asc(matches.startsAt));
  return rows.map((row) => toMatch(row as MatchRow));
}

async function goalEvents(matchId: string): Promise<MatchEventDto[]> {
  const rows = await db.select({ id: matchEvents.id, teamId: matchEvents.teamId, minute: matchEvents.minute, eventType: matchEvents.eventType, playerId: players.id, playerName: players.name, jerseyNumber: players.jerseyNumber }).from(matchEvents).leftJoin(players, eq(matchEvents.playerId, players.id)).where(and(eq(matchEvents.matchId, matchId), eq(matchEvents.eventType, 'GOAL'))).orderBy(asc(matchEvents.minute), asc(matchEvents.sortOrder));
  return rows.filter((row) => row.teamId).map((row) => ({ id: row.id, teamId: row.teamId!, minute: row.minute, kind: 'GOAL' as const, player: { id: row.playerId, name: row.playerName ?? 'Pemain', jerseyNumber: row.jerseyNumber } }));
}

export async function getMatch(id: string) {
  const [row] = await matchBase().where(and(eq(matches.id, id), inArray(matches.status, [...publicMatchStatus]))).limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'Match was not found.', 404);
  return toMatch(row as MatchRow, await goalEvents(id));
}

export async function listStandings(stageId: string): Promise<StandingDto[]> {
  const rows = await db.select({ teamId: standings.teamId, teamName: teams.name, played: standings.played, goalDifference: standings.goalDifference, points: standings.points, position: standings.position, id: teams.id, name: teams.name, crestUrl: teams.crestUrl, homeJersey: teams.homeJersey, awayJersey: teams.awayJersey, ageGroupName: ageGroups.name, stageName: stages.name }).from(standings).innerJoin(teams, eq(standings.teamId, teams.id)).innerJoin(ageGroups, eq(teams.ageGroupId, ageGroups.id)).leftJoin(stages, eq(teams.stageId, stages.id)).where(eq(standings.stageId, stageId)).orderBy(asc(standings.position));
  return rows.map((row) => ({ teamId: row.teamId, teamName: row.teamName, played: row.played, goalDifference: row.goalDifference, points: row.points, position: row.position, team: toTeamDto(row) }));
}

export async function listNews() {
  const rows = await db.select().from(news).where(and(eq(news.status, 'PUBLISHED'), isNull(news.deletedAt))).orderBy(desc(news.publishedAt));
  return rows.map(toNews);
}

export async function getNews(id: string) {
  const [row] = await db.select().from(news).where(and(eq(news.id, id), eq(news.status, 'PUBLISHED'), isNull(news.deletedAt))).limit(1);
  if (!row) throw new AppError('NOT_FOUND', 'News article was not found.', 404);
  return toNews(row);
}

function toNews(row: { id: string; category: string | null; title: string; body: string; coverUrl: string | null; publishedAt: Date | null }): NewsDto {
  return { id: row.id, category: row.category ?? 'Berita', title: row.title, body: row.body, coverUrl: row.coverUrl, publishedAt: row.publishedAt?.toISOString() ?? null };
}

export async function listVenues() {
  return db.select({ id: venues.id, name: venues.name, address: venues.address, capacity: venues.capacity, mapUrl: venues.mapUrl }).from(venues).innerJoin(tournaments, and(eq(venues.tournamentId, tournaments.id), eq(tournaments.status, 'PUBLISHED'))).where(eq(venues.active, true)).orderBy(asc(venues.name));
}

export async function listRules() {
  const rows = await db.select({ id: tournamentRules.id, title: tournamentRules.title, body: tournamentRules.body, version: tournamentRules.version, publishedAt: tournamentRules.publishedAt }).from(tournamentRules).where(eq(tournamentRules.status, 'PUBLISHED')).orderBy(desc(tournamentRules.version));
  return rows.map((row) => ({ ...row, publishedAt: row.publishedAt?.toISOString() ?? null }));
}

export async function listHighlights() {
  return db.select({ id: media.id, title: media.title, path: media.path, externalUrl: media.externalUrl, matchId: media.matchId }).from(media).leftJoin(tournaments, eq(media.tournamentId, tournaments.id)).where(and(eq(media.status, 'PUBLISHED'), or(isNull(media.tournamentId), eq(tournaments.status, 'PUBLISHED')))).orderBy(desc(media.createdAt));
}

export async function listMatchHighlights(matchId: string) {
  return db.select({ id: media.id, title: media.title, path: media.path, externalUrl: media.externalUrl, matchId: media.matchId }).from(media).where(and(eq(media.matchId, matchId), eq(media.status, 'PUBLISHED'))).orderBy(desc(media.createdAt));
}

export async function listTeamPlayers(teamId: string): Promise<PlayerDto[]> {
  const rows = await db.select({ id: players.id, teamId: players.teamId, name: players.name, position: players.position, jerseyNumber: players.jerseyNumber, status: players.approvalStatus }).from(players).innerJoin(teams, eq(players.teamId, teams.id)).innerJoin(tournaments, and(eq(teams.tournamentId, tournaments.id), eq(tournaments.status, 'PUBLISHED'))).where(and(eq(players.teamId, teamId), eq(players.approvalStatus, 'APPROVED'))).orderBy(asc(players.jerseyNumber));
  return rows.map((row) => ({ ...row, position: row.position ?? '', status: row.status }));
}

export async function getTeamStats(teamId: string) {
  const [team] = await teamBase().where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
  const [stats] = await db.select().from(teamStatistics).where(eq(teamStatistics.teamId, teamId)).limit(1);
  const [squad] = await db.select({ value: count() }).from(players).where(and(eq(players.teamId, teamId), eq(players.approvalStatus, 'APPROVED')));
  return { teamId, ageGroup: team.ageGroupName, group: team.stageName ?? '', squadSize: squad?.value ?? 0, officialJerseys: { home: toTeamDto(team).homeJersey, away: toTeamDto(team).awayJersey }, tournament: { totalMatches: stats?.totalMatches ?? 0, matchesWon: stats?.matchesWon ?? 0, goalsScored: stats?.goalsScored ?? 0 } };
}

export async function getHome(userId: string | null) {
  const rows = await matchBase().where(inArray(matches.status, ['SCHEDULED', 'LIVE'])).orderBy(asc(matches.startsAt)).limit(100);
  const articles = await db.select().from(news).where(and(eq(news.status, 'PUBLISHED'), isNull(news.deletedAt))).orderBy(desc(news.publishedAt)).limit(5);
  const buckets = bucketHomeMatches(rows.map((row) => toMatch(row as MatchRow)));
  let certificateAvailable = false;
  let unreadNotifications = 0;
  if (userId) {
    const [certs, unread] = await Promise.all([
      db.select({ value: count() }).from(certificates).where(and(eq(certificates.createdBy, userId), eq(certificates.available, true))),
      db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    ]);
    certificateAvailable = (certs[0]?.value ?? 0) > 0;
    unreadNotifications = unread[0]?.value ?? 0;
  }
  return { hero: buckets.hero ?? null, matchesToday: buckets.matchesToday, upcomingMatches: buckets.upcomingMatches, news: articles.map(toNews), certificateAvailable, unreadNotifications };
}

export async function listNotifications(userId: string) {
  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  return rows.map((row) => ({ id: row.id, title: row.title, body: row.body, read: Boolean(row.readAt), teamId: row.teamId, createdAt: row.createdAt.toISOString() }));
}

export async function listFavoriteTeams(userId: string) {
  const rows = await teamBase().innerJoin(favorites, eq(favorites.teamId, teams.id)).where(eq(favorites.userId, userId)).orderBy(asc(teams.name));
  return rows.map((row) => toTeamDto(row));
}

export async function listCoachTeams(userId: string) {
  const { coachTeamAssignments } = await import('@/db/schema');
  const rows = await teamBase().innerJoin(coachTeamAssignments, eq(coachTeamAssignments.teamId, teams.id)).where(and(eq(coachTeamAssignments.coachUserId, userId), eq(coachTeamAssignments.active, true))).orderBy(asc(teams.name));
  return rows.map((row) => toTeamDto(row));
}

export async function myCertificate(userId: string) {
  const [row] = await db.select({ id: certificates.id, recipientName: certificates.recipientName, verificationCode: certificates.verificationCode, tournamentName: tournaments.name }).from(certificates).innerJoin(tournaments, eq(certificates.tournamentId, tournaments.id)).where(and(eq(certificates.createdBy, userId), eq(certificates.available, true))).orderBy(desc(certificates.createdAt)).limit(1);
  return row ?? null;
}

export async function getCoachSetup(teamId: string) {
  const [team] = await teamBase().where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new AppError('NOT_FOUND', 'Team was not found.', 404);
  const [coachRows, jerseyRows, submissionRows, approvedPlayers] = await Promise.all([
    db.select().from(coachNameSubmissions).where(eq(coachNameSubmissions.teamId, teamId)).orderBy(desc(coachNameSubmissions.createdAt)),
    db.select().from(jerseySubmissions).where(eq(jerseySubmissions.teamId, teamId)).orderBy(desc(jerseySubmissions.createdAt)),
    db.select().from(playerSubmissions).where(eq(playerSubmissions.teamId, teamId)).orderBy(desc(playerSubmissions.createdAt)),
    db.select().from(players).where(and(eq(players.teamId, teamId), eq(players.approvalStatus, 'APPROVED'))).orderBy(asc(players.jerseyNumber)),
  ]);
  const coachNames = rollupStatus(coachRows);
  const jersey = rollupStatus(jerseyRows);
  const openSubmissions = submissionRows.filter((row) => row.status === 'PENDING' || row.status === 'REJECTED');
  const playersStatus = rollupStatus(submissionRows);
  const progress = setupProgress([coachNames, jersey, playersStatus]);
  const pending = openSubmissions.filter((row) => row.status === 'PENDING').length;
  const squadPlayers: PlayerDto[] = [
    ...approvedPlayers.map((player) => ({ id: player.id, teamId, name: player.name, position: player.position ?? '', jerseyNumber: player.jerseyNumber, status: 'APPROVED' as const })),
    ...openSubmissions.map((row) => ({ id: row.id, teamId, name: row.payload.name, position: row.payload.position ?? '', jerseyNumber: row.payload.jerseyNumber, status: row.status, ...(row.rejectionReason ? { rejectionReason: row.rejectionReason } : {}) })),
  ];
  const namesFor = (status: string) => coachRows.filter((row) => row.status === status).map((row) => row.coachName);
  const draftNames = namesFor('PENDING').length ? namesFor('PENDING') : namesFor('APPROVED');
  const latestJersey = jerseyRows.find((row) => row.status === 'PENDING') ?? jerseyRows.find((row) => row.status === 'APPROVED');
  const official = toTeamDto(team);
  return {
    team: official,
    progress,
    setup: { coachNames, jersey, players: playersStatus },
    squad: { max: team.maxSquadSize, approved: approvedPlayers.length, pending, remaining: Math.max(0, team.maxSquadSize - approvedPlayers.length - pending) },
    ...(official.homeJersey || official.awayJersey ? { officialJerseys: { home: official.homeJersey, away: official.awayJersey } } : {}),
    players: squadPlayers,
    draft: { coachNames: draftNames, home: latestJersey ? (latestJersey.homeJersey.color ?? '') : official.homeJersey, away: latestJersey ? (latestJersey.awayJersey.color ?? '') : official.awayJersey },
  };
}

