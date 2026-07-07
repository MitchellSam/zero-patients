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
  setSession: (s: Session | null) => void;
  setRoom: (r: RoomView | null) => void;
  setGame: (snapshot: GameSnapshot | null, events?: GameEvent[]) => void;
}

export const useStore = create<Store>((set) => ({
  session: loadSession(),
  room: null,
  snapshot: null,
  feed: [],
  setSession: (session) => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    set({ session });
  },
  setRoom: (room) => set({ room }),
  setGame: (snapshot, events = []) => set({ snapshot, feed: events }),
}));

socket.on('room:update', (room: RoomView) => useStore.getState().setRoom(room));
socket.on('game:state', ({ snapshot, events }: { snapshot: GameSnapshot; events: GameEvent[] }) =>
  useStore.getState().setGame(snapshot, events)
);
