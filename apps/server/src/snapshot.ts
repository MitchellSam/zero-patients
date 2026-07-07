import type { GameSnapshot } from '@zero-patients/shared';
import { infectionRate, type GameState } from '@zero-patients/engine';

/**
 * Public wire form of the game state. Pandemic is open-information, so hands
 * and discards are visible — but deck order and RNG state never leave the server.
 */
export function toSnapshot(state: GameState): GameSnapshot {
  return {
    phase: state.phase,
    pendingDiscard: state.pendingDiscard,
    turnPlayerIndex: state.turnPlayerIndex,
    actionsLeft: state.actionsLeft,
    turnNumber: state.turnNumber,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      location: p.location,
      hand: [...p.hand],
    })),
    playerDeckCount: state.playerDeck.length,
    playerDiscard: structuredClone(state.playerDiscard),
    infectionDeckCount: state.infectionDeck.length,
    infectionDiscard: [...state.infectionDiscard],
    cubes: structuredClone(state.cubes),
    cubesLeft: { ...state.cubesLeft },
    cures: { ...state.cures },
    researchStations: [...state.researchStations],
    outbreaks: state.outbreaks,
    infectionRate: infectionRate(state),
    infectionRateIndex: state.infectionRateIndex,
    result: state.result ? { ...state.result } : null,
  };
}
