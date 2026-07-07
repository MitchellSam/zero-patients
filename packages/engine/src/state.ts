import {
  CITIES,
  CITY_IDS,
  type Card,
  type CityId,
  type DiseaseColor,
  type GamePhase,
  type Role,
} from '@zero-patients/shared';
import { shuffle } from './rng.js';

export const HAND_LIMIT = 7;
export const CUBES_PER_COLOR = 24;
export const MAX_STATIONS = 6;
export const MAX_OUTBREAKS = 8;
export const INFECTION_RATE_TRACK = [2, 2, 2, 3, 3, 4, 4] as const;
export const CARDS_TO_CURE = 5;
export const CARDS_TO_CURE_SCIENTIST = 4;

export type CureStatus = 'active' | 'cured' | 'eradicated';

export interface PlayerState {
  id: string;
  name: string;
  role: Role;
  location: CityId;
  hand: CityId[]; // only city cards live in hands (events come later)
}

export interface GameResult {
  result: 'won' | 'lost';
  reason: string;
}

export interface GameState {
  rngState: number;
  phase: GamePhase;
  /** set while a player is over the hand limit; blocks everything else */
  pendingDiscard: string | null;
  turnPlayerIndex: number;
  actionsLeft: number;
  /** true once the current player has drawn their 2 cards this turn */
  hasDrawn: boolean;
  turnNumber: number;
  players: PlayerState[];
  playerDeck: Card[]; // index 0 = top
  playerDiscard: Card[];
  infectionDeck: CityId[]; // index 0 = top, last = bottom
  infectionDiscard: CityId[];
  cubes: Record<CityId, Record<DiseaseColor, number>>;
  cubesLeft: Record<DiseaseColor, number>;
  cures: Record<DiseaseColor, CureStatus>;
  researchStations: CityId[];
  outbreaks: number;
  infectionRateIndex: number;
  result: GameResult | null;
}

export interface GameConfig {
  seed: number;
  players: { id: string; name: string; role?: Role }[];
  /** number of epidemic cards: 4 easy, 5 normal, 6 heroic */
  epidemics?: 4 | 5 | 6;
}

export const infectionRate = (s: GameState): number =>
  INFECTION_RATE_TRACK[Math.min(s.infectionRateIndex, INFECTION_RATE_TRACK.length - 1)]!;

export const currentPlayer = (s: GameState): PlayerState => s.players[s.turnPlayerIndex]!;

const STARTING_HAND_BY_PLAYER_COUNT: Record<number, number> = { 2: 4, 3: 3, 4: 2 };

const ALL_ROLES: Role[] = ['medic', 'scientist', 'researcher', 'operations-expert'];

export function createGame(config: GameConfig): GameState {
  const playerCount = config.players.length;
  const startingHand = STARTING_HAND_BY_PLAYER_COUNT[playerCount];
  if (!startingHand) throw new Error(`unsupported player count: ${playerCount}`);
  const epidemics = config.epidemics ?? 5;

  let rngState = config.seed | 0;

  // assign roles: honor explicit picks, deal the rest randomly without repeats
  const taken = new Set(config.players.map((p) => p.role).filter(Boolean));
  const pool = shuffle(ALL_ROLES.filter((r) => !taken.has(r)), rngState);
  rngState = pool.state;
  const roles = pool.items;

  // infection deck: shuffle all 48 city cards
  const infDeck = shuffle(CITY_IDS, rngState);
  rngState = infDeck.state;
  const infectionDeck = infDeck.items;

  // initial infections: 3 cities get 3 cubes, 3 get 2, 3 get 1
  const cubes = Object.fromEntries(
    CITY_IDS.map((id) => [id, { blue: 0, yellow: 0, black: 0, red: 0 }])
  ) as GameState['cubes'];
  const cubesLeft: Record<DiseaseColor, number> = { blue: CUBES_PER_COLOR, yellow: CUBES_PER_COLOR, black: CUBES_PER_COLOR, red: CUBES_PER_COLOR };
  const infectionDiscard: CityId[] = [];
  for (let i = 0; i < 9; i++) {
    const city = infectionDeck.shift()!;
    const amount = 3 - Math.floor(i / 3);
    const color = CITIES[city].color;
    cubes[city][color] = amount;
    cubesLeft[color] -= amount;
    infectionDiscard.push(city);
  }

  // player deck: shuffle city cards, deal hands, then split into `epidemics`
  // piles, bury one epidemic in each, and stack them (bottom pile last)
  const cityCards = shuffle(CITY_IDS, rngState);
  rngState = cityCards.state;
  const dealPile = cityCards.items;

  const players: PlayerState[] = config.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    role: p.role ?? roles[i % roles.length]!,
    location: 'atlanta',
    hand: [],
  }));
  for (let round = 0; round < startingHand; round++)
    for (const p of players) p.hand.push(dealPile.shift()!);

  const pileSize = Math.ceil(dealPile.length / epidemics);
  const playerDeck: Card[] = [];
  for (let i = 0; i < epidemics; i++) {
    const pile: Card[] = dealPile
      .slice(i * pileSize, (i + 1) * pileSize)
      .map((city) => ({ kind: 'city' as const, city }));
    pile.push({ kind: 'epidemic' });
    const shuffled = shuffle(pile, rngState);
    rngState = shuffled.state;
    playerDeck.push(...shuffled.items);
  }

  return {
    rngState,
    phase: 'actions',
    pendingDiscard: null,
    turnPlayerIndex: 0,
    actionsLeft: 4,
    hasDrawn: false,
    turnNumber: 1,
    players,
    playerDeck,
    playerDiscard: [],
    infectionDeck,
    infectionDiscard,
    cubes,
    cubesLeft,
    cures: { blue: 'active', yellow: 'active', black: 'active', red: 'active' },
    researchStations: ['atlanta'],
    outbreaks: 0,
    infectionRateIndex: 0,
    result: null,
  };
}
