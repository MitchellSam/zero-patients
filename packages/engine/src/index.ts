export { applyAction, type ApplyResult } from './apply.js';
export {
  createGame,
  currentPlayer,
  infectionRate,
  HAND_LIMIT,
  CUBES_PER_COLOR,
  MAX_STATIONS,
  MAX_OUTBREAKS,
  INFECTION_RATE_TRACK,
  CARDS_TO_CURE,
  CARDS_TO_CURE_SCIENTIST,
  type GameState,
  type GameConfig,
  type PlayerState,
  type GameResult,
  type CureStatus,
} from './state.js';
export { addCubes, infectStep, resolveEpidemic } from './infection.js';
