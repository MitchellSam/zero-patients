import { CITIES, type CityId, type DiseaseColor, type GameEvent } from '@zero-patients/shared';
import { MAX_OUTBREAKS, infectionRate, type GameState } from './state.js';
import { shuffle } from './rng.js';

/**
 * Place cubes on a city, resolving outbreak chains. A city may only outbreak
 * once per card resolution (`erupted` tracks that). Mutates `state`.
 */
export function addCubes(
  state: GameState,
  city: CityId,
  color: DiseaseColor,
  amount: number,
  events: GameEvent[],
  erupted: Set<CityId> = new Set()
): void {
  if (state.result) return;
  if (state.cures[color] === 'eradicated') return; // no effect once eradicated

  const current = state.cubes[city][color];
  const toPlace = Math.min(amount, 3 - current);

  if (toPlace > 0) {
    if (state.cubesLeft[color] < toPlace) {
      state.result = { result: 'lost', reason: `the ${color} disease spread beyond control` };
      events.push({ type: 'game-over', result: 'lost', reason: state.result.reason });
      return;
    }
    state.cubes[city][color] = current + toPlace;
    state.cubesLeft[color] -= toPlace;
    events.push({ type: 'infected', city, color, cubes: state.cubes[city][color] });
  }

  // any cube that would exceed 3 triggers an outbreak instead
  if (current + amount > 3 && !erupted.has(city)) {
    erupted.add(city);
    state.outbreaks += 1;
    events.push({ type: 'outbreak', city, color });
    if (state.outbreaks >= MAX_OUTBREAKS) {
      state.result = { result: 'lost', reason: 'worldwide panic — 8 outbreaks' };
      events.push({ type: 'game-over', result: 'lost', reason: state.result.reason });
      return;
    }
    for (const neighbor of CITIES[city].neighbors) {
      addCubes(state, neighbor as CityId, color, 1, events, erupted);
      if (state.result) return;
    }
  }
}

/** End-of-turn infection step: draw `infectionRate` cards. */
export function infectStep(state: GameState, events: GameEvent[]): void {
  for (let i = 0; i < infectionRate(state); i++) {
    if (state.result) return;
    const city = state.infectionDeck.shift();
    if (!city) return;
    state.infectionDiscard.push(city);
    addCubes(state, city, CITIES[city].color, 1, events);
  }
}

/** Epidemic: increase, infect (bottom card, 3 cubes), intensify. */
export function resolveEpidemic(state: GameState, events: GameEvent[]): void {
  state.infectionRateIndex += 1;

  const city = state.infectionDeck.pop(); // bottom card
  if (city) {
    events.push({ type: 'epidemic', city });
    state.infectionDiscard.push(city);
    addCubes(state, city, CITIES[city].color, 3, events);
    if (state.result) return;
  }

  // intensify: shuffle the discard pile and put it on top of the deck
  const reshuffled = shuffle(state.infectionDiscard, state.rngState);
  state.rngState = reshuffled.state;
  state.infectionDeck.unshift(...reshuffled.items);
  state.infectionDiscard = [];
  events.push({ type: 'infection-deck-reshuffled' });
}
