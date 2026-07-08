import { create } from 'zustand';
import type { GameEvent, GameSnapshot, RoomView } from '@zero-patients/shared';
import { socket } from './socket.js';

export interface Session {
  code: string;
  playerId: string;
  token: string;
  name: string;
}

const SESSION_KEY = 'zp-session';

export const loadSession = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
};

interface Store {
  session: Session | null;
  room: RoomView | null;
  snapshot: GameSnapshot | null;
  /** most recent broadcast's events — drives the board feed/animations */
  feed: GameEvent[];
  /** cities hit in the latest infection step — pulsed on the board until the next one */
  recentInfections: Set<string>;
  setSession: (s: Session | null) => void;
  setRoom: (r: RoomView | null) => void;
  setGame: (snapshot: GameSnapshot | null, events?: GameEvent[]) => void;
}

export const useStore = create<Store>((set) => ({
  session: loadSession(),
  room: null,
  snapshot: null,
  feed: [],
  recentInfections: new Set(),
  setSession: (session) => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    set({ session });
  },
  setRoom: (room) => set({ room }),
  setGame: (snapshot, events = []) =>
    set((prev) => {
      const infected = events
        .filter((e) => e.type === 'infected' || e.type === 'epidemic' || e.type === 'outbreak')
        .map((e) => e.city);
      return {
        snapshot,
        feed: events,
        // a batch with no infections (ordinary actions) keeps the previous pulses
        recentInfections: infected.length ? new Set(infected) : prev.recentInfections,
      };
    }),
}));

socket.on('room:update', (room: RoomView) => useStore.getState().setRoom(room));
socket.on('game:state', ({ snapshot, events }: { snapshot: GameSnapshot; events: GameEvent[] }) =>
  useStore.getState().setGame(snapshot, events)
);
