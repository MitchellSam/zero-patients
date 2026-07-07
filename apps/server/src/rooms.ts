import { randomBytes, randomUUID } from 'node:crypto';
import type { PlayerAction, RoomView } from '@zero-patients/shared';
import { applyAction, createGame, type ApplyResult, type GameState } from '@zero-patients/engine';

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
// no ambiguous glyphs (I/O/Q/0/1 lookalikes) — codes get read off a TV
const CODE_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';

export interface RoomPlayer {
  id: string;
  name: string;
  /** secret — lets a phone resume its seat after a drop */
  token: string;
  connected: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  game: GameState | null;
  lastActivity: number;
}

export type RoomResult<T> = { ok: true } & T | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

export class RoomManager {
  private rooms = new Map<string, Room>();

  private generateCode(): string {
    for (;;) {
      const bytes = randomBytes(4);
      const code = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
      if (!this.rooms.has(code)) return code;
    }
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  create(hostName: string): { room: Room; player: RoomPlayer } {
    const player: RoomPlayer = {
      id: randomUUID(),
      name: hostName,
      token: randomUUID(),
      connected: true,
    };
    const room: Room = {
      code: this.generateCode(),
      hostId: player.id,
      players: [player],
      game: null,
      lastActivity: Date.now(),
    };
    this.rooms.set(room.code, room);
    return { room, player };
  }

  join(code: string, name: string): RoomResult<{ room: Room; player: RoomPlayer }> {
    const room = this.rooms.get(code);
    if (!room) return fail('room not found');
    if (room.game) return fail('the game has already started');
    if (room.players.length >= MAX_PLAYERS) return fail('room is full');
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      return fail('that name is taken');

    const player: RoomPlayer = { id: randomUUID(), name, token: randomUUID(), connected: true };
    room.players.push(player);
    room.lastActivity = Date.now();
    return { ok: true, room, player };
  }

  rejoin(code: string, token: string): RoomResult<{ room: Room; player: RoomPlayer }> {
    const room = this.rooms.get(code);
    if (!room) return fail('room not found');
    const player = room.players.find((p) => p.token === token);
    if (!player) return fail('invalid token');
    player.connected = true;
    room.lastActivity = Date.now();
    return { ok: true, room, player };
  }

  start(code: string, playerId: string, epidemics?: 4 | 5 | 6): RoomResult<{ room: Room }> {
    const room = this.rooms.get(code);
    if (!room) return fail('room not found');
    if (room.hostId !== playerId) return fail('only the host can start the game');
    if (room.game) return fail('the game has already started');
    if (room.players.length < MIN_PLAYERS) return fail(`need at least ${MIN_PLAYERS} players`);

    room.game = createGame({
      seed: randomBytes(4).readInt32BE(),
      players: room.players.map((p) => ({ id: p.id, name: p.name })),
      ...(epidemics ? { epidemics } : {}),
    });
    room.lastActivity = Date.now();
    return { ok: true, room };
  }

  act(code: string, playerId: string, action: PlayerAction): ApplyResult {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'room not found' };
    if (!room.game) return { ok: false, error: 'the game has not started' };
    if (!room.players.some((p) => p.id === playerId))
      return { ok: false, error: 'you are not in this room' };

    const result = applyAction(room.game, playerId, action);
    if (result.ok) {
      room.game = result.state;
      room.lastActivity = Date.now();
    }
    return result;
  }

  markDisconnected(code: string, playerId: string): Room | undefined {
    const room = this.rooms.get(code);
    const player = room?.players.find((p) => p.id === playerId);
    if (player) player.connected = false;
    return room;
  }

  /** Drop rooms idle longer than maxIdleMs. Returns how many were removed. */
  sweep(maxIdleMs: number, now = Date.now()): number {
    let removed = 0;
    for (const [code, room] of this.rooms)
      if (now - room.lastActivity > maxIdleMs) {
        this.rooms.delete(code);
        removed++;
      }
    return removed;
  }
}

export function toRoomView(room: Room): RoomView {
  return {
    code: room.code,
    started: room.game !== null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: room.game?.players.find((gp) => gp.id === p.id)?.role ?? null,
      connected: p.connected,
      isHost: p.id === room.hostId,
    })),
  };
}
