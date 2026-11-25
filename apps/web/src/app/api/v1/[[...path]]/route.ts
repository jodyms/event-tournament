import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { certificates, favorites, notifications, tournaments } from '@/db/schema';
import { apiData, apiError, AppError } from '@/lib/api/errors';
import {
  getCoachSetup,
  getHome,
  getMatch,
  getNews,
  getStage,
  getTeam,
  getTeamStats,
  listAgeGroups,
  listCoachTeams,
  listFavoriteTeams,
  listHighlights,
  listMatchHighlights,
  listMatches,
  listNews,
  listNotifications,
  listRules,
  listStageMatches,
  listStages,
  listStandings,
  listTeamMatches,
  listTeamPlayers,
  listTeams,
  listTournaments,
  listVenues,
  myCertificate,
} from '@/lib/api/mobile-read';
import { coachNamesSchema, jerseyColorsSchema, loginSchema, logoutSchema, playerPayloadSchema } from '@/lib/api/validation';
import {
  issueMobileTokens,
  optionalMobileIdentity,
  requestPasswordReset,
  requireCoach,
  requireMobileIdentity,
  resetPassword,
  revokeMobileRefresh,
  rotateMobileTokens,
  verifyPasswordLogin,
} from '@/lib/auth/session';
import { submissionService } from '@/lib/domain/services';
import { createFixedCertificate } from '@/lib/infra/integrations';

type Context = { params: Promise<{ path?: string[] }> };

function parsePaging(request: Request) {
  const url = new URL(request.url);
  return {
    value: Math.max(1, Number(url.searchParams.get('page') ?? 1)),
    size: Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20))),
    q: url.searchParams.get('q')?.trim(),
  };
}

function paginate<T>(rows: T[], request: Request) {
  const paging = parsePaging(request);
  const start = (paging.value - 1) * paging.size;
  return apiData(rows.slice(start, paging.value * paging.size), {
    page: paging.value,
    pageSize: paging.size,
    count: rows.length,
  });
}

async function parseBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError('INVALID_JSON', 'Request body must be valid JSON.');
  }
}

export async function GET(request: Request, context: Context) {
  try {
    const path = (await context.params).path ?? [];
    const key = path.join('/');
    const paging = parsePaging(request);

    if (key === 'home') {
      const identity = await optionalMobileIdentity(request);
      const data = await getHome(identity?.id ?? null);
      return apiData(data, { pollIntervalSeconds: 30 });
    }
    if (key === 'tournaments') return paginate(await listTournaments(), request);
    if (key === 'teams') return paginate(await listTeams(paging.q), request);
    if (key === 'matches') return paginate(await listMatches(), request);
    if (key === 'news') return paginate(await listNews(), request);
    if (key === 'venues') return paginate(await listVenues(), request);
    if (key === 'tournament-rules') return paginate(await listRules(), request);
    if (key === 'highlights') return paginate(await listHighlights(), request);

    if (key === 'me') {
      const identity = await requireMobileIdentity(request);
      return apiData({ id: identity.id, email: identity.email, displayName: identity.displayName, roles: identity.roles });
    }
    if (key === 'me/favorite-teams') {
      const identity = await requireMobileIdentity(request);
      return paginate(await listFavoriteTeams(identity.id), request);
    }
    if (key === 'me/certificate') {
      const identity = await requireMobileIdentity(request);
      return apiData(await myCertificate(identity.id));
    }
    if (key === 'notifications') {
      const identity = await requireMobileIdentity(request);
      return paginate(await listNotifications(identity.id), request);
    }
    if (key === 'coach/teams') {
      const identity = await requireMobileIdentity(request);
      return paginate(await listCoachTeams(identity.id), request);
    }

    if (path[0] === 'tournaments' && path[2] === 'age-groups' && path[1]) return paginate(await listAgeGroups(path[1]), request);
    if (path[0] === 'age-groups' && path[2] === 'stages' && path[1]) return paginate(await listStages(path[1]), request);
    if (path[0] === 'stages' && path.length === 2 && path[1]) return apiData(await getStage(path[1]));
    if (path[0] === 'stages' && path[2] === 'standings' && path[1]) return paginate(await listStandings(path[1]), request);
    if (path[0] === 'stages' && path[2] === 'matches' && path[1]) return paginate(await listStageMatches(path[1]), request);
    if (path[0] === 'teams' && path.length === 2 && path[1]) return apiData(await getTeam(path[1]));
    if (path[0] === 'teams' && path[2] === 'players' && path[1]) return paginate(await listTeamPlayers(path[1]), request);
    if (path[0] === 'teams' && path[2] === 'matches' && path[1]) return paginate(await listTeamMatches(path[1]), request);
    if (path[0] === 'teams' && path[2] === 'stats' && path[1]) return apiData(await getTeamStats(path[1]));

    if (path[0] === 'matches' && path.length === 2 && path[1]) {
      const match = await getMatch(path[1]);
      return apiData(match, { pollIntervalSeconds: match.status === 'LIVE' ? 30 : undefined });
    }
    if (path[0] === 'matches' && path[2] === 'events' && path[1]) {
      const match = await getMatch(path[1]);
      return paginate(match.events ?? [], request);
    }
    if (path[0] === 'matches' && path[2] === 'highlights' && path[1]) return paginate(await listMatchHighlights(path[1]), request);
    if (path[0] === 'news' && path.length === 2 && path[1]) return apiData(await getNews(path[1]));
    if (path[0] === 'coach' && path[1] === 'teams' && path[3] === 'setup' && path[2]) {
      await requireCoach(request, path[2]);
      return apiData(await getCoachSetup(path[2]));
    }
    if (path[0] === 'certificates' && path[2] === 'check') {
      const verificationCode = new URL(request.url).searchParams.get('code');
      if (!verificationCode) throw new AppError('VALIDATION_ERROR', 'Certificate code is required.', 422);
      const [certificate] = await db.select().from(certificates).where(eq(certificates.verificationCode, verificationCode)).limit(1);
      return apiData({ valid: Boolean(certificate), certificate: certificate ?? null });
    }

    throw new AppError('NOT_FOUND', 'Endpoint was not found.', 404);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const path = (await context.params).path ?? [];
    const key = path.join('/');
    const payload = await parseBody(request);

    if (key === 'auth/login') {
      const input = loginSchema.parse(payload);
      const user = await verifyPasswordLogin(input.email, input.password, request.headers.get('x-forwarded-for') ?? input.email);
      return apiData({
        user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles },
        ...(await issueMobileTokens(user.id)),
      });
    }
    if (key === 'auth/refresh') {
      if (typeof payload.refreshToken !== 'string') throw new AppError('VALIDATION_ERROR', 'refreshToken is required.', 422);
      return apiData(await rotateMobileTokens(payload.refreshToken));
    }
    if (key === 'auth/logout') {
      const input = logoutSchema.parse(payload);
      await revokeMobileRefresh(input.refreshToken);
      return apiData({ loggedOut: true });
    }
    if (key === 'auth/password-reset/request') {
      if (typeof payload.email !== 'string') throw new AppError('VALIDATION_ERROR', 'email is required.', 422);
      await requestPasswordReset(payload.email);
      return apiData({ accepted: true });
    }
    if (key === 'auth/password-reset/confirm') {
      if (typeof payload.token !== 'string' || typeof payload.password !== 'string' || payload.password.length < 8) {
        throw new AppError('VALIDATION_ERROR', 'A valid token and password of at least 8 characters are required.', 422);
      }
      await resetPassword(payload.token, payload.password);
      return apiData({ reset: true });
    }
    if (key === 'certificates/generate') {
      const user = await requireMobileIdentity(request);
      const verificationCode = crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
      const tournamentId = String(payload.tournamentId);
      const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
      if (!tournament) throw new AppError('NOT_FOUND', 'Tournament was not found.', 404);
      const filePath = await createFixedCertificate({
        recipientName: String(payload.recipientName ?? user.displayName),
        tournamentName: tournament.name,
        category: String(payload.category ?? 'Tournament participant'),
        date: new Date().toISOString().slice(0, 10),
        verificationCode,
      });
      const [certificate] = await db
        .insert(certificates)
        .values({
          recipientName: String(payload.recipientName ?? user.displayName),
          tournamentId,
          ageGroupId: payload.ageGroupId ? String(payload.ageGroupId) : undefined,
          verificationCode,
          filePath,
          createdBy: user.id,
        })
        .returning();
      return apiData(certificate, {}, 201);
    }
    if (path[0] === 'me' && path[1] === 'favorite-teams' && path.length === 3 && path[2]) {
      const user = await requireMobileIdentity(request);
      await db.insert(favorites).values({ userId: user.id, teamId: path[2] }).onConflictDoNothing();
      return apiData({ teamId: path[2], favorited: true }, {}, 201);
    }
    if (path[0] === 'coach' && path[1] === 'teams' && path[3] === 'players' && path[4] === 'submissions' && path[2]) {
      const user = await requireCoach(request, path[2]);
      const input = playerPayloadSchema.parse(payload);
      await submissionService.submitPlayer(path[2], user.id, input, typeof payload.playerId === 'string' ? payload.playerId : undefined);
      return apiData({ status: 'PENDING' }, {}, 201);
    }
    if (path[0] === 'coach' && path[1] === 'teams' && path[3] === 'coach-names' && path[4] === 'submissions' && path[2]) {
      const user = await requireCoach(request, path[2]);
      const input = coachNamesSchema.parse(payload);
      return apiData(await submissionService.submitCoachNames(path[2], user.id, input.names), {}, 201);
    }
    if (path[0] === 'coach' && path[1] === 'teams' && path[3] === 'jerseys' && path[4] === 'submissions' && path[2]) {
      const user = await requireCoach(request, path[2]);
      const input = jerseyColorsSchema.parse(payload);
      return apiData(await submissionService.submitJerseys(path[2], user.id, input.home, input.away), {}, 201);
    }

    throw new AppError('NOT_FOUND', 'Endpoint was not found.', 404);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const path = (await context.params).path ?? [];
    if (path[0] === 'notifications' && path[2] === 'read' && path[1]) {
      const user = await requireMobileIdentity(request);
      const [row] = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, path[1]), eq(notifications.userId, user.id)))
        .returning();
      if (!row) throw new AppError('NOT_FOUND', 'Notification was not found.', 404);
      return apiData({ id: row.id, title: row.title, body: row.body, read: true, teamId: row.teamId });
    }
    throw new AppError('NOT_FOUND', 'Endpoint was not found.', 404);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const path = (await context.params).path ?? [];
    if (path[0] === 'me' && path[1] === 'favorite-teams' && path.length === 3 && path[2]) {
      const user = await requireMobileIdentity(request);
      await db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.teamId, path[2])));
      return apiData({ teamId: path[2], favorited: false });
    }
    throw new AppError('NOT_FOUND', 'Endpoint was not found.', 404);
  } catch (error) {
    return apiError(error);
  }
}
