import { describe, expect, it } from 'vitest';
import { CITIES, type GameEvent } from '@zero-patients/shared';
import { addCubes, resolveEpidemic, MAX_OUTBREAKS } from '../src/index.js';
import { newGame } from './helpers.js';

describe('addCubes / outbreaks', () => {
  it('places cubes and tracks supply', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    addCubes(s, 'tokyo', 'red', 2, events);
    expect(s.cubes.tokyo.red).toBe(2);
    expect(s.cubesLeft.red).toBe(22);
    expect(events).toEqual([{ type: 'infected', city: 'tokyo', color: 'red', cubes: 2 }]);
  });

  it('outbreaks at 3 cubes, spreading one to each neighbor', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    s.cubes.tokyo.red = 3;
    s.cubesLeft.red -= 3;
    addCubes(s, 'tokyo', 'red', 1, events);
    expect(s.cubes.tokyo.red).toBe(3); // capped
    expect(s.outbreaks).toBe(1);
    // every neighbor got a red cube (tokyo: osaka, san-francisco, seoul, shanghai)
    expect(s.cubes.osaka.red).toBe(1);
    expect(s.cubes['san-francisco'].red).toBe(1);
    expect(s.cubes.seoul.red).toBe(1);
    expect(s.cubes.shanghai.red).toBe(1);
  });

  it('chains outbreaks but never re-erupts the same city in one resolution', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    // tokyo and osaka both maxed: infecting tokyo chains into osaka exactly once
    s.cubes.tokyo.red = 3;
    s.cubes.osaka.red = 3;
    s.cubesLeft.red -= 6;
    addCubes(s, 'tokyo', 'red', 1, events);
    expect(s.outbreaks).toBe(2);
    const outbreaks = events.filter((e) => e.type === 'outbreak').map((e) => e.city);
    expect(outbreaks.sort()).toEqual(['osaka', 'tokyo']);
    // osaka's chain adds a second cube to tokyo's other neighbors? no — tokyo
    // erupted already, so it must NOT gain or re-spread
    expect(s.cubes.tokyo.red).toBe(3);
  });

  it('loses the game at 8 outbreaks', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    s.outbreaks = MAX_OUTBREAKS - 1;
    s.cubes.tokyo.red = 3;
    s.cubesLeft.red -= 3;
    addCubes(s, 'tokyo', 'red', 1, events);
    expect(s.result?.result).toBe('lost');
    expect(s.result?.reason).toMatch(/outbreaks/);
  });

  it('loses the game when the cube supply runs out', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    s.cubesLeft.red = 1;
    addCubes(s, 'tokyo', 'red', 2, events);
    expect(s.result?.result).toBe('lost');
  });

  it('has no effect on eradicated diseases', () => {
    const s = newGame();
    s.cures.red = 'eradicated';
    addCubes(s, 'tokyo', 'red', 3, []);
    expect(s.cubes.tokyo.red).toBe(0);
  });
});

describe('resolveEpidemic', () => {
  it('increases the rate, infects the bottom card with 3 cubes, and intensifies', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    const bottom = s.infectionDeck.at(-1)!;
    s.infectionDiscard = ['atlanta', 'chicago'];
    const discardSize = s.infectionDeck.length; // after popping bottom, +3 discards back on top

    resolveEpidemic(s, events);

    expect(s.infectionRateIndex).toBe(1);
    expect(Object.values(s.cubes[bottom]).reduce((a, b) => a + b, 0)).toBe(3);
    // discard pile (incl. the epidemic card) shuffled onto top of the deck
    expect(s.infectionDiscard).toEqual([]);
    expect(s.infectionDeck).toHaveLength(discardSize - 1 + 3);
    expect(s.infectionDeck.slice(0, 3).sort()).toEqual(['atlanta', bottom, 'chicago'].sort());
  });

  it('an epidemic on a city with cubes outbreaks rather than exceeding 3', () => {
    const s = newGame();
    const events: GameEvent[] = [];
    const bottom = s.infectionDeck.at(-1)!;
    const color = CITIES[bottom].color;
    s.cubes[bottom][color] = 2;
    s.cubesLeft[color] -= 2;

    resolveEpidemic(s, events);
    expect(s.cubes[bottom][color]).toBe(3);
    expect(s.outbreaks).toBe(1);
  });
});
