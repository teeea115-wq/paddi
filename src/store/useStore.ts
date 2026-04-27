import { create } from 'zustand';

interface UserProfile {
  id: string;
  email: string;
  trial_start_at: string | null;
  is_premium: boolean;
}

interface Room {
  id: string;
  host_id: string;
  mode: 'geo' | 'manual';
  status: 'drafting' | 'voting' | 'completed';
  card_limit: number;
  radius_m: number | null;
}

interface AppState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentRoom: null,
  setCurrentRoom: (room) => set({ currentRoom: room }),
}));
