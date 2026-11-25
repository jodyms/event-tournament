import type { CoachTeamSetup, Match, MatchStatus, NewsArticle, Player, StandingRow, Team, User, UserRole } from '../../domain/models';

const ACCENTS = ['#3EBF5F', '#F8C526', '#EE443B', '#4CA7D8', '#875BF7', '#E07A3D'];
const NEWS_ACCENTS = ['#285D3B', '#243A62', '#5D3828', '#3E4C2A'];

export type TeamDto = { id: string; name: string; ageGroupName: string; stageName: string | null; crestUrl: string | null; homeJersey: string; awayJersey: string };
export type MatchEventDto = { id: string; teamId: string; minute: number; player: { id: string | null; name: string; jerseyNumber: number | null }; kind: 'GOAL' };
export type MatchDto = { id: string; homeTeam: TeamDto; awayTeam: TeamDto; homeScore: number; awayScore: number; startsAt: string; venue: string; competitionLabel: string; status: string; events?: MatchEventDto[] };
export type NewsDto = { id: string; category: string; title: string; body: string; coverUrl: string | null; publishedAt: string | null };
export type StandingDto = { teamId: string; teamName: string; played: number; goalDifference: number; points: number; position: number; team: TeamDto };
export type HomeDto = { hero: MatchDto | null; matchesToday: MatchDto[]; upcomingMatches: MatchDto[]; news: NewsDto[]; certificateAvailable: boolean; unreadNotifications: number };
export type PlayerDto = { id: string; teamId: string; name: string; position: string; jerseyNumber: number; status: Player['status']; rejectionReason?: string };
export type CoachSetupDto = Omit<CoachTeamSetup, 'team' | 'players'> & { team: TeamDto; players: PlayerDto[] };
export type ApiUser = { id: string; email: string; displayName: string; roles: string[] };

function accent(id: string, palette: string[]) {
  let hash = 0;
  for (const char of id) hash = (hash + char.charCodeAt(0)) % palette.length;
  return palette[hash] ?? palette[0]!;
}

export function jakartaDayKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

export function isJakartaToday(iso: string, now = new Date()) {
  return jakartaDayKey(new Date(iso)) === jakartaDayKey(now);
}

export function presentStatus(status: string): MatchStatus {
  if (status === 'SCHEDULED') return 'UPCOMING';
  if (status === 'FINISHED') return 'COMPLETED';
  if (status === 'LIVE' || status === 'POSTPONED' || status === 'CANCELLED') return status;
  return 'UPCOMING';
}

export function presentTeam(team: TeamDto): Team {
  const parts = team.name.trim().split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : team.name.slice(0, 2)).toUpperCase() || 'TM';
  return { id: team.id, name: team.name, shortName: parts[0] ?? team.name, age: team.ageGroupName, group: team.stageName ?? '', accent: accent(team.id, ACCENTS), initials };
}

export function presentMatch(match: MatchDto): Match {
  return {
    id: match.id,
    homeTeamId: match.homeTeam.id,
    awayTeamId: match.awayTeam.id,
    homeTeam: presentTeam(match.homeTeam),
    awayTeam: presentTeam(match.awayTeam),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    startsAt: match.startsAt,
    venue: match.venue,
    competitionLabel: match.competitionLabel,
    status: presentStatus(match.status),
    events: match.events?.map((event) => ({ id: event.id, teamId: event.teamId, minute: event.minute, kind: 'GOAL' as const, player: { id: event.player.id ?? undefined, name: event.player.name, jerseyNumber: event.player.jerseyNumber ?? undefined } })),
  };
}

export function presentNews(article: NewsDto): NewsArticle {
  const words = article.body.trim().split(/\s+/).filter(Boolean).length;
  return { id: article.id, category: article.category, title: article.title, body: article.body, readMinutes: Math.max(1, Math.round(words / 200)), accent: accent(article.id, NEWS_ACCENTS) };
}

export function presentStanding(row: StandingDto): StandingRow {
  return { teamId: row.teamId, teamName: row.teamName, team: presentTeam(row.team), played: row.played, goalDifference: row.goalDifference, points: row.points, position: row.position };
}

export function presentPlayer(player: PlayerDto): Player {
  return { id: player.id, teamId: player.teamId, name: player.name, position: player.position, jerseyNumber: player.jerseyNumber, status: player.status, rejectionReason: player.rejectionReason };
}

export function presentSetup(setup: CoachSetupDto): CoachTeamSetup {
  return { ...setup, team: presentTeam(setup.team), players: setup.players.map(presentPlayer) };
}

export function presentUser(user: ApiUser): User {
  const roles = user.roles.filter((role): role is UserRole => role === 'USER' || role === 'COACH' || role === 'ADMIN');
  return { id: user.id, email: user.email, name: user.displayName, roles: roles.length ? roles : ['USER'] };
}
