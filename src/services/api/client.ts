/**
 * Single place to attach the real `/api/v1` base URL and bearer token when a
 * backend contract is available. Feature repositories should depend on this
 * boundary rather than calling fetch directly from a screen.
 */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const errorCopy: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Email atau kata sandi tidak valid.',
  SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  TEAM_NOT_ASSIGNED: 'Anda tidak memiliki akses ke tim ini.',
  SUBMISSION_ALREADY_PENDING: 'Perubahan ini sedang menunggu peninjauan.',
  JERSEY_NUMBER_DUPLICATE: 'Nomor punggung tersebut sudah digunakan.',
  MAX_SQUAD_REACHED: 'Jumlah pemain tim sudah mencapai batas.',
  MATCH_NOT_FOUND: 'Pertandingan tidak ditemukan.',
  CONTENT_NOT_PUBLISHED: 'Konten ini belum dipublikasikan.',
};

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.code ? (errorCopy[error.code] ?? error.message) : error.message;
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new ApiError(0, 'EXPO_PUBLIC_API_URL is not configured. Demo data is active.');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { code?: string; message?: string } | null;
    throw new ApiError(response.status, body?.message || 'Request failed', body?.code);
  }
  return response.json() as Promise<T>;
}
