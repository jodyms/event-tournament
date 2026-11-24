import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { adminSessions, jobOutbox, passwordResetTokens, permissions, refreshTokens, rolePermissions, roles, userRoles, users } from '@/db/schema';
import { AppError } from './errors';

const SESSION_COOKIE = 'tyc_admin_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MOBILE_ACCESS_MS = 15 * 60 * 1000;
const MOBILE_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');

export type Identity = { id: string; email: string; displayName: string; permissions: string[]; roles: string[] };

async function identityFor(userId: string): Promise<Identity> {
  const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.status, 'ACTIVE'))).limit(1);
  if (!user) throw new AppError('UNAUTHENTICATED', 'Authentication is required.', 401);
  const rows = await db.select({ role: roles.code, permission: permissions.code }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId)).leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id)).where(eq(userRoles.userId, userId));
  return { id: user.id, email: user.email, displayName: user.displayName, roles: [...new Set(rows.map((r) => r.role))], permissions: [...new Set(rows.flatMap((r) => r.permission ? [r.permission] : []))] };
}

function checkRateLimit(key: string) {
  const now = Date.now(); const hit = attempts.get(key);
  if (!hit || hit.resetAt < now) { attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 }); return; }
  if (hit.count >= 5) throw new AppError('RATE_LIMITED', 'Too many login attempts. Try again later.', 429);
  hit.count += 1;
}

export async function verifyPasswordLogin(email: string, password: string, rateKey = email) {
  checkRateLimit(rateKey);
  const bcrypt = await import('bcryptjs');
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  attempts.delete(rateKey);
  return identityFor(user.id);
}

export async function createAdminSession(userId: string) {
  const raw = token(); const now = new Date(); const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
  await db.insert(adminSessions).values({ userId, tokenHash: hash(raw), lastSeenAt: now, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: expiresAt, path: '/' });
}

export async function destroyAdminSession() { const jar = await cookies(); const raw = jar.get(SESSION_COOKIE)?.value; if (raw) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hash(raw))); jar.delete(SESSION_COOKIE); }

export async function currentAdmin(): Promise<Identity> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) throw new AppError('UNAUTHENTICATED', 'Sign in is required.', 401);
  const now = new Date(); const [session] = await db.select().from(adminSessions).where(and(eq(adminSessions.tokenHash, hash(raw)), gt(adminSessions.expiresAt, now))).limit(1);
  if (!session) throw new AppError('SESSION_EXPIRED', 'Your session has expired.', 401);
  const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
  await db.update(adminSessions).set({ lastSeenAt: now, expiresAt }).where(eq(adminSessions.id, session.id));
  return identityFor(session.userId);
}

export async function requirePermission(permission: string) { const identity = await currentAdmin(); if (!identity.permissions.includes(permission) && !identity.permissions.includes('*')) throw new AppError('FORBIDDEN', 'You do not have permission for this action.', 403); return identity; }
export async function requireMobileIdentity(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new AppError('UNAUTHENTICATED', 'Bearer token is required.', 401);
  const [payload, signature] = header.slice(7).split('.'); const expected = hash(`${payload}.${process.env.SESSION_SECRET ?? 'development-secret'}`);
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new AppError('UNAUTHENTICATED', 'Invalid access token.', 401);
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub: string; exp: number };
  if (parsed.exp < Date.now()) throw new AppError('ACCESS_TOKEN_EXPIRED', 'Access token has expired.', 401);
  return identityFor(parsed.sub);
}
function accessToken(userId: string) { const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + MOBILE_ACCESS_MS })).toString('base64url'); return `${payload}.${hash(`${payload}.${process.env.SESSION_SECRET ?? 'development-secret'}`)}`; }
export async function issueMobileTokens(userId: string) { const refresh = token(); await db.insert(refreshTokens).values({ userId, tokenHash: hash(refresh), expiresAt: new Date(Date.now() + MOBILE_REFRESH_MS) }); return { accessToken: accessToken(userId), refreshToken: refresh, expiresIn: MOBILE_ACCESS_MS / 1000 }; }
export async function rotateMobileTokens(rawRefresh: string) { const [row] = await db.select().from(refreshTokens).where(and(eq(refreshTokens.tokenHash, hash(rawRefresh)), gt(refreshTokens.expiresAt, new Date()))).limit(1); if (!row || row.revokedAt) throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid.', 401); await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, row.id)); return issueMobileTokens(row.userId); }
export async function requestPasswordReset(email: string) { const [user] = await db.select().from(users).where(and(eq(users.email, email.toLowerCase()), eq(users.status, 'ACTIVE'))).limit(1); if (!user) return; const raw = token(); await db.transaction(async (tx) => { await tx.insert(passwordResetTokens).values({ userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 60 * 60_000) }); await tx.insert(jobOutbox).values({ type: 'password.reset.requested', payload: { email: user.email, resetToken: raw } }); }); }
export async function resetPassword(raw: string, password: string) { const bcrypt = await import('bcryptjs'); const [row] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, hash(raw)), gt(passwordResetTokens.expiresAt, new Date()))).limit(1); if (!row || row.usedAt) throw new AppError('INVALID_RESET_TOKEN', 'Reset token is invalid or expired.', 400); await db.transaction(async (tx) => { await tx.update(users).set({ passwordHash: await bcrypt.hash(password, 12), updatedAt: new Date() }).where(eq(users.id, row.userId)); await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id)); await tx.delete(adminSessions).where(eq(adminSessions.userId, row.userId)); }); }
export async function requireCoach(request: Request, teamId: string) { const user = await requireMobileIdentity(request); const { coachTeamAssignments } = await import('@/db/schema'); const assignment = await db.select().from(coachTeamAssignments).where(and(eq(coachTeamAssignments.coachUserId, user.id), eq(coachTeamAssignments.teamId, teamId), eq(coachTeamAssignments.active, true))).limit(1); if (!assignment.length) throw new AppError('FORBIDDEN', 'You are not assigned to this team.', 403); return user; }
