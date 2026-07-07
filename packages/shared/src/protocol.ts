import { z } from 'zod';

// ---------- core enums ----------

export const DiseaseColorSchema = z.enum(['blue', 'yellow', 'black', 'red']);
export type DiseaseColor = z.infer<typeof DiseaseColorSchema>;

export const RoleSchema = z.enum(['medic', 'scientist', 'researcher', 'operations-expert']);
export type Role = z.infer<typeof RoleSchema>;

export const GamePhaseSchema = z.enum(['actions', 'discard', 'over']);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

// ---------- cards ----------

export const CardSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('city'), city: z.string() }),
  z.object({ kind: z.literal('epidemic') }),
]);
export type Card = z.infer<typeof CardSchema>;

// ---------- player actions (client -> server) ----------
// Every action is validated by the engine; the server never trusts the client.

export const PlayerActionSchema = z.discriminatedUnion('type', [
  // move to an adjacent city
  z.object({ type: z.literal('drive'), to: z.string() }),
  // discard the destination's city card to fly there
  z.object({ type: z.literal('direct-flight'), to: z.string() }),
  // discard your current city's card to fly anywhere
  z.object({ type: z.literal('charter-flight'), to: z.string() }),
  // move between research stations
  z.object({ type: z.literal('shuttle-flight'), to: z.string() }),
  // remove one cube (medic: all cubes of that color) in your city
  z.object({ type: z.literal('treat'), color: DiseaseColorSchema }),
  // discard your current city's card to build a station (ops expert: free)
  z.object({ type: z.literal('build-station') }),
  // give/take the current city's card to/from another player here
  // (researcher may give any city card)
  z.object({
    type: z.literal('share-knowledge'),
    withPlayer: z.string(),
    city: z.string(),
    direction: z.enum(['give', 'take']),
  }),
  // discard 5 matching city cards (scientist: 4) at a research station
  z.object({ type: z.literal('discover-cure'), color: DiseaseColorSchema, cards: z.array(z.string()) }),
  // forfeit remaining actions and go to the draw/infect steps
  z.object({ type: z.literal('pass') }),
  // required when over the hand limit at end of turn
  z.object({ type: z.literal('discard'), card: z.string() }),
]);
export type PlayerAction = z.infer<typeof PlayerActionSchema>;

// ---------- game events (server -> clients, drives board animation) ----------

export const GameEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('moved'), player: z.string(), to: z.string() }),
  z.object({ type: z.literal('treated'), city: z.string(), color: DiseaseColorSchema, removed: z.number() }),
  z.object({ type: z.literal('station-built'), city: z.string() }),
  z.object({ type: z.literal('station-relocated'), from: z.string(), to: z.string() }),
  z.object({ type: z.literal('card-shared'), from: z.string(), to: z.string(), city: z.string() }),
  z.object({ type: z.literal('cure-discovered'), color: DiseaseColorSchema }),
  z.object({ type: z.literal('disease-eradicated'), color: DiseaseColorSchema }),
  z.object({ type: z.literal('card-drawn'), player: z.string() }),
  z.object({ type: z.literal('epidemic'), city: z.string() }),
  z.object({ type: z.literal('infected'), city: z.string(), color: DiseaseColorSchema, cubes: z.number() }),
  z.object({ type: z.literal('outbreak'), city: z.string(), color: DiseaseColorSchema }),
  z.object({ type: z.literal('infection-deck-reshuffled') }),
  z.object({ type: z.literal('turn-started'), player: z.string() }),
  z.object({ type: z.literal('game-over'), result: z.enum(['won', 'lost']), reason: z.string() }),
]);
export type GameEvent = z.infer<typeof GameEventSchema>;
