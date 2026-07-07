import type { DiseaseColor, GameEvent } from '@zero-patients/shared';
import { CITIES, type CityId } from '@zero-patients/shared';

export const DISEASE_COLORS: Record<DiseaseColor, string> = {
  blue: '#38bdf8',
  yellow: '#fbbf24',
  black: '#a78bfa',
  red: '#f43f5e',
};

export const PLAYER_COLORS = ['#2dd4bf', '#fb923c', '#f472b6', '#a3e635'];

export const cityName = (id: string): string =>
  (CITIES as Record<string, { name: string }>)[id]?.name ?? id;

export const cityColor = (id: string): string => DISEASE_COLORS[CITIES[id as CityId].color];

export function describeEvent(e: GameEvent, playerName: (id: string) => string): string {
  switch (e.type) {
    case 'moved': return `${playerName(e.player)} → ${cityName(e.to)}`;
    case 'treated': return `${cityName(e.city)} treated −${e.removed} ${e.color}`;
    case 'station-built': return `research station built in ${cityName(e.city)}`;
    case 'station-relocated': return `station moved ${cityName(e.from)} → ${cityName(e.to)}`;
    case 'card-shared': return `${playerName(e.from)} gave ${cityName(e.city)} to ${playerName(e.to)}`;
    case 'cure-discovered': return `CURE DISCOVERED — ${e.color}`;
    case 'disease-eradicated': return `${e.color} ERADICATED`;
    case 'card-drawn': return `${playerName(e.player)} drew a card`;
    case 'epidemic': return `EPIDEMIC — ${cityName(e.city)}`;
    case 'infected': return `${cityName(e.city)} infected (${e.cubes})`;
    case 'outbreak': return `OUTBREAK in ${cityName(e.city)}`;
    case 'infection-deck-reshuffled': return 'infection deck reshuffled';
    case 'turn-started': return `${playerName(e.player)}'s turn`;
    case 'game-over': return e.result === 'won' ? `VICTORY — ${e.reason}` : `DEFEAT — ${e.reason}`;
  }
}
