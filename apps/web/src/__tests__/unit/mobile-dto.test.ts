import { describe, expect, it } from 'vitest';
import { bucketHomeMatches, jakartaDayKey, rollupStatus, setupProgress, toTeamDto } from '@/lib/api/mobile-dto';

describe('mobile DTO', () => {
  it('buckets a live match ahead of a later kickoff and keeps today separate from later fixtures', () => {
    const now = new Date('2026-07-18T02:00:00Z');
    expect(jakartaDayKey(now)).toBe('2026-07-18');
    const rows = [
      { id: 'live', status: 'LIVE', startsAt: '2026-07-17T18:00:00Z' },
      { id: 'today', status: 'SCHEDULED', startsAt: '2026-07-18T10:00:00Z' },
      { id: 'later', status: 'SCHEDULED', startsAt: '2026-07-19T10:00:00Z' },
    ];
    const home = bucketHomeMatches(rows, now);
    expect(home.hero?.id).toBe('live');
    expect(home.matchesToday.map((row) => row.id)).toEqual(['live', 'today']);
    expect(home.upcomingMatches.map((row) => row.id)).toEqual(['later']);
  });

  it('reads jersey colour and rolls an empty coach section back to not started', () => {
    expect(toTeamDto({ id: 't', name: 'Kickball FC', ageGroupName: 'U11', homeJersey: { color: '#111111' }, awayJersey: null }).homeJersey).toBe('#111111');
    expect(rollupStatus([])).toEqual({ status: 'NOT_STARTED' });
    expect(rollupStatus([{ status: 'REJECTED', rejectionReason: 'Too long', createdAt: new Date('2026-01-02T00:00:00Z') }, { status: 'APPROVED', createdAt: new Date('2026-01-01T00:00:00Z') }])).toEqual({ status: 'REJECTED', reason: 'Too long' });
    expect(setupProgress([{ status: 'APPROVED' }, { status: 'PENDING' }, { status: 'NOT_STARTED' }])).toEqual({ approved: 1, total: 3, percentage: 33 });
  });
});
