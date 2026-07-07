import { describe, expect, it } from 'vitest';
import { CITIES, CITY_IDS } from '@zero-patients/shared';
import { createGame, CUBES_PER_COLOR } from '../src/index.js';

const config = (n: number) => ({
  seed: 7,
  players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` })),
});

describe('city data', () => {
  it('has 48 cities, 12 per color, with symmetric adjacency', () => {
    expect(CITY_IDS).toHaveLength(48);
    const byColor = { blue: 0, yellow: 0, black: 0, red: 0 };
    for (const id of CITY_IDS) byColor[CITIES[id].color]++;
    expect(byColor).toEqual({ blue: 12, yellow: 12, black: 12, red: 12 });
    for (const id of CITY_IDS)
      for (const n of CITIES[id].neighbors)
        expect(CITIES[n as keyof typeof CITIES].neighbors, `${n} ~ ${id}`).toContain(id);
  });
});

describe('createGame', () => {
  it('deals hands by player count', () => {
    expect(createGame(config(2)).players.map((p) => p.hand.length)).toEqual([4, 4]);
    expect(createGame(config(3)).players.map((p) => p.hand.length)).toEqual([3, 3, 3]);
    expect(createGame(config(4)).players.map((p) => p.hand.length)).toEqual([2, 2, 2, 2]);
  });

  it('infects 9 cities: 3 with 3 cubes, 3 with 2, 3 with 1', () => {
    const s = createGame(config(4));
    const counts = CITY_IDS.map((c) => Object.values(s.cubes[c]).reduce((a, b) => a + b, 0))
      .filter((n) => n > 0)
      .sort();
    expect(counts).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    expect(s.infectionDiscard).toHaveLength(9);
    expect(s.infectionDeck).toHaveLength(48 - 9);
    // supply accounts for placed cubes
    const placed = { blue: 0, yellow: 0, black: 0, red: 0 };
    for (const c of CITY_IDS)
      for (const col of ['blue', 'yellow', 'black', 'red'] as const) placed[col] += s.cubes[c][col];
    for (const col of ['blue', 'yellow', 'black', 'red'] as const)
      expect(s.cubesLeft[col]).toBe(CUBES_PER_COLOR - placed[col]);
  });

  it('builds the player deck with evenly distributed epidemics', () => {
    const s = createGame({ ...config(4), epidemics: 5 });
    const deck = s.playerDeck;
    // 48 city cards - 8 dealt + 5 epidemics
    expect(deck).toHaveLength(45);
    expect(deck.filter((c) => c.kind === 'epidemic')).toHaveLength(5);
    // exactly one epidemic per stacked pile
    const pileSize = Math.ceil(40 / 5) + 1;
    for (let i = 0; i < 5; i++) {
      const pile = deck.slice(i * pileSize, (i + 1) * pileSize);
      expect(pile.filter((c) => c.kind === 'epidemic'), `pile ${i}`).toHaveLength(1);
    }
  });

  it('assigns unique roles and honors explicit picks', () => {
    const s = createGame({
      seed: 7,
      players: [
        { id: 'a', name: 'A', role: 'medic' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
        { id: 'd', name: 'D' },
      ],
    });
    expect(s.players[0]!.role).toBe('medic');
    expect(new Set(s.players.map((p) => p.role)).size).toBe(4);
  });

  it('is deterministic for a given seed', () => {
    const a = createGame(config(4));
    const b = createGame(config(4));
    expect(a).toEqual(b);
  });

  it('starts everyone in atlanta with a research station', () => {
    const s = createGame(config(2));
    expect(s.players.every((p) => p.location === 'atlanta')).toBe(true);
    expect(s.researchStations).toEqual(['atlanta']);
  });
});
