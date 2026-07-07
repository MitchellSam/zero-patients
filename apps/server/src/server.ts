import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import {
  CreateRoomSchema,
  GameActionSchema,
  JoinRoomSchema,
  RejoinRoomSchema,
  StartGameSchema,
  WatchRoomSchema,
} from '@zero-patients/shared';
import { RoomManager, toRoomView, type Room } from './rooms.js';
import { toSnapshot } from './snapshot.js';

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

type Ack = (response: unknown) => void;

/** Parse-or-ack-an-error wrapper for socket handlers. */
function handled<S extends z.ZodTypeAny>(
  schema: S,
  fn: (payload: z.infer<S>, ack: Ack) => void
): (raw: unknown, ack?: Ack) => void {
  return (raw, ack = () => {}) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return ack({ ok: false, error: 'malformed request' });
    try {
      fn(parsed.data, ack);
    } catch (err) {
      console.error(err);
      ack({ ok: false, error: 'internal error' });
    }
  };
}

export function attachGameServer(httpServer: HttpServer): { io: Server; rooms: RoomManager } {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const rooms = new RoomManager();

  const sweeper = setInterval(() => rooms.sweep(ROOM_TTL_MS), SWEEP_INTERVAL_MS);
  sweeper.unref();

  const broadcastRoom = (room: Room) => io.to(room.code).emit('room:update', toRoomView(room));
  const broadcastGame = (room: Room, events: unknown[]) => {
    if (room.game) io.to(room.code).emit('game:state', { snapshot: toSnapshot(room.game), events });
  };

  io.on('connection', (socket: Socket) => {
    const seat = (): { code: string; playerId: string } | null =>
      socket.data.code ? { code: socket.data.code, playerId: socket.data.playerId } : null;

    const sit = (code: string, playerId: string) => {
      socket.data.code = code;
      socket.data.playerId = playerId;
      socket.join(code);
    };

    socket.on(
      'room:create',
      handled(CreateRoomSchema, ({ name }, ack) => {
        const { room, player } = rooms.create(name);
        sit(room.code, player.id);
        ack({ ok: true, code: room.code, playerId: player.id, token: player.token });
        broadcastRoom(room);
      })
    );

    socket.on(
      'room:join',
      handled(JoinRoomSchema, ({ code, name }, ack) => {
        const r = rooms.join(code, name);
        if (!r.ok) return ack(r);
        sit(r.room.code, r.player.id);
        ack({ ok: true, code: r.room.code, playerId: r.player.id, token: r.player.token });
        broadcastRoom(r.room);
      })
    );

    socket.on(
      'room:rejoin',
      handled(RejoinRoomSchema, ({ code, token }, ack) => {
        const r = rooms.rejoin(code, token);
        if (!r.ok) return ack(r);
        sit(r.room.code, r.player.id);
        ack({
          ok: true,
          code: r.room.code,
          playerId: r.player.id,
          token: r.player.token,
          room: toRoomView(r.room),
          snapshot: r.room.game ? toSnapshot(r.room.game) : null,
        });
        broadcastRoom(r.room);
      })
    );

    // board screens (and spectators) watch without a seat
    socket.on(
      'room:watch',
      handled(WatchRoomSchema, ({ code }, ack) => {
        const room = rooms.get(code);
        if (!room) return ack({ ok: false, error: 'room not found' });
        socket.join(code);
        ack({
          ok: true,
          room: toRoomView(room),
          snapshot: room.game ? toSnapshot(room.game) : null,
        });
      })
    );

    socket.on(
      'room:start',
      handled(StartGameSchema, ({ epidemics }, ack) => {
        const s = seat();
        if (!s) return ack({ ok: false, error: 'you are not in a room' });
        const r = rooms.start(s.code, s.playerId, epidemics);
        if (!r.ok) return ack(r);
        ack({ ok: true });
        broadcastRoom(r.room);
        broadcastGame(r.room, [
          { type: 'turn-started', player: r.room.game!.players[0]!.id },
        ]);
      })
    );

    socket.on(
      'game:action',
      handled(GameActionSchema, ({ action }, ack) => {
        const s = seat();
        if (!s) return ack({ ok: false, error: 'you are not in a room' });
        const result = rooms.act(s.code, s.playerId, action);
        if (!result.ok) return ack(result);
        ack({ ok: true });
        const room = rooms.get(s.code)!;
        broadcastGame(room, result.events);
      })
    );

    socket.on('disconnect', () => {
      const s = seat();
      if (!s) return;
      const room = rooms.markDisconnected(s.code, s.playerId);
      if (room) broadcastRoom(room);
    });
  });

  return { io, rooms };
}
