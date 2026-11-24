import type { AgeGroup, CoachTeamSetup, Match, NewsArticle, Player, StandingRow, Team, TeamStats } from '../domain/models';

export const teams: Team[] = [
  { id: 'football', name: 'Football FC', shortName: 'Football', age: 'U11', group: 'Group A', accent: '#F8C526', initials: 'FF' },
  { id: 'kickball', name: 'Kickball FC', shortName: 'Kickball', age: 'U11', group: 'Group A', accent: '#EE443B', initials: 'KF' },
  { id: 'longball', name: 'Longball FC', shortName: 'Longball', age: 'U11', group: 'Group A', accent: '#4CA7D8', initials: 'LF' },
  { id: 'eagles', name: 'Young Eagles', shortName: 'Eagles', age: 'U13', group: 'Group B', accent: '#875BF7', initials: 'YE' },
  { id: 'rangers', name: 'City Rangers', shortName: 'Rangers', age: 'U15', group: 'Cup', accent: '#3EBF5F', initials: 'CR' },
];

export const matches: Match[] = [
  { id: 'm1', homeTeamId: 'football', awayTeamId: 'kickball', homeScore: 2, awayScore: 1, startsAt: '2026-07-18T23:00:00Z', venue: 'Stadium Pitch 1', competitionLabel: 'U11 Group A', status: 'LIVE', events: [
    { id: 'e1', teamId: 'football', minute: 14, player: { id: 'p1', name: 'Noah Williams', jerseyNumber: 9 }, kind: 'GOAL' },
    { id: 'e2', teamId: 'kickball', minute: 31, player: { id: 'p4', name: 'Liam Thomas', jerseyNumber: 7 }, kind: 'GOAL' },
    { id: 'e3', teamId: 'football', minute: 48, player: { id: 'p2', name: 'Leo Carter', jerseyNumber: 10 }, kind: 'GOAL' },
  ] },
  { id: 'm2', homeTeamId: 'kickball', awayTeamId: 'longball', homeScore: 4, awayScore: 0, startsAt: '2026-07-18T08:00:00Z', venue: 'Stadium Pitch 1', competitionLabel: 'U11 Group A', status: 'COMPLETED' },
  { id: 'm3', homeTeamId: 'football', awayTeamId: 'longball', startsAt: '2026-07-19T08:30:00Z', venue: 'Community Pitch 2', competitionLabel: 'U11 Group A', status: 'UPCOMING' },
  { id: 'm4', homeTeamId: 'eagles', awayTeamId: 'rangers', startsAt: '2026-07-19T10:00:00Z', venue: 'Stadium Pitch 2', competitionLabel: 'U13 Group B', status: 'UPCOMING' },
];

export const standings: StandingRow[] = [
  { teamId: 'football', played: 4, goalDifference: 7, points: 7 },
  { teamId: 'kickball', played: 4, goalDifference: -5, points: 4 },
  { teamId: 'longball', played: 4, goalDifference: -5, points: 4 },
];

export const initialPlayers: Player[] = [
  { id: 'p1', teamId: 'football', name: 'Noah Williams', position: 'Forward', jerseyNumber: 9, status: 'APPROVED' },
  { id: 'p2', teamId: 'football', name: 'Leo Carter', position: 'Midfielder', jerseyNumber: 10, status: 'APPROVED' },
  { id: 'p3', teamId: 'football', name: 'Ethan Davis', position: 'Goalkeeper', jerseyNumber: 1, status: 'PENDING' },
  { id: 'p4', teamId: 'kickball', name: 'Liam Thomas', position: 'Forward', jerseyNumber: 7, status: 'APPROVED' },
  { id: 'p5', teamId: 'kickball', name: 'Mason Taylor', position: 'Defender', jerseyNumber: 4, status: 'REJECTED', rejectionReason: 'Jersey number is already registered.' },
];

export const news: NewsArticle[] = [
  { id: 'n1', category: 'Tournament', title: 'Opening weekend delivers goals and late drama', readMinutes: 4, accent: '#285D3B' },
  { id: 'n2', category: 'Players', title: 'Five young talents to watch this season', readMinutes: 6, accent: '#243A62' },
  { id: 'n3', category: 'Community', title: 'The volunteers making matchday possible', readMinutes: 3, accent: '#5D3828' },
];

export const teamById = (id: string) => teams.find((team) => team.id === id) ?? teams[0]!;
export const matchById = (id: string) => matches.find((match) => match.id === id) ?? matches[0]!;

export const ageGroups: AgeGroup[] = [
  { id: 'u11', name: 'Under 11', sortOrder: 1 },
  { id: 'u13', name: 'Under 13', sortOrder: 2 },
  { id: 'u15', name: 'Under 15', sortOrder: 3 },
];

export const demoTeamSetup = (teamId: string): CoachTeamSetup => ({
  team: teamById(teamId),
  progress: { approved: 1, total: 3, percentage: 33 },
  setup: {
    coachNames: { status: 'APPROVED' },
    jersey: { status: 'PENDING' },
    players: { status: 'REJECTED', reason: 'Player #8 already registered.' },
  },
  squad: { max: 8, approved: 2, pending: 1, remaining: 6 },
  officialJerseys: { home: 'Green', away: 'White' },
});

export const demoTeamStats = (teamId: string): TeamStats => ({
  teamId,
  ageGroup: teamById(teamId).age,
  group: teamById(teamId).group,
  squadSize: initialPlayers.filter((player) => player.teamId === teamId && player.status === 'APPROVED').length,
  officialJerseys: { home: 'Green', away: 'White' },
  tournament: { totalMatches: 4, matchesWon: 2, goalsScored: 7 },
});
