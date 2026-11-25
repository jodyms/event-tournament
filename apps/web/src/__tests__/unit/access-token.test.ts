import { describe, expect, it } from 'vitest';
import { readAccessClaims, signAccessToken } from '@/lib/auth/access-token';

describe('mobile access token', () => {
  it('round-trips a signed payload and rejects a bad signature or an expired token', () => {
    const now = Date.parse('2026-07-18T00:00:00Z');
    const token = signAccessToken('user-1', 15 * 60 * 1000, now);
    expect(readAccessClaims(token, now + 1000)).toEqual({ sub: 'user-1', exp: now + 15 * 60 * 1000 });
    expect(() => readAccessClaims(`${token}x`, now)).toThrow(/Invalid access token/);
    expect(() => readAccessClaims(token, now + 16 * 60 * 1000)).toThrow(/expired/);
    expect(() => readAccessClaims('not-a-token', now)).toThrow(/Invalid access token/);
  });
});
