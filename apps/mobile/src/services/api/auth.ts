import type { Session } from '../../domain/models';
import { apiFetch } from './client';
import { presentUser, type ApiUser } from './map';

export async function login(email: string, password: string): Promise<Session> {
  const { data } = await apiFetch<{ user: ApiUser; accessToken: string; refreshToken: string; expiresIn: number }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: Date.now() + data.expiresIn * 1000, user: presentUser(data.user) };
}

export async function logout(refreshToken: string): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}
