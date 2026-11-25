import { jerseyColor } from '@/lib/domain/tournament-status';

export const JAKARTA_TIME_ZONE = 'Asia/Jakarta';
export type ApiMatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
export type SubmissionState = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type TeamDto = { id: string; name: string; ageGroupName: string; stageName: string | null; crestUrl: string | null; homeJersey: string; awayJersey: string };
export type MatchEventDto = { id: string; teamId: string; minute: number; player: { id: string | null; name: string; jerseyNumber: number | null }; kind: 'GOAL' };
export type MatchDto = { id: string; homeTeam: TeamDto; awayTeam: TeamDto; homeScore: number; awayScore: number; startsAt: string; venue: string; competitionLabel: string; status: ApiMatchStatus; events?: MatchEventDto[] };
export type StandingDto = { teamId: string; teamName: string; played: number; goalDifference: number; points: number; position: number; team: TeamDto };
export type NewsDto = { id: string; category: string; title: string; body: string; coverUrl: string | null; publishedAt: string | null };
export type PlayerDto = { id: string; teamId: string; name: string; position: string; jerseyNumber: number; status: SubmissionState; rejectionReason?: string };

export function jakartaDayKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

export function toTeamDto(row: { id: string; name: string; ageGroupName: string; stageName?: string | null; crestUrl?: string | null; homeJersey?: Record<string, string> | null; awayJersey?: Record<string, string> | null }): TeamDto {
  return { id: row.id, name: row.name, ageGroupName: row.ageGroupName, stageName: row.stageName ?? null, crestUrl: row.crestUrl ?? null, homeJersey: jerseyColor(row.homeJersey), awayJersey: jerseyColor(row.awayJersey) };
}

export function bucketHomeMatches<T extends { status: string; startsAt: string }>(rows: T[], now = new Date()) {
  const today = jakartaDayKey(now);
  const byKickoff = (left: T, right: T) => left.startsAt.localeCompare(right.startsAt);
  const live = rows.filter((row) => row.status === 'LIVE').sort(byKickoff);
  const scheduled = rows.filter((row) => row.status === 'SCHEDULED').sort(byKickoff);
  const matchesToday = [...live, ...scheduled.filter((row) => jakartaDayKey(new Date(row.startsAt)) === today)];
  const upcomingMatches = scheduled.filter((row) => jakartaDayKey(new Date(row.startsAt)) !== today);
  const hero = live[0] ?? scheduled.find((row) => new Date(row.startsAt).getTime() >= now.getTime()) ?? scheduled[0];
  return { hero, matchesToday, upcomingMatches };
}

export function rollupStatus(rows: { status: string; rejectionReason?: string | null; createdAt: Date }[]): { status: SubmissionState; reason?: string } {
  if (!rows.length) return { status: 'NOT_STARTED' };
  if (rows.some((row) => row.status === 'PENDING')) return { status: 'PENDING' };
  const latest = rows.reduce((best, row) => (row.createdAt > best.createdAt ? row : best));
  if (latest.status === 'REJECTED') return { status: 'REJECTED', ...(latest.rejectionReason ? { reason: latest.rejectionReason } : {}) };
  if (rows.some((row) => row.status === 'APPROVED')) return { status: 'APPROVED' };
  return { status: 'NOT_STARTED' };
}

export function setupProgress(sections: { status: SubmissionState }[]) {
  const approved = sections.filter((section) => section.status === 'APPROVED').length;
  const total = sections.length || 1;
  return { approved, total: sections.length, percentage: Math.round((approved / total) * 100) };
}
