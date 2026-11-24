import { create } from 'zustand';
import { initialPlayers } from '../data/mockData';
import type { Player, Session } from '../domain/models';
import { sessionStorage } from '../services/storage/session';
import { setFavorite } from '../services/api/tournament';

interface AppState {
  hydrated: boolean;
  session: Session | null;
  favoriteTeamIds: string[];
  players: Player[];
  coachNames: string[];
  jerseys: { home: string; away: string };
  hydrateSession: (session: Session | null) => void;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleFavorite: (teamId: string) => Promise<void>;
  addPlayer: (player: Omit<Player, 'id'>) => void;
  removePlayer: (playerId: string) => void;
  setCoachNames: (names: string[]) => void;
  setJerseys: (home: string, away: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  session: null,
  favoriteTeamIds: ['kickball'],
  players: initialPlayers,
  coachNames: [],
  jerseys: { home: '', away: '' },
  hydrateSession: (session) => set({ session, hydrated: true }),
  login: async (email) => {
    const session: Session = {
      token: 'demo-access-token',
      user: { id: 'u1', email, name: 'Jordan Coach', roles: ['USER', 'COACH'] },
    };
    await sessionStorage.write(session);
    set({ session });
  },
  logout: async () => {
    await sessionStorage.clear();
    set({ session: null });
  },
  toggleFavorite: async (teamId) => {
    const wasFavorite = useAppStore.getState().favoriteTeamIds.includes(teamId);
    set((state) => ({ favoriteTeamIds: wasFavorite ? state.favoriteTeamIds.filter((id) => id !== teamId) : [...state.favoriteTeamIds, teamId] }));
    try {
      await setFavorite(teamId, !wasFavorite);
    } catch {
      set((state) => ({ favoriteTeamIds: wasFavorite ? [...state.favoriteTeamIds, teamId] : state.favoriteTeamIds.filter((id) => id !== teamId) }));
    }
  },
  addPlayer: (player) => set((state) => ({
    players: [...state.players, { ...player, id: `player-${Date.now()}`, status: 'PENDING' }],
  })),
  removePlayer: (playerId) => set((state) => ({ players: state.players.filter((player) => player.id !== playerId) })),
  setCoachNames: (coachNames) => set({ coachNames }),
  setJerseys: (home, away) => set({ jerseys: { home, away } }),
}));
