import type { Session } from '../../../domain/models';

jest.mock('../../storage/session', () => ({
  sessionStorage: {
    read: jest.fn(),
    write: jest.fn(),
    clear: jest.fn(),
  },
}));

import { apiFetch, setSessionExpiredHandler } from '../client';
import { sessionStorage } from '../../storage/session';

const readSession = sessionStorage.read as jest.MockedFunction<typeof sessionStorage.read>;
const writeSession = sessionStorage.write as jest.MockedFunction<typeof sessionStorage.write>;

const user = { id: 'u1', email: 'coach@kickzone.app', name: 'Jordan Coach', roles: ['USER', 'COACH'] as const };
let current: Session = { accessToken: 'old-access', refreshToken: 'old-refresh-token', expiresAt: 1, user: { ...user, roles: ['USER', 'COACH'] } };

function json(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('apiFetch session', () => {
  const previous = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3000';
    current = { accessToken: 'old-access', refreshToken: 'old-refresh-token', expiresAt: 1, user: { ...user, roles: ['USER', 'COACH'] } };
    readSession.mockImplementation(async () => current);
    writeSession.mockImplementation(async (session) => { current = session; });
    setSessionExpiredHandler(async () => undefined);
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previous;
    jest.restoreAllMocks();
  });

  it('returns the data envelope and meta', async () => {
    globalThis.fetch = jest.fn(async () => json(200, { data: { id: 'm1' }, meta: { count: 4, pollIntervalSeconds: 30 } })) as unknown as typeof fetch;
    await expect(apiFetch<{ id: string }>('/matches/m1')).resolves.toEqual({ data: { id: 'm1' }, meta: { count: 4, pollIntervalSeconds: 30 } });
  });

  it('refreshes once and retries with the new access token', async () => {
    const expired = jest.fn();
    setSessionExpiredHandler(expired);
    globalThis.fetch = jest.fn(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) return json(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh-token', expiresIn: 900 } });
      const auth = init?.headers instanceof Headers ? init.headers.get('Authorization') : null;
      if (auth === 'Bearer old-access') return json(401, { error: { code: 'ACCESS_TOKEN_EXPIRED', message: 'expired' } });
      return json(200, { data: { ok: true }, meta: { count: 1 } });
    }) as unknown as typeof fetch;

    const [first, second] = await Promise.all([apiFetch<{ ok: boolean }>('/matches'), apiFetch<{ ok: boolean }>('/teams')]);
    expect(first.data.ok).toBe(true);
    expect(second.data.ok).toBe(true);
    const urls = (globalThis.fetch as unknown as jest.Mock).mock.calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    const retryAuth = (globalThis.fetch as unknown as jest.Mock).mock.calls
      .filter((call) => !String(call[0]).endsWith('/auth/refresh'))
      .map((call) => (call[1]?.headers instanceof Headers ? call[1].headers.get('Authorization') : null));
    expect(retryAuth).toContain('Bearer new-access');
    expect(expired).not.toHaveBeenCalled();
  });

  it('expires the session when refresh fails', async () => {
    const expired = jest.fn(async () => undefined);
    setSessionExpiredHandler(expired);
    globalThis.fetch = jest.fn(async (input) => {
      if (String(input).endsWith('/auth/refresh')) return json(401, { error: { code: 'UNAUTHENTICATED', message: 'no' } });
      return json(401, { error: { code: 'ACCESS_TOKEN_EXPIRED', message: 'expired' } });
    }) as unknown as typeof fetch;
    await expect(apiFetch('/home')).rejects.toMatchObject({ code: 'ACCESS_TOKEN_EXPIRED' });
    expect(expired).toHaveBeenCalledTimes(1);
  });
});
