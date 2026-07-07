import { io, type Socket } from 'socket.io-client';

const URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? 'http://localhost:3001';

export const socket: Socket = io(URL, { transports: ['websocket'] });

export type Ok<T> = { ok: true } & T;
export type Err = { ok: false; error: string };

/** emitWithAck with a timeout; network failures come back as ordinary errors. */
export async function ask<T>(event: string, payload: unknown): Promise<Ok<T> | Err> {
  try {
    return (await socket.timeout(4000).emitWithAck(event, payload)) as Ok<T> | Err;
  } catch {
    return { ok: false, error: 'server not responding' };
  }
}
