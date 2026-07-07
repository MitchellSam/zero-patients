import { CITIES, CITY_IDS, type CityId, type DiseaseColor, type PlayerAction } from '@zero-patients/shared';
import { applyAction, createGame, type GameState } from '../src/index.js';

export const cityOfColor = (color: DiseaseColor, skip: CityId[] = []): CityId =>
  CITY_IDS.find((c) => CITIES[c].color === color && !skip.includes(c))!;

export const citiesOfColor = (color: DiseaseColor, n: number): CityId[] =>
  CITY_IDS.filter((c) => CITIES[c].color === color).slice(0, n);

/** Two-player game with fixed roles, cleared of all randomness we care about. */
export function newGame(overrides: Partial<GameState> = {}): GameState {
  const state = createGame({
    seed: 42,
    players: [
      { id: 'p1', name: 'One', role: 'operations-expert' },
      { id: 'p2', name: 'Two', role: 'researcher' },
    ],
  });
  clearBoard(state);
  return Object.assign(state, overrides);
}

/** Remove all cubes and give both players empty hands + a long, epidemic-free deck. */
export function clearBoard(state: GameState): void {
  for (const city of CITY_IDS)
    for (const color of ['blue', 'yellow', 'black', 'red'] as const) {
      state.cubesLeft[color] += state.cubes[city][color];
      state.cubes[city][color] = 0;
    }
  for (const p of state.players) p.hand = [];
  state.playerDeck = CITY_IDS.slice(0, 40).map((city) => ({ kind: 'city', city }));
  state.infectionDeck = CITY_IDS.slice();
  state.infectionDiscard = [];
}

/** Apply an action that must succeed; returns the new state. */
export function must(state: GameState, playerId: string, action: PlayerAction): GameState {
  const r = applyAction(state, playerId, action);
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`);
  return r.state;
}

/** Apply an action that must fail; returns the error. */
export function mustFail(state: GameState, playerId: string, action: PlayerAction): string {
  const r = applyAction(state, playerId, action);
  if (r.ok) throw new Error(`expected failure for ${JSON.stringify(action)}`);
  return r.error;
}
