import { ageGroups, demoTeamSetup, demoTeamStats, matches, news, standings } from '../../data/mockData';
import type { AgeGroup, CoachTeamSetup, ID, Match, NewsArticle, StandingRow, TeamStats } from '../../domain/models';
import { apiFetch } from './client';

type Envelope<T> = { data: T };

function configured() {
  return Boolean(process.env.EXPO_PUBLIC_API_URL);
}

async function request<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const response = await apiFetch<Envelope<T>>(path, options, token);
  return response.data;
}

export async function getAgeGroups(tournamentId = 'current'): Promise<AgeGroup[]> {
  if (!configured()) return [...ageGroups].sort((a, b) => a.sortOrder - b.sortOrder);
  return request<AgeGroup[]>(`/tournaments/${tournamentId}/age-groups`);
}

export async function getStages(ageGroupId: ID): Promise<Array<{ id: ID; name: string; sortOrder: number }>> {
  if (!configured()) return [{ id: `${ageGroupId}-a`, name: 'Group A', sortOrder: 1 }, { id: `${ageGroupId}-b`, name: 'Group B', sortOrder: 2 }];
  return request(`/age-groups/${ageGroupId}/stages`);
}

export async function getSchedule(): Promise<Match[]> {
  if (!configured()) return matches;
  return request('/matches');
}

export interface HomeData { hero?: Match; matchesToday: Match[]; upcomingMatches: Match[]; news: NewsArticle[]; certificateAvailable: boolean; unreadNotifications: number; }

export async function getHome(): Promise<HomeData> {
  if (!configured()) return { hero: matches[0], matchesToday: matches.filter((match) => match.status === 'LIVE'), upcomingMatches: matches.filter((match) => match.status === 'UPCOMING'), news, certificateAvailable: false, unreadNotifications: 0 };
  return request('/home');
}

export async function getMatch(matchId: ID): Promise<Match> {
  if (!configured()) return matches.find((match) => match.id === matchId) ?? matches[0]!;
  return request(`/matches/${matchId}`);
}

export async function getStandings(stageId: ID): Promise<StandingRow[]> {
  if (!configured()) return standings;
  return request(`/stages/${stageId}/standings`);
}

export async function getTeamStats(teamId: ID): Promise<TeamStats> {
  if (!configured()) return demoTeamStats(teamId);
  return request(`/teams/${teamId}/stats`);
}

export async function getCoachSetup(teamId: ID): Promise<CoachTeamSetup> {
  if (!configured()) return demoTeamSetup(teamId);
  return request(`/coach/teams/${teamId}/setup`);
}

export async function submitCoachNames(teamId: ID, names: string[]): Promise<{ status: 'PENDING' }> {
  if (!configured()) return { status: 'PENDING' };
  return request(`/coach/teams/${teamId}/coach-names/submissions`, { method: 'POST', body: JSON.stringify({ names }) });
}

export async function submitJerseys(teamId: ID, jerseys: { home: string; away: string }): Promise<{ status: 'PENDING' }> {
  if (!configured()) return { status: 'PENDING' };
  return request(`/coach/teams/${teamId}/jerseys/submissions`, { method: 'POST', body: JSON.stringify(jerseys) });
}

export async function submitPlayer(teamId: ID, player: { name: string; position: string; jerseyNumber: number }): Promise<{ status: 'PENDING' }> {
  if (!configured()) return { status: 'PENDING' };
  return request(`/coach/teams/${teamId}/players/submissions`, { method: 'POST', body: JSON.stringify(player) });
}

export async function setFavorite(teamId: ID, favorite: boolean): Promise<void> {
  if (!configured()) return;
  await request(`/me/favorite-teams/${teamId}`, { method: favorite ? 'POST' : 'DELETE' });
}
