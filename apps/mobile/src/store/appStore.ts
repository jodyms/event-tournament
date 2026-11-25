import { create } from 'zustand';
import type { Session } from '../domain/models';
import { login as loginRequest, logout as logoutRequest } from '../services/api/auth';
import { setSessionExpiredHandler } from '../services/api/client';
import { isDemoMode } from '../services/api/mode';
import { queryClient } from '../services/queryClient';
import { DEMO_ACCESS_TOKEN } from '../services/storage/acceptedSession';
import { sessionStorage } from '../services/storage/session';

interface AppState {
  hydrated: boolean;
  session: Session | null;
  hydrateSession: (session: Session | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function clearPrivateState() {
  await sessionStorage.clear();
  queryClient.clear();
  useAppStore.setState({ session: null });
}

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  session: null,
  hydrateSession: (session) => set({ session: session?.accessToken ? session : null, hydrated: true }),
  login: async (email, password) => {
    const session: Session = isDemoMode()
      ? { accessToken: DEMO_ACCESS_TOKEN, refreshToken: 'demo-refresh-token', expiresAt: Date.now() + 86_400_000, user: { id: 'u1', email, name: 'Jordan Coach', roles: ['USER', 'COACH'] } }
      : await loginRequest(email, password);
    await sessionStorage.write(session);
    set({ session });
  },
  logout: async () => {
    const current = useAppStore.getState().session;
    try {
      if (current?.refreshToken && !isDemoMode()) await logoutRequest(current.refreshToken);
    } catch {
      // The local session still ends when the server cannot be reached.
    }
    await clearPrivateState();
  },
}));

setSessionExpiredHandler(clearPrivateState);
