import { describe, expect, it } from 'vitest';
import { assertRoundRobin, pitchSlot, roundRobin, youthGoals, mulberry32 } from '@/db/demo-schedule';

describe('demo tournament schedule', () => {
  it('builds a single round robin for 4, 6, and 8 teams', () => {
    for (const size of [4, 6, 8]) {
      const ids = Array.from({ length: size }, (_, index) => `t${index}`);
      const rounds = roundRobin(ids);
      expect(() => assertRoundRobin(ids, rounds)).not.toThrow();
    }
  });

  it('keeps each kickoff slot on distinct pitches', () => {
    const slots = Array.from({ length: 24 }, (_, index) => pitchSlot(index, 8));
    for (let slot = 0; slot < 3; slot += 1) {
      const pitches = slots.filter((item) => item.slotIndex === slot).map((item) => item.pitchIndex);
      expect(new Set(pitches).size).toBe(8);
    }
  });

  it('draws youth scores inside the usual range', () => {
    const rng = mulberry32(2026);
    const scores = Array.from({ length: 40 }, () => youthGoals(rng));
    expect(scores.every((score) => score >= 0 && score <= 5)).toBe(true);
    expect(scores.some((score) => score === 0)).toBe(true);
    expect(scores.some((score) => score >= 3)).toBe(true);
  });
});
