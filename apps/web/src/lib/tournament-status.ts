export type TournamentRecordStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CANCELLED';
export type TournamentLabel = 'Draft' | 'On Going' | 'Finished' | 'Canceled' | 'Scheduled';
export type StatusTone = 'info' | 'warning' | 'success' | 'danger';

export function tournamentLabel(status: TournamentRecordStatus, startsAt: Date, endsAt: Date, now = new Date()): { label: TournamentLabel; tone: StatusTone } {
  if (status === 'CANCELLED') return { label: 'Canceled', tone: 'danger' };
  if (status === 'DRAFT') return { label: 'Draft', tone: 'warning' };
  if (status === 'ARCHIVED' || now > endsAt) return { label: 'Finished', tone: 'success' };
  if (now < startsAt) return { label: 'Scheduled', tone: 'info' };
  return { label: 'On Going', tone: 'info' };
}

export function matchLabel(status: string) {
  if (status === 'SCHEDULED') return { label: 'Schedule', tone: 'warning' as const };
  if (status === 'LIVE') return { label: 'LIVE', tone: 'danger' as const };
  if (status === 'FINISHED') return { label: 'Finished', tone: 'success' as const };
  if (status === 'POSTPONED') return { label: 'Postponed', tone: 'info' as const };
  if (status === 'CANCELLED') return { label: 'Canceled', tone: 'warning' as const };
  return { label: status, tone: 'warning' as const };
}

export function parseClockMinutes(value: string, fallback: number) {
  const text = value.trim();
  if (!text) return fallback;
  if (/^\d+$/.test(text)) return Number(text);
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function scoresFromGoals(homeTeamId: string, awayTeamId: string, events: { teamId: string }[]) {
  return { homeScore: events.filter((event) => event.teamId === homeTeamId).length, awayScore: events.filter((event) => event.teamId === awayTeamId).length };
}

export function slugify(name: string) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
  return base || 'tournament';
}

export function cleanHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

export function jerseyColor(value: Record<string, string> | null | undefined) {
  if (!value) return '';
  return value.color ?? Object.values(value)[0] ?? '';
}

export function withParams(path: string, current: Record<string, string | undefined>, patch: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) if (value) params.set(key, value);
  for (const [key, value] of Object.entries(patch)) { if (value === null) params.delete(key); else params.set(key, value); }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function dateInput(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function dateTimeLocal(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${dateInput(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function shortDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(value);
}

export function pageWindow(pageValue: string | undefined, total: number, size = 7) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pages, Math.max(1, Number(pageValue ?? 1) || 1));
  const start = (page - 1) * size;
  return { page, size, pages, start, end: Math.min(total, start + size) };
}
