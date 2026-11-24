export type ID = string;
export type UserRole = 'USER' | 'COACH' | 'ADMIN';
export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
export type SubmissionStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: ID;
  email: string;
  name: string;
  roles: UserRole[];
}

export interface Team {
  id: ID;
  name: string;
  shortName: string;
  age: string;
  group: string;
  accent: string;
  initials: string;
  sport?: { code: string; label: string; supportsLiveScoreView?: boolean; supportsFootballStandings?: boolean };
}

export interface Player {
  id: ID;
  teamId: ID;
  name: string;
  position: string;
  jerseyNumber: number;
  status?: SubmissionStatus;
  rejectionReason?: string;
}

export interface Match {
  id: ID;
  homeTeamId: ID;
  awayTeamId: ID;
  homeScore?: number;
  awayScore?: number;
  startsAt: string;
  venue: string;
  competitionLabel: string;
  status: MatchStatus;
  events?: Array<{ id: ID; teamId: ID; minute: number; player: { id?: ID; name: string; jerseyNumber?: number }; kind: 'GOAL' }>;
}

export interface StandingRow {
  teamId: ID;
  played: number;
  goalDifference: number;
  points: number;
}

export interface NewsArticle {
  id: ID;
  category: string;
  title: string;
  readMinutes: number;
  accent: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface AgeGroup { id: ID; name: string; sortOrder: number; }
export interface Stage { id: ID; name: string; ageGroupId: ID; sortOrder: number; }

export interface SetupItem {
  status: SubmissionStatus;
  reason?: string;
}

export interface CoachTeamSetup {
  team: Team;
  progress: { approved: number; total: number; percentage: number };
  setup: { coachNames: SetupItem; jersey: SetupItem; players: SetupItem };
  squad: { max: number; approved: number; pending: number; remaining: number };
  officialJerseys?: { home: string; away: string };
}

export interface TeamStats {
  teamId: ID;
  ageGroup: string;
  group: string;
  squadSize: number;
  officialJerseys: { home: string; away: string };
  tournament: { totalMatches: number; matchesWon: number; goalsScored: number };
}

export interface AppNotification {
  id: ID;
  type: 'MATCH_RESCHEDULED' | 'MATCH_STARTED' | 'MATCH_FINISHED' | 'COACH_SUBMISSION_REJECTED';
  title: string;
  body: string;
  read: boolean;
  target?: { screen: 'MatchDetail' | 'ManageTeam'; matchId?: ID; teamId?: ID; section?: 'coaches' | 'jerseys' | 'players' };
}
