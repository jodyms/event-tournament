import { ageGroups, demoTeamSetup, demoTeamStats, matches, news, standings, teams } from '../../data/mockData';
import type { AgeGroup, AppNotification, CoachTeamSetup, ID, Match, NewsArticle, StandingRow, Team, TeamStats } from '../../domain/models';
import { apiFetch, fetchAll } from './client';
import { presentMatch, presentNews, presentPlayer, presentSetup, presentStanding, presentTeam, type CoachSetupDto, type HomeDto, type MatchDto, type NewsDto, type PlayerDto, type StandingDto, type TeamDto } from './map';
import { isDemoMode } from './mode';

export interface HomeData { hero?: Match; matchesToday: Match[]; upcomingMatches: Match[]; news: NewsArticle[]; certificateAvailable: boolean; unreadNotifications: number; pollIntervalSeconds: number; }
export interface VenueInfo { id: string; name: string; address: string | null; capacity: number | null; mapUrl: string | null; }
export interface RuleInfo { id: string; title: string; body: string; version: number; publishedAt: string | null; }
export interface HighlightInfo { id: string; title: string; path: string; externalUrl: string | null; matchId: string | null; }
export interface CertificateInfo { id: string; recipientName: string; verificationCode: string; tournamentName: string; }

async function one<T>(path: string) {
  const response = await apiFetch<T>(path);
  return response;
}

export async function getAgeGroups(tournamentId = 'current'): Promise<AgeGroup[]> {
  if (isDemoMode()) return [...ageGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  return fetchAll<AgeGroup>(`/tournaments/${tournamentId}/age-groups`);
}

export async function getStages(ageGroupId: ID): Promise<Array<{ id: ID; name: string; sortOrder: number }>> {
  if (isDemoMode()) return [{ id: `${ageGroupId}-a`, name: 'Group A', sortOrder: 1 }, { id: `${ageGroupId}-b`, name: 'Group B', sortOrder: 2 }];
  return fetchAll(`/age-groups/${ageGroupId}/stages`);
}

export async function getSchedule(): Promise<Match[]> {
  if (isDemoMode()) return matches;
  return (await fetchAll<MatchDto>('/matches')).map(presentMatch);
}

export async function getStageMatches(stageId: ID): Promise<Match[]> {
  if (isDemoMode()) return matches;
  return (await fetchAll<MatchDto>(`/stages/${stageId}/matches`)).map(presentMatch);
}

export async function getHome(): Promise<HomeData> {
  if (isDemoMode()) return { hero: matches[0], matchesToday: matches.filter((match) => match.status === 'LIVE'), upcomingMatches: matches.filter((match) => match.status === 'UPCOMING'), news, certificateAvailable: false, unreadNotifications: 0, pollIntervalSeconds: 30 };
  const response = await one<HomeDto>('/home');
  return { hero: response.data.hero ? presentMatch(response.data.hero) : undefined, matchesToday: response.data.matchesToday.map(presentMatch), upcomingMatches: response.data.upcomingMatches.map(presentMatch), news: response.data.news.map(presentNews), certificateAvailable: response.data.certificateAvailable, unreadNotifications: response.data.unreadNotifications, pollIntervalSeconds: response.meta.pollIntervalSeconds ?? 30 };
}

export async function getMatch(matchId: ID): Promise<Match> {
  if (isDemoMode()) return matches.find((match) => match.id === matchId) ?? matches[0]!;
  return presentMatch((await one<MatchDto>(`/matches/${matchId}`)).data);
}

export async function getStandings(stageId: ID): Promise<StandingRow[]> {
  if (isDemoMode()) return standings;
  return (await fetchAll<StandingDto>(`/stages/${stageId}/standings`)).map(presentStanding);
}

export async function getTeams(): Promise<Team[]> {
  if (isDemoMode()) return teams;
  return (await fetchAll<TeamDto>('/teams')).map(presentTeam);
}

export async function getTeam(teamId: ID): Promise<Team> {
  if (isDemoMode()) return teams.find((team) => team.id === teamId) ?? teams[0]!;
  return presentTeam((await one<TeamDto>(`/teams/${teamId}`)).data);
}

export async function getTeamPlayers(teamId: ID) {
  if (isDemoMode()) return demoTeamSetup(teamId).players.filter((player) => player.status === 'APPROVED');
  return (await fetchAll<PlayerDto>(`/teams/${teamId}/players`)).map(presentPlayer);
}

export async function getTeamMatches(teamId: ID): Promise<Match[]> {
  if (isDemoMode()) return matches.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId);
  return (await fetchAll<MatchDto>(`/teams/${teamId}/matches`)).map(presentMatch);
}

export async function getTeamStats(teamId: ID): Promise<TeamStats> {
  if (isDemoMode()) return demoTeamStats(teamId);
  return (await one<TeamStats>(`/teams/${teamId}/stats`)).data;
}

export async function getNews(): Promise<NewsArticle[]> {
  if (isDemoMode()) return news;
  return (await fetchAll<NewsDto>('/news')).map(presentNews);
}

export async function getNewsArticle(newsId: ID): Promise<NewsArticle> {
  if (isDemoMode()) return news.find((article) => article.id === newsId) ?? news[0]!;
  return presentNews((await one<NewsDto>(`/news/${newsId}`)).data);
}

export async function getCoachTeams(): Promise<Team[]> {
  if (isDemoMode()) return teams.slice(0, 3);
  return (await fetchAll<TeamDto>('/coach/teams')).map(presentTeam);
}

export async function getCoachSetup(teamId: ID): Promise<CoachTeamSetup> {
  if (isDemoMode()) return demoTeamSetup(teamId);
  return presentSetup((await one<CoachSetupDto>(`/coach/teams/${teamId}/setup`)).data);
}

export async function submitCoachNames(teamId: ID, names: string[]): Promise<{ status: 'PENDING' }> {
  if (isDemoMode()) return { status: 'PENDING' };
  return (await apiFetch<{ status: 'PENDING' }>(`/coach/teams/${teamId}/coach-names/submissions`, { method: 'POST', body: JSON.stringify({ names }) })).data;
}

export async function submitJerseys(teamId: ID, jerseys: { home: string; away: string }): Promise<{ status: 'PENDING' }> {
  if (isDemoMode()) return { status: 'PENDING' };
  return (await apiFetch<{ status: 'PENDING' }>(`/coach/teams/${teamId}/jerseys/submissions`, { method: 'POST', body: JSON.stringify(jerseys) })).data;
}

export async function submitPlayer(teamId: ID, player: { name: string; position: string; jerseyNumber: number }): Promise<{ status: 'PENDING' }> {
  if (isDemoMode()) return { status: 'PENDING' };
  return (await apiFetch<{ status: 'PENDING' }>(`/coach/teams/${teamId}/players/submissions`, { method: 'POST', body: JSON.stringify(player) })).data;
}

export async function setFavorite(teamId: ID, favorite: boolean): Promise<void> {
  if (isDemoMode()) return;
  await apiFetch(`/me/favorite-teams/${teamId}`, favorite ? { method: 'POST', body: JSON.stringify({}) } : { method: 'DELETE' });
}

export async function getFavoriteTeams(): Promise<Team[]> {
  if (isDemoMode()) return teams.filter((team) => team.id === 'kickball');
  return (await fetchAll<TeamDto>('/me/favorite-teams')).map(presentTeam);
}

export async function getRules(): Promise<RuleInfo[]> {
  if (isDemoMode()) return [{ id: 'rules', title: 'Tournament Rules', body: 'Official rules are provided by the tournament organiser. Only the latest published version is shown here.', version: 1, publishedAt: '2026-07-18T00:00:00Z' }];
  return fetchAll<RuleInfo>('/tournament-rules');
}

export async function getVenues(): Promise<VenueInfo[]> {
  if (isDemoMode()) return [{ id: 'pitch', name: 'Stadium Pitch 1', address: 'Tournament Sports Complex, Main Gate', capacity: 500, mapUrl: null }];
  return fetchAll<VenueInfo>('/venues');
}

export async function getHighlights(): Promise<HighlightInfo[]> {
  if (isDemoMode()) return [{ id: 'h1', title: 'Opening weekend recap', path: '', externalUrl: null, matchId: 'm1' }, { id: 'h2', title: 'Top goals of the group stage', path: '', externalUrl: null, matchId: null }];
  return fetchAll<HighlightInfo>('/highlights');
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (isDemoMode()) return [{ id: 'n1', title: 'Match rescheduled', body: 'Football FC vs Kickball FC has a new kick-off time.', read: false, teamId: null }, { id: 'n2', title: 'Player registration needs revision', body: 'A player submission requires changes before it can be approved.', read: false, teamId: 'kickball' }];
  return fetchAll<AppNotification>('/notifications');
}

export async function markNotificationRead(id: ID): Promise<void> {
  if (isDemoMode()) return;
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function getMyCertificate(): Promise<CertificateInfo | null> {
  if (isDemoMode()) return null;
  return (await one<CertificateInfo | null>('/me/certificate')).data;
}
