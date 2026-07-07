import { describe, expect, it } from 'vitest';
import { RoomManager, toRoomView } from '../src/rooms.js';
import { toSnapshot } from '../src/snapshot.js';

const twoPlayerRoom = (rm: RoomManager) => {
  const { room, player: host } = rm.create('Ana');
  const joined = rm.join(room.code, 'Ben');
  if (!joined.ok) throw new Error(joined.error);
  return { room, host, guest: joined.player };
};

describe('RoomManager', () => {
  it('creates rooms with 4-letter unambiguous codes', () => {
    const rm = new RoomManager();
    const { room } = rm.create('Ana');
    expect(room.code).toMatch(/^[A-HJ-NPR-Z]{4}$/);
    expect(room.hostId).toBe(room.players[0]!.id);
  });

  it('enforces join rules: capacity, unique names, not-started', () => {
    const rm = new RoomManager();
    const { room, host } = twoPlayerRoom(rm);
    expect(rm.join(room.code, 'ben')).toMatchObject({ ok: false, error: /name is taken/ });
    expect(rm.join('XXXX', 'Cy')).toMatchObject({ ok: false, error: /not found/ });

    rm.join(room.code, 'Cy');
    rm.join(room.code, 'Dee');
    expect(rm.join(room.code, 'Eve')).toMatchObject({ ok: false, error: /full/ });

    const rm2 = new RoomManager();
    const g2 = twoPlayerRoom(rm2);
    rm2.start(g2.room.code, g2.host.id);
    expect(rm2.join(g2.room.code, 'Late')).toMatchObject({ ok: false, error: /already started/ });
  });

  it('only the host can start, and only with 2+ players', () => {
    const rm = new RoomManager();
    const { room } = rm.create('Solo');
    expect(rm.start(room.code, room.hostId)).toMatchObject({ ok: false, error: /at least 2/ });

    const g = twoPlayerRoom(rm);
    expect(rm.start(g.room.code, g.guest.id)).toMatchObject({ ok: false, error: /host/ });
    expect(rm.start(g.room.code, g.host.id).ok).toBe(true);
    expect(g.room.game).not.toBeNull();
    expect(g.room.game!.players.map((p) => p.id)).toEqual([g.host.id, g.guest.id]);
  });

  it('routes actions through the engine and keeps the new state', () => {
    const rm = new RoomManager();
    const g = twoPlayerRoom(rm);
    rm.start(g.room.code, g.host.id);

    expect(rm.act(g.room.code, g.guest.id, { type: 'drive', to: 'chicago' })).toMatchObject({
      ok: false,
      error: 'not your turn',
    });
    const r = rm.act(g.room.code, g.host.id, { type: 'drive', to: 'chicago' });
    expect(r.ok).toBe(true);
    expect(g.room.game!.players[0]!.location).toBe('chicago');
    expect(g.room.game!.actionsLeft).toBe(3);
  });

  it('rejoin by token restores the seat; wrong token fails', () => {
    const rm = new RoomManager();
    const g = twoPlayerRoom(rm);
    rm.markDisconnected(g.room.code, g.guest.id);
    expect(g.room.players[1]!.connected).toBe(false);

    expect(rm.rejoin(g.room.code, 'bogus')).toMatchObject({ ok: false, error: /token/ });
    const back = rm.rejoin(g.room.code, g.guest.token);
    expect(back).toMatchObject({ ok: true });
    expect(g.room.players[1]!.connected).toBe(true);
  });

  it('sweeps idle rooms', () => {
    const rm = new RoomManager();
    const { room } = rm.create('Ana');
    expect(rm.sweep(1000, room.lastActivity + 500)).toBe(0);
    expect(rm.sweep(1000, room.lastActivity + 1500)).toBe(1);
    expect(rm.get(room.code)).toBeUndefined();
  });
});

describe('views', () => {
  it('room view exposes roles only after start, never tokens', () => {
    const rm = new RoomManager();
    const g = twoPlayerRoom(rm);
    let view = toRoomView(g.room);
    expect(view.players.map((p) => p.role)).toEqual([null, null]);
    expect(JSON.stringify(view)).not.toContain(g.host.token);

    rm.start(g.room.code, g.host.id);
    view = toRoomView(g.room);
    expect(view.started).toBe(true);
    expect(view.players.every((p) => p.role !== null)).toBe(true);
  });

  it('snapshot hides deck order and rng state but keeps counts', () => {
    const rm = new RoomManager();
    const g = twoPlayerRoom(rm);
    rm.start(g.room.code, g.host.id);
    const game = g.room.game!;
    const snap = toSnapshot(game);

    expect(snap.playerDeckCount).toBe(game.playerDeck.length);
    expect(snap.infectionDeckCount).toBe(game.infectionDeck.length);
    expect(snap).not.toHaveProperty('playerDeck');
    expect(snap).not.toHaveProperty('infectionDeck');
    expect(snap).not.toHaveProperty('rngState');
    expect(snap.infectionDiscard).toEqual(game.infectionDiscard); // discards are public
    expect(snap.infectionRate).toBe(2);

    // mutating the snapshot must not touch live state
    snap.cubes[Object.keys(snap.cubes)[0]!]!.blue = 99;
    expect(Object.values(game.cubes).some((c) => c.blue === 99)).toBe(false);
  });
});
