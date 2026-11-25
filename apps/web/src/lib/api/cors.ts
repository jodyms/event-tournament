const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function isAllowedApiOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
