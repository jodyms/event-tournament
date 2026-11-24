import { createHash, randomBytes } from 'node:crypto';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, ilike, inArray, or } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => {
  class Redirected extends Error {
    constructor(public url: string) { super(`REDIRECT ${url}`); }
  }
  return { token: '', Redirected };
});

vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new harness.Redirected(url); } }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'tyc_admin_session' && harness.token ? { value: harness.token } : undefined),
    set: () => {},
    delete: () => {},
  }),
}));

import { addPlayerAction, assignStageTeamAction, createFigmaTeamAction, createTournamentMatchAction, deleteDraftTournamentAction, deleteTeamAction, overrideStandingAction, removeStageTeamAction, reviewTeamSetupAction, saveCertificateTemplateAction, saveHighlightAction, saveMatchScoreAction, saveNewsPageAction, savePitchModalAction, saveTeamSetupAction, saveTournamentCategoriesAction, saveTournamentCertificateAction, saveTournamentDetailsAction, saveTournamentPitchesAction, saveTournamentRulesAction, saveTournamentStagesAction, sendNotificationAction, transferPlayerAction } from '@/app/figma-actions';
import { pool, db } from '@/db/client';
import { adminSessions, ageGroups, certificateTemplates, certificates, coachNameSubmissions, jerseySubmissions, matchEvents, matches, media, news, notifications, pitches, playerSubmissions, playerTeamHistory, players, roles, stages, standings, teams, tournamentCertificates, tournamentRules, tournaments, userRoles, users, venues } from '@/db/schema';

type Action = (state: { error?: string }, form: FormData) => Promise<{ error?: string }>;

const started = Date.now();
const prefix = `Flow Check ${started.toString(36)}`;
let tokenHash = '';
let adminId = '';

function png(name: string) {
  return new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], name, { type: 'image/png' });
}
function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}
async function submit(action: Action, data: FormData) {
  try {
    const state = await action({}, data);
    return { state, redirected: undefined as string | undefined };
  } catch (error) {
    if (error instanceof harness.Redirected) return { state: undefined, redirected: error.url };
    throw error;
  }
}
async function ok(label: string, action: Action, data: FormData) {
  const result = await submit(action, data);
  expect(result.state?.error, label).toBeUndefined();
  expect(result.redirected, label).toEqual(expect.any(String));
  return result.redirected ?? '';
}
function idFrom(url: string) {
  const match = url.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (!match) throw new Error(`No id in ${url}`);
  return match[0];
}
async function wipeTournament(id: string) {
  const clubIds = (await db.select({ id: teams.id }).from(teams).where(eq(teams.tournamentId, id))).map((row) => row.id);
  await db.delete(certificates).where(eq(certificates.tournamentId, id));
  await db.delete(media).where(eq(media.tournamentId, id));
  await db.delete(matches).where(eq(matches.tournamentId, id));
  await db.update(news).set({ tournamentId: null }).where(eq(news.tournamentId, id));
  if (clubIds.length) {
    await db.delete(playerTeamHistory).where(or(inArray(playerTeamHistory.toTeamId, clubIds), inArray(playerTeamHistory.fromTeamId, clubIds)));
    const squadIds = (await db.select({ id: players.id }).from(players).where(inArray(players.teamId, clubIds))).map((row) => row.id);
    if (squadIds.length) {
      await db.update(media).set({ highlightPlayerId: null }).where(inArray(media.highlightPlayerId, squadIds));
      await db.delete(matchEvents).where(inArray(matchEvents.playerId, squadIds));
    }
    await db.delete(matchEvents).where(inArray(matchEvents.teamId, clubIds));
    await db.delete(players).where(inArray(players.teamId, clubIds));
  }
  await db.delete(tournaments).where(eq(tournaments.id, id));
}
async function wipeFlow() {
  const named = await db.select({ id: tournaments.id }).from(tournaments).where(ilike(tournaments.name, 'Flow Check %'));
  for (const row of named) await wipeTournament(row.id);
  await db.delete(news).where(ilike(news.title, 'Flow Check %'));
  await db.delete(notifications).where(ilike(notifications.title, 'Flow Check %'));
  await db.delete(certificateTemplates).where(ilike(certificateTemplates.name, 'Flow Check %'));
}
async function removeUploads() {
  const directory = path.join(process.cwd(), 'storage', 'uploads');
  const names = await readdir(directory).catch(() => []);
  await Promise.all(names.filter((name) => {
    const stamp = Number(name.split('-')[0]);
    return Number.isFinite(stamp) && stamp >= started;
  }).map((name) => unlink(path.join(directory, name)).catch(() => undefined)));
}

describe('figma admin actions', () => {
  beforeAll(async () => {
    await wipeFlow();
    const [admin] = await db.select({ id: users.id }).from(users).innerJoin(userRoles, eq(userRoles.userId, users.id)).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(roles.code, 'SUPER_ADMIN'), eq(users.status, 'ACTIVE'))).limit(1);
    if (!admin) throw new Error('Seed a SUPER_ADMIN before running this test.');
    adminId = admin.id;
    const raw = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(raw).digest('hex');
    await db.insert(adminSessions).values({ userId: admin.id, tokenHash, lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    harness.token = raw;
  });

  afterAll(async () => {
    harness.token = '';
    try {
      await wipeFlow();
    } finally {
      if (tokenHash) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
      await removeUploads();
      await pool.end();
    }
  });

  it('writes tournament, team, match, content, and notification rows', async () => {
    const savedToken = harness.token;
    harness.token = '';
    const signedOut = await submit(saveTournamentDetailsAction, form({ name: prefix, startsAt: '2026-11-01', endsAt: '2026-11-10' }));
    expect(signedOut.state?.error).toMatch(/sign in/i);
    harness.token = savedToken;

    const createdUrl = await ok('create tournament', saveTournamentDetailsAction, form({ name: prefix, startsAt: '2026-11-01', endsAt: '2026-11-10', description: 'First copy', banner: png('banner.png') }));
    const tournamentId = idFrom(createdUrl);
    expect(createdUrl).toContain(`/tournaments/${tournamentId}/setup?step=categories`);
    await ok('update tournament', saveTournamentDetailsAction, form({ id: tournamentId, name: prefix, startsAt: '2026-11-01', endsAt: '2026-11-10', description: 'Updated copy', status: 'DRAFT' }));
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    expect(tournament).toMatchObject({ status: 'DRAFT', description: 'Updated copy' });
    expect(tournament.bannerUrl).toMatch(/^\/api\/uploads\//);

    await ok('categories', saveTournamentCategoriesAction, form({ tournamentId, categoryName: `${prefix} U12`, sortOrder: '1' }));
    const [group] = await db.select().from(ageGroups).where(eq(ageGroups.tournamentId, tournamentId)).limit(1);
    await ok('rename category', saveTournamentCategoriesAction, form({ tournamentId, ageGroupId: group.id, categoryName: `${prefix} U13`, sortOrder: '1' }));
    const duplicateCategory = await submit(saveTournamentCategoriesAction, form({ tournamentId, categoryName: `${prefix} U13`, sortOrder: '2' }));
    expect(duplicateCategory.state?.error).toMatch(/age category/i);
    const groups = await db.select().from(ageGroups).where(eq(ageGroups.tournamentId, tournamentId));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: `${prefix} U13` });

    const stayed = await ok('stages', saveTournamentStagesAction, form({ tournamentId, intent: 'stay', stageName: `${prefix} Group`, ageGroupId: group.id, stageType: 'GROUP' }));
    expect(stayed).toContain('step=stages');
    const [stage] = await db.select().from(stages).where(eq(stages.ageGroupId, group.id)).limit(1);
    expect(stage.type).toBe('GROUP');

    const otherUrl = await ok('other tournament', saveTournamentDetailsAction, form({ name: `${prefix} Other`, startsAt: '2026-11-01', endsAt: '2026-11-10' }));
    const otherId = idFrom(otherUrl);
    await ok('other category', saveTournamentCategoriesAction, form({ tournamentId: otherId, categoryName: `${prefix} Other U13`, sortOrder: '1' }));
    const [otherGroup] = await db.select().from(ageGroups).where(eq(ageGroups.tournamentId, otherId)).limit(1);
    await ok('other stage', saveTournamentStagesAction, form({ tournamentId: otherId, intent: 'stay', stageName: `${prefix} Other Group`, ageGroupId: otherGroup.id, stageType: 'GROUP' }));
    const [otherStage] = await db.select().from(stages).where(eq(stages.ageGroupId, otherGroup.id)).limit(1);
    const stolen = await submit(saveTournamentStagesAction, form({ tournamentId, intent: 'stay', stageId: otherStage.id, stageName: 'Stolen', ageGroupId: group.id, stageType: 'KNOCKOUT' }));
    expect(stolen.state?.error).toMatch(/stage was not found/i);
    const [untouched] = await db.select().from(stages).where(eq(stages.id, otherStage.id)).limit(1);
    expect(untouched).toMatchObject({ name: `${prefix} Other Group`, ageGroupId: otherGroup.id, type: 'GROUP' });

    const homeName = `${prefix} Home`;
    const awayName = `${prefix} Away`;
    await ok('home team', assignStageTeamAction, form({ tournamentId, stageId: stage.id, teamName: homeName }));
    await ok('away team', assignStageTeamAction, form({ tournamentId, stageId: stage.id, teamName: awayName }));
    const duplicateTeam = await submit(assignStageTeamAction, form({ tournamentId, stageId: stage.id, teamName: homeName }));
    expect(duplicateTeam.state?.error).toMatch(/already exists/i);
    const clubRows = await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
    expect(clubRows).toHaveLength(2);
    await ok('team on draft without stage', createFigmaTeamAction, form({ ageGroupId: group.id, name: `${prefix} Draft Club` }));
    const [draftClub] = await db.select().from(teams).where(eq(teams.name, `${prefix} Draft Club`)).limit(1);
    expect(draftClub).toMatchObject({ tournamentId, ageGroupId: group.id, stageId: null });
    const mismatched = await submit(createFigmaTeamAction, form({ ageGroupId: group.id, stageId: otherStage.id, name: `${prefix} Mismatch` }));
    expect(mismatched.state?.error).toMatch(/age category/i);
    const home = clubRows.find((team) => team.name === homeName);
    const away = clubRows.find((team) => team.name === awayName);
    if (!home || !away) throw new Error('Teams were not created.');
    expect(home.stageId).toBe(stage.id);

    const pitched = await ok('pitches', saveTournamentPitchesAction, form({ tournamentId, venueName: `${prefix} Pitch`, capacity: '500', address: 'Field 1', mapUrl: 'https://example.com/map' }));
    expect(pitched).toContain('step=rules');
    const [venue] = await db.select().from(venues).where(eq(venues.tournamentId, tournamentId)).limit(1);
    const [pitch] = await db.select().from(pitches).where(eq(pitches.venueId, venue.id)).limit(1);
    expect(pitch.name).toBe(`${prefix} Pitch`);
    expect(venue.capacity).toBe(500);

    await ok('rules', saveTournamentRulesAction, form({ tournamentId, body: '<p onclick="alert(1)">Kick off</p><script>bad()</script>' }));
    const [rule] = await db.select().from(tournamentRules).where(eq(tournamentRules.tournamentId, tournamentId)).limit(1);
    expect(rule).toMatchObject({ body: '<p>Kick off</p>', status: 'DRAFT' });

    await ok('setup', saveTeamSetupAction, form({ teamId: home.id, homeJersey: '#0047AB', awayJersey: '#FFFFFF', maxSquadSize: '18', coach1: 'Ada Coach', coach2: 'Bea Coach' }));
    await ok('setup again', saveTeamSetupAction, form({ teamId: home.id, homeJersey: '#0047AB', awayJersey: '#FFFFFF', maxSquadSize: '18', coach1: 'Ada Coach', coach2: 'Bea Coach' }));
    const [updatedGroup] = await db.select().from(ageGroups).where(eq(ageGroups.id, group.id)).limit(1);
    expect(updatedGroup.maxSquadSize).toBe(18);
    const [updatedHome] = await db.select().from(teams).where(eq(teams.id, home.id)).limit(1);
    expect(updatedHome.homeJersey).toEqual({ color: '#0047AB' });
    const approvedCoaches = await db.select().from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, home.id), eq(coachNameSubmissions.status, 'APPROVED')));
    expect(approvedCoaches.map((row) => row.coachName).sort()).toEqual(['Ada Coach', 'Bea Coach']);

    await ok('add player', addPlayerAction, form({ teamId: home.id, name: 'Raka', jerseyNumber: '10', position: 'Forward', back: '/players', photo: png('player.png') }));
    const duplicateJersey = await submit(addPlayerAction, form({ teamId: home.id, name: 'Other', jerseyNumber: '10', back: '/players' }));
    expect(duplicateJersey.state?.error).toMatch(/jersey/i);
    const [player] = await db.select().from(players).where(eq(players.teamId, home.id)).limit(1);
    expect(player).toMatchObject({ name: 'Raka', jerseyNumber: 10, approvalStatus: 'APPROVED', position: 'Forward' });
    expect(player.photoUrl).toMatch(/^\/api\/uploads\//);
    const squad = await db.select().from(players).where(eq(players.teamId, home.id));
    expect(squad).toHaveLength(1);

    const matched = await ok('create match', createTournamentMatchAction, form({ tournamentId, stageId: stage.id, homeTeamId: home.id, awayTeamId: away.id, pitchId: pitch.id, startsAt: '2026-12-01T10:00', duration: '60', buffer: '10' }));
    expect(matched).toContain('tab=matches');
    const [match] = await db.select().from(matches).where(eq(matches.tournamentId, tournamentId)).limit(1);
    expect(match).toMatchObject({ status: 'SCHEDULED', homeTeamId: home.id, awayTeamId: away.id, pitchId: pitch.id, scheduledDurationMinutes: 60 });

    await ok('live score', saveMatchScoreAction, form({ tournamentId, matchId: match.id, goalTeamId: home.id, goalPlayerId: player.id, goalMinute: '12' }));
    const [live] = await db.select().from(matches).where(eq(matches.id, match.id)).limit(1);
    expect(live).toMatchObject({ status: 'LIVE', homeScore: 1, awayScore: 0 });
    await ok('finish score', saveMatchScoreAction, form({ tournamentId, matchId: match.id, goalTeamId: home.id, goalPlayerId: player.id, goalMinute: '12', finished: 'on' }));
    const [finished] = await db.select().from(matches).where(eq(matches.id, match.id)).limit(1);
    expect(finished.status).toBe('FINISHED');
    const events = await db.select().from(matchEvents).where(eq(matchEvents.matchId, match.id));
    expect(events).toMatchObject([{ eventType: 'GOAL', teamId: home.id, playerId: player.id, minute: 12 }]);
    const table = await db.select().from(standings).where(eq(standings.stageId, stage.id));
    expect(table.find((row) => row.teamId === home.id)).toMatchObject({ points: 3, wins: 1, played: 1, goalsFor: 1, position: 1 });

    await ok('override', overrideStandingAction, form({ tournamentId, stageId: stage.id, teamId: away.id, position: '1', reason: 'Tie break correction' }));
    const [overridden] = await db.select().from(standings).where(and(eq(standings.stageId, stage.id), eq(standings.teamId, away.id))).limit(1);
    expect(overridden).toMatchObject({ position: 1, manualRankReason: 'Tie break correction' });

    await ok('highlight', saveHighlightAction, form({ tournamentId, title: `${prefix} Highlight`, matchId: match.id, playerId: player.id, url: 'https://example.com/highlight' }));
    const [clip] = await db.select().from(media).where(eq(media.tournamentId, tournamentId)).limit(1);
    expect(clip).toMatchObject({ type: 'HIGHLIGHT', status: 'PUBLISHED', title: `${prefix} Highlight`, highlightPlayerId: player.id, externalUrl: 'https://example.com/highlight' });

    const templateUrl = await ok('template', saveCertificateTemplateAction, form({ name: `${prefix} Template`, description: 'Champion layout', logo: png('logo.png') }));
    expect(templateUrl).toBe('/certificate-templates');
    const [template] = await db.select().from(certificateTemplates).where(eq(certificateTemplates.name, `${prefix} Template`)).limit(1);
    expect(template.logoPath).toMatch(/^\/api\/uploads\//);
    await ok('certificate', saveTournamentCertificateAction, form({ tournamentId, templateId: template.id, title: `${prefix} Champion`, kind: 'CHAMPION', teamId: home.id, active: 'on' }));
    const [certificate] = await db.select().from(tournamentCertificates).where(eq(tournamentCertificates.tournamentId, tournamentId)).limit(1);
    expect(certificate).toMatchObject({ kind: 'CHAMPION', teamId: home.id, active: true, templateId: template.id });

    const draftNews = await ok('news draft', saveNewsPageAction, form({ title: `${prefix} News`, category: 'Match', tournamentId, body: '<p onclick="x">Story</p><script>bad()</script>', intent: 'draft' }));
    const newsId = idFrom(draftNews);
    const [draft] = await db.select().from(news).where(eq(news.id, newsId)).limit(1);
    expect(draft).toMatchObject({ status: 'DRAFT', body: '<p>Story</p>', tournamentId });
    await ok('publish news', saveNewsPageAction, form({ id: newsId, title: `${prefix} News`, category: 'Match', tournamentId, body: '<p>Story</p>', intent: 'publish', publishDate: '2026-12-02' }));
    const [published] = await db.select().from(news).where(eq(news.id, newsId)).limit(1);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeTruthy();
    const missingNews = await submit(saveNewsPageAction, form({ id: '00000000-0000-4000-8000-000000000099', title: `${prefix} Missing`, category: 'Match', body: 'No row' }));
    expect(missingNews.state?.error).toMatch(/news was not found/i);

    await ok('notify all', sendNotificationAction, form({ title: `${prefix} All`, body: 'Kickoff moved' }));
    await ok('notify team', sendNotificationAction, form({ title: `${prefix} Club`, body: 'Bring white shirts', teamId: home.id }));
    const [allTeams] = await db.select().from(notifications).where(eq(notifications.title, `${prefix} All`)).limit(1);
    const [oneTeam] = await db.select().from(notifications).where(eq(notifications.title, `${prefix} Club`)).limit(1);
    expect(allTeams).toMatchObject({ teamId: null, body: 'Kickoff moved' });
    expect(oneTeam).toMatchObject({ teamId: home.id, body: 'Bring white shirts' });

    await ok('pitch modal', savePitchModalAction, form({ tournamentId, name: `${prefix} Extra Pitch`, address: 'Field 2', capacity: '300' }));
    const venueRows = await db.select().from(venues).where(eq(venues.tournamentId, tournamentId));
    expect(venueRows).toHaveLength(2);

    const nothingPending = await submit(reviewTeamSetupAction, form({ teamId: away.id, decision: 'APPROVED', panel: 'setup' }));
    expect(nothingPending.state?.error).toMatch(/pending/i);
    await db.insert(coachNameSubmissions).values({ teamId: away.id, submittedBy: adminId, coachName: 'Reject Me', status: 'PENDING' });
    await ok('reject setup', reviewTeamSetupAction, form({ teamId: away.id, decision: 'REJECTED', reason: 'Name unclear', panel: 'setup' }));
    const [rejected] = await db.select().from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, away.id), eq(coachNameSubmissions.coachName, 'Reject Me'))).limit(1);
    expect(rejected).toMatchObject({ status: 'REJECTED', rejectionReason: 'Name unclear' });
    await db.insert(coachNameSubmissions).values({ teamId: away.id, submittedBy: adminId, coachName: 'Cara Coach', status: 'PENDING' });
    await db.insert(jerseySubmissions).values({ teamId: away.id, submittedBy: adminId, homeJersey: { color: '#111111' }, awayJersey: { color: '#EEEEEE' }, status: 'PENDING' });
    await db.insert(playerSubmissions).values({ teamId: away.id, submittedBy: adminId, payload: { name: 'Review Player', jerseyNumber: 7 }, status: 'PENDING' });
    await ok('approve setup', reviewTeamSetupAction, form({ teamId: away.id, decision: 'APPROVED', panel: 'players' }));
    const [approvedCoach] = await db.select().from(coachNameSubmissions).where(and(eq(coachNameSubmissions.teamId, away.id), eq(coachNameSubmissions.coachName, 'Cara Coach'))).limit(1);
    const [approvedJersey] = await db.select().from(jerseySubmissions).where(eq(jerseySubmissions.teamId, away.id)).limit(1);
    const [reviewedPlayer] = await db.select().from(players).where(and(eq(players.teamId, away.id), eq(players.name, 'Review Player'))).limit(1);
    const [reviewedTeam] = await db.select().from(teams).where(eq(teams.id, away.id)).limit(1);
    expect(approvedCoach.status).toBe('APPROVED');
    expect(approvedJersey.status).toBe('APPROVED');
    expect(reviewedPlayer).toMatchObject({ jerseyNumber: 7, approvalStatus: 'APPROVED' });
    expect(reviewedTeam.homeJersey).toEqual({ color: '#111111' });

    const blockedJersey = await submit(transferPlayerAction, form({ playerId: player.id, teamId: away.id, jerseyNumber: '7', back: '/players' }));
    expect(blockedJersey.state?.error).toMatch(/jersey/i);
    const [stillHome] = await db.select().from(players).where(eq(players.id, player.id)).limit(1);
    expect(stillHome.teamId).toBe(home.id);
    await ok('transfer', transferPlayerAction, form({ playerId: player.id, teamId: away.id, jerseyNumber: '12', back: '/players' }));
    const [moved] = await db.select().from(players).where(eq(players.id, player.id)).limit(1);
    expect(moved).toMatchObject({ teamId: away.id, jerseyNumber: 12 });
    const history = await db.select().from(playerTeamHistory).where(eq(playerTeamHistory.playerId, player.id));
    expect(history.some((row) => row.note === 'Added by admin' && row.toTeamId === home.id)).toBe(true);
    expect(history.some((row) => row.note === 'Transferred by admin' && row.toTeamId === away.id && row.fromTeamId === home.id)).toBe(true);

    await ok('spare team', createFigmaTeamAction, form({ stageId: stage.id, name: `${prefix} Spare`, logo: png('crest.png') }));
    const [spare] = await db.select().from(teams).where(and(eq(teams.tournamentId, tournamentId), eq(teams.name, `${prefix} Spare`))).limit(1);
    expect(spare.crestUrl).toMatch(/^\/api\/uploads\//);
    expect(spare.stageId).toBe(stage.id);
    await ok('remove spare', removeStageTeamAction, form({ tournamentId, teamId: spare.id }));
    const [unassigned] = await db.select().from(teams).where(eq(teams.id, spare.id)).limit(1);
    expect(unassigned.stageId).toBeNull();
    const blockedDelete = await submit(deleteTeamAction, form({ teamId: home.id }));
    expect(blockedDelete.state?.error).toMatch(/match/i);
    const [homeRemains] = await db.select().from(teams).where(eq(teams.id, home.id)).limit(1);
    expect(homeRemains).toBeTruthy();
    await ok('delete spare', deleteTeamAction, form({ teamId: spare.id }));
    const [spareGone] = await db.select().from(teams).where(eq(teams.id, spare.id)).limit(1);
    expect(spareGone).toBeUndefined();

    await ok('discard other', deleteDraftTournamentAction, form({ id: otherId }));
    await ok('discard draft', deleteDraftTournamentAction, form({ id: tournamentId }));
    const [gone] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    const [otherGone] = await db.select().from(tournaments).where(eq(tournaments.id, otherId)).limit(1);
    const [keptNews] = await db.select().from(news).where(eq(news.id, newsId)).limit(1);
    expect(gone).toBeUndefined();
    expect(otherGone).toBeUndefined();
    expect(keptNews.tournamentId).toBeNull();
    expect(keptNews.status).toBe('PUBLISHED');
  });
});
