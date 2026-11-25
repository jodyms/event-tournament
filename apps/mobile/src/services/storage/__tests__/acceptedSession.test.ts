import { acceptedSession, DEMO_ACCESS_TOKEN } from '../acceptedSession';
import type { Session } from '../../../domain/models';

const demo: Session = {
  accessToken: DEMO_ACCESS_TOKEN,
  refreshToken: 'demo-refresh-token',
  expiresAt: Date.now() + 60_000,
  user: { id: 'u1', email: 'coach@kickzone.app', name: 'Jordan Coach', roles: ['USER', 'COACH'] },
};

describe('acceptedSession', () => {
  it('drops a stored demo session once the app talks to the API', () => {
    expect(acceptedSession(demo, false)).toBeNull();
  });

  it('keeps a demo session only while demo mode is on, and a real session in API mode', () => {
    expect(acceptedSession(demo, true)).toBe(demo);
    const real = { ...demo, accessToken: 'signed.token' };
    expect(acceptedSession(real, false)).toBe(real);
    expect(acceptedSession(null, false)).toBeNull();
  });
});
