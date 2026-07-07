import {
  CITIES,
  isCityId,
  type CityId,
  type DiseaseColor,
  type GameEvent,
  type PlayerAction,
} from '@zero-patients/shared';
import {
  CARDS_TO_CURE,
  CARDS_TO_CURE_SCIENTIST,
  HAND_LIMIT,
  MAX_STATIONS,
  CUBES_PER_COLOR,
  currentPlayer,
  type GameState,
  type PlayerState,
} from './state.js';
import { addCubes, infectStep, resolveEpidemic } from './infection.js';

export type ApplyResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: string };

const fail = (error: string): ApplyResult => ({ ok: false, error });

/**
 * The authoritative rules reducer. Validates and applies one player action,
 * returning the next state and the events that occurred (for animation).
 * The input state is never mutated.
 */
export function applyAction(prev: GameState, playerId: string, action: PlayerAction): ApplyResult {
  if (prev.result) return fail('the game is over');

  const state = structuredClone(prev);
  const events: GameEvent[] = [];
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return fail(`unknown player: ${playerId}`);

  // a pending over-limit discard blocks everything else
  if (state.pendingDiscard) {
    if (action.type !== 'discard') return fail(`${state.pendingDiscard} must discard first`);
    if (playerId !== state.pendingDiscard) return fail('not your discard');
    return applyDiscard(state, player, action.card, events);
  }
  if (action.type === 'discard') return fail('no discard is pending');

  if (currentPlayer(state).id !== playerId) return fail('not your turn');

  const err = applyPlayerAction(state, player, action, events);
  if (err) return fail(err);

  spendAction(state, events);
  return { ok: true, state, events };
}

// ---------- individual actions ----------

function applyPlayerAction(
  state: GameState,
  player: PlayerState,
  action: PlayerAction,
  events: GameEvent[]
): string | null {
  switch (action.type) {
    case 'drive': {
      if (!isCityId(action.to)) return `unknown city: ${action.to}`;
      const neighbors = CITIES[player.location].neighbors as readonly string[];
      if (!neighbors.includes(action.to)) return `${action.to} is not adjacent to ${player.location}`;
      moveTo(state, player, action.to, events);
      return null;
    }
    case 'direct-flight': {
      if (!isCityId(action.to)) return `unknown city: ${action.to}`;
      if (action.to === player.location) return 'you are already there';
      if (!discardFromHand(state, player, action.to)) return `you do not hold the ${action.to} card`;
      moveTo(state, player, action.to, events);
      return null;
    }
    case 'charter-flight': {
      if (!isCityId(action.to)) return `unknown city: ${action.to}`;
      if (action.to === player.location) return 'you are already there';
      if (!discardFromHand(state, player, player.location)) return `you do not hold the ${player.location} card`;
      moveTo(state, player, action.to, events);
      return null;
    }
    case 'shuttle-flight': {
      if (!isCityId(action.to)) return `unknown city: ${action.to}`;
      if (action.to === player.location) return 'you are already there';
      if (!state.researchStations.includes(player.location)) return 'no research station here';
      if (!state.researchStations.includes(action.to)) return `no research station in ${action.to}`;
      moveTo(state, player, action.to, events);
      return null;
    }
    case 'treat': {
      const city = player.location;
      const present = state.cubes[city][action.color];
      if (present === 0) return `no ${action.color} cubes in ${city}`;
      // medic clears all cubes of the color; anyone does if the disease is cured
      const removed =
        player.role === 'medic' || state.cures[action.color] !== 'active' ? present : 1;
      removeCubes(state, city, action.color, removed, events);
      return null;
    }
    case 'build-station': {
      const city = player.location;
      if (state.researchStations.includes(city)) return `there is already a station in ${city}`;
      // operations expert builds for free; everyone else discards the city card
      if (player.role !== 'operations-expert') {
        if (!discardFromHand(state, player, city)) return `you do not hold the ${city} card`;
      }
      if (state.researchStations.length >= MAX_STATIONS) {
        const moved = state.researchStations.shift()!;
        events.push({ type: 'station-relocated', from: moved, to: city });
      }
      state.researchStations.push(city);
      events.push({ type: 'station-built', city });
      return null;
    }
    case 'share-knowledge': {
      const other = state.players.find((p) => p.id === action.withPlayer);
      if (!other) return `unknown player: ${action.withPlayer}`;
      if (other.id === player.id) return 'cannot share with yourself';
      if (other.location !== player.location) return 'you must be in the same city';
      if (!isCityId(action.city)) return `unknown city: ${action.city}`;

      const [giver, receiver] = action.direction === 'give' ? [player, other] : [other, player];
      // only the current city's card may change hands — unless the giver is the researcher
      if (action.city !== player.location && giver.role !== 'researcher')
        return 'only the card matching your current city can be shared';
      const idx = giver.hand.indexOf(action.city);
      if (idx === -1) return `${giver.name} does not hold the ${action.city} card`;

      giver.hand.splice(idx, 1);
      receiver.hand.push(action.city);
      events.push({ type: 'card-shared', from: giver.id, to: receiver.id, city: action.city });
      if (receiver.hand.length > HAND_LIMIT) state.pendingDiscard = receiver.id;
      return null;
    }
    case 'discover-cure': {
      if (state.cures[action.color] !== 'active') return `${action.color} is already cured`;
      if (!state.researchStations.includes(player.location)) return 'you must be at a research station';
      const needed = player.role === 'scientist' ? CARDS_TO_CURE_SCIENTIST : CARDS_TO_CURE;
      if (action.cards.length !== needed) return `you must discard exactly ${needed} ${action.color} city cards`;
      for (const c of action.cards) {
        if (!isCityId(c) || CITIES[c].color !== action.color) return `${c} is not a ${action.color} city card`;
        if (!player.hand.includes(c)) return `you do not hold the ${c} card`;
      }
      if (new Set(action.cards).size !== action.cards.length) return 'duplicate cards';

      for (const c of action.cards) discardFromHand(state, player, c as CityId);
      state.cures[action.color] = 'cured';
      events.push({ type: 'cure-discovered', color: action.color });
      checkEradicated(state, action.color, events);

      // a medic standing in an infected city clears it the moment the cure lands
      for (const p of state.players)
        if (p.role === 'medic') medicSweep(state, p, events);

      if (Object.values(state.cures).every((c) => c !== 'active')) {
        state.result = { result: 'won', reason: 'all four diseases cured' };
        events.push({ type: 'game-over', result: 'won', reason: state.result.reason });
      }
      return null;
    }
    case 'pass': {
      state.actionsLeft = 1; // spendAction below takes it to 0
      return null;
    }
    case 'discard':
      return 'no discard is pending'; // handled earlier; unreachable
  }
}

// ---------- helpers ----------

function moveTo(state: GameState, player: PlayerState, to: CityId, events: GameEvent[]): void {
  player.location = to;
  events.push({ type: 'moved', player: player.id, to });
  if (player.role === 'medic') medicSweep(state, player, events);
}

/** Medic auto-removes all cubes of every cured disease in their city. */
function medicSweep(state: GameState, medic: PlayerState, events: GameEvent[]): void {
  for (const color of ['blue', 'yellow', 'black', 'red'] as const) {
    if (state.cures[color] === 'active') continue;
    const present = state.cubes[medic.location][color];
    if (present > 0) removeCubes(state, medic.location, color, present, events);
  }
}

function removeCubes(
  state: GameState,
  city: CityId,
  color: DiseaseColor,
  amount: number,
  events: GameEvent[]
): void {
  state.cubes[city][color] -= amount;
  state.cubesLeft[color] += amount;
  events.push({ type: 'treated', city, color, removed: amount });
  checkEradicated(state, color, events);
}

function checkEradicated(state: GameState, color: DiseaseColor, events: GameEvent[]): void {
  if (state.cures[color] === 'cured' && state.cubesLeft[color] === CUBES_PER_COLOR) {
    state.cures[color] = 'eradicated';
    events.push({ type: 'disease-eradicated', color });
  }
}

function discardFromHand(state: GameState, player: PlayerState, city: CityId): boolean {
  const idx = player.hand.indexOf(city);
  if (idx === -1) return false;
  player.hand.splice(idx, 1);
  state.playerDiscard.push({ kind: 'city', city });
  return true;
}

// ---------- turn flow ----------

function spendAction(state: GameState, events: GameEvent[]): void {
  if (state.result) return;
  state.actionsLeft -= 1;
  if (state.actionsLeft > 0 || state.pendingDiscard) return;
  endOfActions(state, events);
}

/** Draw 2 player cards (resolving epidemics), then hand limit, then infect. */
function endOfActions(state: GameState, events: GameEvent[]): void {
  const player = currentPlayer(state);
  state.hasDrawn = true;

  for (let i = 0; i < 2; i++) {
    const card = state.playerDeck.shift();
    if (!card) {
      state.result = { result: 'lost', reason: 'the player deck ran out — your team ran out of time' };
      events.push({ type: 'game-over', result: 'lost', reason: state.result.reason });
      return;
    }
    if (card.kind === 'epidemic') {
      state.playerDiscard.push(card);
      resolveEpidemic(state, events);
      if (state.result) return;
    } else {
      player.hand.push(card.city as CityId);
      events.push({ type: 'card-drawn', player: player.id });
    }
  }

  if (player.hand.length > HAND_LIMIT) {
    state.pendingDiscard = player.id;
    return; // infect step + turn advance resume after the discard
  }
  finishTurn(state, events);
}

function applyDiscard(
  state: GameState,
  player: PlayerState,
  card: string,
  events: GameEvent[]
): ApplyResult {
  if (!isCityId(card) || !discardFromHand(state, player, card))
    return fail(`you do not hold the ${card} card`);
  if (player.hand.length > HAND_LIMIT) return { ok: true, state, events }; // still over — discard again

  state.pendingDiscard = null;
  // resume wherever the turn was interrupted: a mid-turn overdraw (share-knowledge)
  // just continues; an overdraw on the final action still owes the draw phase;
  // an overdraw after drawing owes the infect step
  if (state.actionsLeft === 0) {
    if (state.hasDrawn) finishTurn(state, events);
    else endOfActions(state, events);
  }
  return { ok: true, state, events };
}

function finishTurn(state: GameState, events: GameEvent[]): void {
  infectStep(state, events);
  if (state.result) return;
  state.turnPlayerIndex = (state.turnPlayerIndex + 1) % state.players.length;
  state.actionsLeft = 4;
  state.hasDrawn = false;
  state.turnNumber += 1;
  events.push({ type: 'turn-started', player: currentPlayer(state).id });
}
