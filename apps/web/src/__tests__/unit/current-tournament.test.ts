import { describe, expect, it } from 'vitest';
import { chooseCurrentTournamentId } from '@/lib/api/mobile-read';

const at = (day: number) => new Date(Date.UTC(2026, 10, day));

describe('current tournament for mobile competition', () => {
  it('prefers the latest published tournament that has a published stage', () => {
    const chosen = chooseCurrentTournamentId([
      { id: 'jakarta', startsAt: at(7), playable: true },
      { id: 'shell', startsAt: at(23), playable: false },
    ]);
    expect(chosen).toBe('jakarta');
  });

  it('keeps the latest start when several tournaments are playable', () => {
    const chosen = chooseCurrentTournamentId([
      { id: 'earlier', startsAt: at(1), playable: true },
      { id: 'later', startsAt: at(20), playable: true },
    ]);
    expect(chosen).toBe('later');
  });

  it('falls back to the latest published tournament when none have a stage', () => {
    const chosen = chooseCurrentTournamentId([
      { id: 'older', startsAt: at(1), playable: false },
      { id: 'newer', startsAt: at(20), playable: false },
    ]);
    expect(chosen).toBe('newer');
  });

  it('returns null when nothing is published', () => {
    expect(chooseCurrentTournamentId([])).toBeNull();
  });
});
