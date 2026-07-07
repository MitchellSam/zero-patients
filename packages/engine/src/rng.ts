// Deterministic PRNG (mulberry32). RNG state lives in GameState so games
// are fully replayable from (seed, action log).

export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0;
  let x = Math.imul(t ^ (t >>> 15), 1 | t);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return { value: ((x ^ (x >>> 14)) >>> 0) / 4294967296, state: t };
}

/** Fisher–Yates. Returns the shuffled copy and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], rngState: number): { items: T[]; state: number } {
  const out = items.slice();
  let state = rngState;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRandom(state);
    state = r.state;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return { items: out, state };
}
