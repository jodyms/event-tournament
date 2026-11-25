export type FinishedScore = { homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number };
export type FootballStanding = { teamId: string; position: number; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };

export function timeRangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) { return startA < endB && startB < endA; }
export function calculateFootballStandings(matches: FinishedScore[]): FootballStanding[] {
  const totals = new Map<string, Omit<FootballStanding, 'teamId' | 'position' | 'goalDifference'>>();
  const entry = (teamId: string) => totals.get(teamId) ?? (totals.set(teamId, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }), totals.get(teamId)!);
  for (const match of matches) { const home = entry(match.homeTeamId); const away = entry(match.awayTeamId); home.played++; away.played++; home.goalsFor += match.homeScore; home.goalsAgainst += match.awayScore; away.goalsFor += match.awayScore; away.goalsAgainst += match.homeScore; if (match.homeScore > match.awayScore) { home.wins++; home.points += 3; away.losses++; } else if (match.homeScore < match.awayScore) { away.wins++; away.points += 3; home.losses++; } else { home.draws++; away.draws++; home.points++; away.points++; } }
  return [...totals.entries()].sort(([, a], [, b]) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor).map(([teamId, value], index) => ({ teamId, position: index + 1, ...value, goalDifference: value.goalsFor - value.goalsAgainst }));
}
