import type { Session } from '../../domain/models';

export const DEMO_ACCESS_TOKEN = 'demo-access-token';

export function acceptedSession(session: Session | null, demoMode: boolean): Session | null {
  if (!session?.accessToken) return null;
  if (!demoMode && session.accessToken === DEMO_ACCESS_TOKEN) return null;
  return session;
}
