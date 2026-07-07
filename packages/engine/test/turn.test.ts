import { describe, expect, it } from 'vitest';
import { CITIES, type CityId } from '@zero-patients/shared';
import { infectionRate } from '../src/index.js';
import { citiesOfColor, must, mustFail, newGame } from './helpers.js';

/** Burn n actions with drive/pass so the turn advances deterministically. */
const passTurn = (s: ReturnType<typeof newGame>, playerId: string) =>
  must(s, playerId, { type: 'pass' });

describe('turn flow', () => {
  it('after 4 actions: draws 2 cards, infects, and passes the turn', () => {
    const s = newGame();
    const deckBefore = s.playerDeck.length;
    const infDeckBefore = s.infectionDeck.length;

    let g = must(s, 'p1', { type: 'drive', to: 'chicago' });
    g = must(g, 'p1', { type: 'drive', to: 'atlanta' });
    g = must(g, 'p1', { type: 'drive', to: 'chicago' });
    g = must(g, 'p1', { type: 'drive', to: 'atlanta' });

    expect(g.players[0]!.hand).toHaveLength(2); // started empty (cleared board)
    expect(g.playerDeck).toHaveLength(deckBefore - 2);
    expect(g.infectionDeck).toHaveLength(infDeckBefore - infectionRate(g));
    expect(g.turnPlayerIndex).toBe(1);
    expect(g.actionsLeft).toBe(4);
    expect(g.turnNumber).toBe(2);
  });

  it('pass forfeits remaining actions', () => {
    const s = newGame();
    const g = passTurn(s, 'p1');
    expect(g.turnPlayerIndex).toBe(1);
  });

  it('the infection step places one cube per drawn card', () => {
    const s = newGame();
    const next3: CityId[] = s.infectionDeck.slice(0, infectionRate(s)) as CityId[];
    const g = passTurn(s, 'p1');
    for (const city of next3.slice(0, infectionRate(s)))
      expect(g.cubes[city][CITIES[city].color], city).toBe(1);
  });

  it('forces a discard when drawing past the hand limit, then infects', () => {
    const s = newGame();
    s.players[0]!.hand = citiesOfColor('black', 6);
    const infDeckBefore = s.infectionDeck.length;

    const over = passTurn(s, 'p1'); // draws to 8
    expect(over.pendingDiscard).toBe('p1');
    expect(over.infectionDeck).toHaveLength(infDeckBefore); // infect step is on hold
    expect(mustFail(over, 'p2', { type: 'drive', to: 'chicago' })).toMatch(/must discard/);

    const done = must(over, 'p1', { type: 'discard', card: over.players[0]!.hand[0]! });
    expect(done.pendingDiscard).toBeNull();
    expect(done.players[0]!.hand).toHaveLength(7);
    expect(done.infectionDeck).toHaveLength(infDeckBefore - infectionRate(done));
    expect(done.turnPlayerIndex).toBe(1);
  });

  it('loses when the player deck runs out', () => {
    const s = newGame();
    s.playerDeck = [{ kind: 'city', city: 'tokyo' }];
    const g = passTurn(s, 'p1');
    expect(g.result?.result).toBe('lost');
    expect(g.result?.reason).toMatch(/player deck/);
  });

  it('resolves epidemics drawn from the player deck', () => {
    const s = newGame();
    const bottom = s.infectionDeck.at(-1)!;
    s.playerDeck = [{ kind: 'epidemic' }, { kind: 'city', city: 'tokyo' }, ...s.playerDeck];

    const g = passTurn(s, 'p1');
    expect(g.infectionRateIndex).toBe(1);
    // bottom infection card got 3 cubes of its color
    expect(g.cubes[bottom][CITIES[bottom].color]).toBeGreaterThanOrEqual(1);
    // the epidemic card goes to the player discard, the city card to the hand
    expect(g.playerDiscard.some((c) => c.kind === 'epidemic')).toBe(true);
    expect(g.players[0]!.hand).toContain('tokyo');
  });

  it('rejects all actions once the game is over', () => {
    const s = newGame();
    s.result = { result: 'lost', reason: 'test' };
    expect(mustFail(s, 'p1', { type: 'drive', to: 'chicago' })).toBe('the game is over');
  });

  it('does not mutate the input state', () => {
    const s = newGame();
    const frozen = JSON.stringify(s);
    must(s, 'p1', { type: 'drive', to: 'chicago' });
    expect(JSON.stringify(s)).toBe(frozen);
  });
});
