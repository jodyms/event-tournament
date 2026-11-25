export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function youthGoals(rng: () => number) {
  const roll = rng();
  if (roll < 0.22) return 0;
  if (roll < 0.52) return 1;
  if (roll < 0.78) return 2;
  if (roll < 0.92) return 3;
  if (roll < 0.98) return 4;
  return 5;
}

/** Circle method. Every team plays every other team once, and only once per round. */
export function roundRobin(teamIds: string[]): [string, string][][] {
  if (teamIds.length < 2 || teamIds.length % 2 !== 0) throw new Error('Round robin needs an even number of teams.');
  const rotation = [...teamIds];
  const count = rotation.length;
  const rounds: [string, string][][] = [];
  for (let round = 0; round < count - 1; round += 1) {
    const pairs: [string, string][] = [];
    for (let index = 0; index < count / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[count - 1 - index];
      if (!left || !right) throw new Error('Round robin rotation is missing a team.');
      pairs.push(round % 2 === 0 ? [left, right] : [right, left]);
    }
    rounds.push(pairs);
    const moved = rotation.pop();
    if (!moved) throw new Error('Round robin rotation is empty.');
    rotation.splice(1, 0, moved);
  }
  return rounds;
}

export function assertRoundRobin(teamIds: string[], rounds: [string, string][][]) {
  const expected = (teamIds.length * (teamIds.length - 1)) / 2;
  const seen = new Set<string>();
  if (rounds.length !== teamIds.length - 1) throw new Error(`Expected ${teamIds.length - 1} rounds, got ${rounds.length}.`);
  for (const round of rounds) {
    const used = new Set<string>();
    for (const [home, away] of round) {
      if (home === away) throw new Error('A team cannot play itself.');
      if (used.has(home) || used.has(away)) throw new Error('A team is scheduled twice in the same round.');
      used.add(home);
      used.add(away);
      seen.add([home, away].sort().join(':'));
    }
    if (used.size !== teamIds.length) throw new Error('A round does not include every team.');
  }
  if (seen.size !== expected) throw new Error(`Expected ${expected} unique fixtures, got ${seen.size}.`);
}

export function pitchSlot(matchIndex: number, pitchCount: number) {
  if (pitchCount < 1) throw new Error('At least one pitch is required.');
  return { pitchIndex: matchIndex % pitchCount, slotIndex: Math.floor(matchIndex / pitchCount) };
}
