import { sessionStorage } from '../storage/session';

/**
 * Single place to attach the real `/api/v1` base URL and bearer token.
 * Feature repositories should depend on this boundary rather than calling fetch directly.
 */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const errorCopy: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email atau kata sandi tidak valid.',
  ACCESS_TOKEN_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  UNAUTHENTICATED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses ke tim ini.',
  RATE_LIMITED: 'Terlalu banyak percobaan. Coba lagi nanti.',
  SUBMISSION_PENDING: 'Perubahan ini sedang menunggu peninjauan.',
  SUBMISSION_ALREADY_PENDING: 'Perubahan ini sedang menunggu peninjauan.',
  JERSEY_NUMBER_DUPLICATE: 'Nomor punggung tersebut sudah digunakan.',
  SQUAD_LIMIT_REACHED: 'Jumlah pemain tim sudah mencapai batas.',
  MAX_SQUAD_REACHED: 'Jumlah pemain tim sudah mencapai batas.',
  MATCH_NOT_FOUND: 'Pertandingan tidak ditemukan.',
  CONTENT_NOT_PUBLISHED: 'Konten ini belum dipublikasikan.',
  NOT_FOUND: 'Data tidak ditemukan.',
  VALIDATION_ERROR: 'Periksa kembali isian Anda.',
};

const TIMEOUT_MS = 15_000;
type Meta = { page?: number; pageSize?: number; count?: number; pollIntervalSeconds?: number };
type ErrorBody = { error?: { code?: string; message?: string } };
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => Promise<void>) | null = null;

export function setSessionExpiredHandler(handler: () => Promise<void>) {
  onSessionExpired = handler;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.code ? (errorCopy[error.code] ?? error.message) : error.message;
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

function origin() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new ApiError(0, 'EXPO_PUBLIC_API_URL is not configured. Demo data is active.');
  return baseUrl.replace(/\/$/, '');
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const current = await sessionStorage.read();
      if (!current?.refreshToken) return false;
      const response = await fetch(`${origin()}/api/v1/auth/refresh`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: current.refreshToken }) });
      const body = await response.json().catch(() => null) as { data?: { accessToken: string; refreshToken: string; expiresIn: number } } | null;
      if (!response.ok || !body?.data?.accessToken || !body.data.refreshToken) return false;
      await sessionStorage.write({ ...current, accessToken: body.data.accessToken, refreshToken: body.data.refreshToken, expiresAt: Date.now() + body.data.expiresIn * 1000 });
      return true;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<{ data: T; meta: Meta }> {
  const session = await sessionStorage.read();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (options.signal) options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(`${origin()}/api/v1${path}`, { ...options, headers, signal: controller.signal });
    const body = await response.json().catch(() => null) as ({ data?: T; meta?: Meta } & ErrorBody) | null;
    if (response.status === 401 && body?.error?.code === 'ACCESS_TOKEN_EXPIRED' && retry && session?.refreshToken) {
      const refreshed = await refreshSession();
      if (refreshed) return apiFetch(path, options, false);
      await onSessionExpired?.();
      throw new ApiError(401, errorCopy.ACCESS_TOKEN_EXPIRED ?? 'Sesi Anda telah berakhir. Silakan masuk kembali.', 'ACCESS_TOKEN_EXPIRED');
    }
    if (!response.ok) throw new ApiError(response.status, body?.error?.message || 'Request failed', body?.error?.code);
    return { data: body?.data as T, meta: body?.meta ?? {} };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAll<T>(path: string): Promise<T[]> {
  const pageSize = 100;
  const join = path.includes('?') ? '&' : '?';
  const first = await apiFetch<T[]>(`${path}${join}page=1&pageSize=${pageSize}`);
  const total = first.meta.count ?? first.data.length;
  const pages = Math.min(20, Math.ceil(total / pageSize));
  const rows = [...first.data];
  for (let page = 2; page <= pages; page += 1) {
    const next = await apiFetch<T[]>(`${path}${join}page=${page}&pageSize=${pageSize}`);
    rows.push(...next.data);
  }
  return rows;
}
