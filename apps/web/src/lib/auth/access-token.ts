import { createHash, timingSafeEqual } from 'crypto';
import { AppError } from '@/lib/api/errors';

const secret = () => process.env.SESSION_SECRET ?? 'development-secret';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function signAccessToken(userId: string, ttlMs: number, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: now + ttlMs })).toString('base64url');
  return `${payload}.${hash(`${payload}.${secret()}`)}`;
}

export function readAccessClaims(raw: string, now = Date.now()): { sub: string; exp: number } {
  const parts = raw.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AppError('UNAUTHENTICATED', 'Invalid access token.', 401);
  const [payload, signature] = parts;
  const expected = hash(`${payload}.${secret()}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) throw new AppError('UNAUTHENTICATED', 'Invalid access token.', 401);
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new AppError('UNAUTHENTICATED', 'Invalid access token.', 401); }
  if (!parsed || typeof parsed !== 'object') throw new AppError('UNAUTHENTICATED', 'Invalid access token.', 401);
  const { sub, exp } = parsed as { sub?: unknown; exp?: unknown };
  if (typeof sub !== 'string' || !sub || typeof exp !== 'number' || !Number.isFinite(exp)) throw new AppError('UNAUTHENTICATED', 'Invalid access token.', 401);
  if (exp < now) throw new AppError('ACCESS_TOKEN_EXPIRED', 'Access token has expired.', 401);
  return { sub, exp };
}
