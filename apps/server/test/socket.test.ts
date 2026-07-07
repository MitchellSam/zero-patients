import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { attachGameServer } from '../src/server.js';

let httpServer: ReturnType<typeof createServer>;
let url: string;
const sockets: Socket[] = [];

const client = (): Socket => {
  const s = connect(url, { transports: ['websocket'] });
  sockets.push(s);
  return s;
};

const ask = (s: Socket, event: string, payload: unknown): Promise<any> =>
  s.timeout(2000).emitWithAck(event, payload);

const nextEvent = (s: Socket, event: string): Promise<any> =>
  new Promise((resolve) => s.once(event, resolve));

beforeAll(async () => {
  httpServer = createServer();
  attachGameServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe('socket protocol', () => {
  it('runs a full create → join → watch → start → action round-trip', async () => {
    const host = client();
    const guest = client();
    const board = client();

    const created = await ask(host, 'room:create', { name: 'Ana' });
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^[A-Z]{4}$/);

    const joined = await ask(guest, 'room:join', { code: created.code, name: 'Ben' });
    expect(joined.ok).toBe(true);

    const watching = await ask(board, 'room:watch', { code: created.code });
    expect(watching.ok).toBe(true);
    expect(watching.room.players).toHaveLength(2);
    expect(watching.snapshot).toBeNull();

    // guests can't start
    expect((await ask(guest, 'room:start', {})).ok).toBe(false);

    const boardState = nextEvent(board, 'game:state');
    expect((await ask(host, 'room:start', {})).ok).toBe(true);
    const { snapshot } = await boardState;
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.playerDeckCount).toBeGreaterThan(0);

    // out-of-turn action bounces with the engine's error
    const p2Turn = snapshot.players[snapshot.turnPlayerIndex].id;
    const wrongSeat = p2Turn === created.playerId ? guest : host;
    const bounced = await ask(wrongSeat, 'game:action', { action: { type: 'drive', to: 'chicago' } });
    expect(bounced).toMatchObject({ ok: false, error: 'not your turn' });

    // the right seat drives; everyone in the room hears the new state
    const rightSeat = wrongSeat === guest ? host : guest;
    const update = nextEvent(board, 'game:state');
    const drove = await ask(rightSeat, 'game:action', { action: { type: 'drive', to: 'chicago' } });
    expect(drove.ok).toBe(true);
    const next = await update;
    expect(next.events).toContainEqual({ type: 'moved', player: p2Turn, to: 'chicago' });
    expect(next.snapshot.actionsLeft).toBe(3);
  });

  it('rejects malformed payloads at the edge', async () => {
    const s = client();
    expect(await ask(s, 'room:create', { nope: true })).toMatchObject({
      ok: false,
      error: 'malformed request',
    });
    expect(await ask(s, 'room:join', { code: 'toolong', name: 'X' })).toMatchObject({ ok: false });
  });

  it('reconnect: token restores the seat and returns the live snapshot', async () => {
    const host = client();
    const guest = client();
    const created = await ask(host, 'room:create', { name: 'Ana' });
    const joined = await ask(guest, 'room:join', { code: created.code, name: 'Ben' });
    await ask(host, 'room:start', {});

    guest.disconnect();
    const phoenix = client();
    const back = await ask(phoenix, 'room:rejoin', { code: created.code, token: joined.token });
    expect(back.ok).toBe(true);
    expect(back.playerId).toBe(joined.playerId);
    expect(back.snapshot.players).toHaveLength(2);

    expect(
      await ask(client(), 'room:rejoin', { code: created.code, token: 'bad-token' })
    ).toMatchObject({ ok: false });
  });
});
