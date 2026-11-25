jest.mock('../../storage/session', () => ({
  sessionStorage: { read: jest.fn(async () => null), write: jest.fn(), clear: jest.fn() },
}));

import { getHome, submitCoachNames, submitJerseys, submitPlayer } from '../tournament';

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('tournament live client', () => {
  const previous = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3000';
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previous;
    jest.restoreAllMocks();
  });

  it('posts coach submission bodies in the API shape', async () => {
    const bodies: string[] = [];
    globalThis.fetch = jest.fn(async (_input, init) => {
      bodies.push(String(init?.body));
      return json({ data: { status: 'PENDING' }, meta: {} });
    }) as unknown as typeof fetch;
    await submitCoachNames('team-1', ['Jordan Coach', 'Alex Morgan']);
    await submitJerseys('team-1', { home: 'Hijau', away: 'Putih' });
    await submitPlayer('team-1', { name: 'Raka', position: 'Gelandang', jerseyNumber: 8 });
    expect(JSON.parse(bodies[0] ?? '{}')).toEqual({ names: ['Jordan Coach', 'Alex Morgan'] });
    expect(JSON.parse(bodies[1] ?? '{}')).toEqual({ home: 'Hijau', away: 'Putih' });
    expect(JSON.parse(bodies[2] ?? '{}')).toEqual({ name: 'Raka', position: 'Gelandang', jerseyNumber: 8 });
  });

  it('maps the home payload onto mobile match statuses', async () => {
    const team = { id: 't1', name: 'Kickball FC', ageGroupName: 'U12', stageName: 'Grup A', crestUrl: null, homeJersey: 'Hijau', awayJersey: 'Putih' };
    const match = { id: 'm1', homeTeam: team, awayTeam: { ...team, id: 't2', name: 'Football FC' }, homeScore: 1, awayScore: 0, startsAt: '2026-07-18T02:00:00.000Z', venue: 'Pitch 1', competitionLabel: 'TYC · Grup A', status: 'FINISHED' };
    globalThis.fetch = jest.fn(async () => json({
      data: { hero: { ...match, status: 'SCHEDULED' }, matchesToday: [match], upcomingMatches: [], news: [], certificateAvailable: false, unreadNotifications: 0 },
      meta: { pollIntervalSeconds: 30 },
    })) as unknown as typeof fetch;
    const home = await getHome();
    expect(home.hero?.status).toBe('UPCOMING');
    expect(home.matchesToday[0]?.status).toBe('COMPLETED');
    expect(home.upcomingMatches).toEqual([]);
    expect(home.pollIntervalSeconds).toBe(30);
  });
});
