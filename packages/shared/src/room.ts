import { z } from 'zod';
import { PlayerActionSchema, type DiseaseColor, type GamePhase, type Role } from './protocol.js';

// ---------- lobby messages (client -> server, validated at the socket edge) ----------

export const RoomCodeSchema = z
  .string()
  .length(4)
  .regex(/^[A-Z]{4}$/);

const NameSchema = z.string().trim().min(1).max(24);

export const CreateRoomSchema = z.object({ name: NameSchema });
export const JoinRoomSchema = z.object({ code: RoomCodeSchema, name: NameSchema });
export const RejoinRoomSchema = z.object({ code: RoomCodeSchema, token: z.string().min(1) });
export const WatchRoomSchema = z.object({ code: RoomCodeSchema });
export const StartGameSchema = z.object({
  epidemics: z.union([z.literal(4), z.literal(5), z.literal(6)]).optional(),
});
export const GameActionSchema = z.object({ action: PlayerActionSchema });

// ---------- lobby + game views (server -> clients) ----------

/** The printed board track: cards drawn per infection step, by marker position. */
export const INFECTION_RATE_TRACK = [2, 2, 2, 3, 3, 4, 4] as const;

export const CARDS_TO_CURE = 5;
export const CARDS_TO_CURE_SCIENTIST = 4;

export interface RoomView {
  code: string;
  started: boolean;
  players: {
    id: string;
    name: string;
    role: Role | null;
    connected: boolean;
    isHost: boolean;
  }[];
}

/**
 * The public game state sent to every client. Pandemic is open-information —
 * hands and discards are visible — but deck *order* never leaves the server.
 */
export interface GameSnapshot {
  phase: GamePhase;
  pendingDiscard: string | null;
  turnPlayerIndex: number;
  actionsLeft: number;
  turnNumber: number;
  players: { id: string; name: string; role: Role; location: string; hand: string[] }[];
  playerDeckCount: number;
  playerDiscard: ({ kind: 'city'; city: string } | { kind: 'epidemic' })[];
  infectionDeckCount: number;
  infectionDiscard: string[];
  cubes: Record<string, Record<DiseaseColor, number>>;
  cubesLeft: Record<DiseaseColor, number>;
  cures: Record<DiseaseColor, 'active' | 'cured' | 'eradicated'>;
  researchStations: string[];
  outbreaks: number;
  infectionRate: number;
  infectionRateIndex: number;
  result: { result: 'won' | 'lost'; reason: string } | null;
}
