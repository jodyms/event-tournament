import { describe, expect, it } from 'vitest';
import { calculateFootballStandings, timeRangesOverlap } from './competition';

describe('Football competition rules', () => {
  it('calculates points, goal difference and deterministic rank', () => {
    const table = calculateFootballStandings([{ homeTeamId: 'a', awayTeamId: 'b', homeScore: 2, awayScore: 0 }, { homeTeamId: 'a', awayTeamId: 'c', homeScore: 1, awayScore: 1 }, { homeTeamId: 'b', awayTeamId: 'c', homeScore: 3, awayScore: 1 }]);
    expect(table.map((row) => [row.teamId, row.points, row.goalDifference])).toEqual([['a', 4, 2], ['b', 3, 0], ['c', 1, -2]]);
  });
  it('treats a touching match window as non-overlapping', () => expect(timeRangesOverlap(new Date('2026-01-01T10:00:00Z'), new Date('2026-01-01T11:00:00Z'), new Date('2026-01-01T11:00:00Z'), new Date('2026-01-01T12:00:00Z'))).toBe(false));
});
