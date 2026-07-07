import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/index.js';
import { citiesOfColor, must, mustFail, newGame } from './helpers.js';

describe('movement', () => {
  it('drive requires adjacency', () => {
    const s = newGame();
    expect(mustFail(s, 'p1', { type: 'drive', to: 'tokyo' })).toMatch(/not adjacent/);
    const next = must(s, 'p1', { type: 'drive', to: 'chicago' });
    expect(next.players[0]!.location).toBe('chicago');
    expect(next.actionsLeft).toBe(3);
  });

  it('direct flight discards the destination card', () => {
    const s = newGame();
    s.players[0]!.hand = ['tokyo'];
    const next = must(s, 'p1', { type: 'direct-flight', to: 'tokyo' });
    expect(next.players[0]!.location).toBe('tokyo');
    expect(next.players[0]!.hand).toEqual([]);
    expect(next.playerDiscard.at(-1)).toEqual({ kind: 'city', city: 'tokyo' });
    expect(mustFail(s, 'p1', { type: 'direct-flight', to: 'paris' })).toMatch(/do not hold/);
  });

  it('charter flight discards the current city card and goes anywhere', () => {
    const s = newGame();
    s.players[0]!.hand = ['atlanta'];
    const next = must(s, 'p1', { type: 'charter-flight', to: 'sydney' });
    expect(next.players[0]!.location).toBe('sydney');
    expect(next.players[0]!.hand).toEqual([]);
  });

  it('shuttle flight needs stations at both ends', () => {
    const s = newGame();
    expect(mustFail(s, 'p1', { type: 'shuttle-flight', to: 'tokyo' })).toMatch(/no research station/);
    s.researchStations = ['atlanta', 'tokyo'];
    const next = must(s, 'p1', { type: 'shuttle-flight', to: 'tokyo' });
    expect(next.players[0]!.location).toBe('tokyo');
  });

  it('rejects out-of-turn actions', () => {
    const s = newGame();
    expect(mustFail(s, 'p2', { type: 'drive', to: 'chicago' })).toBe('not your turn');
  });
});

describe('treat', () => {
  it('removes one cube, or all when the disease is cured', () => {
    const s = newGame();
    s.cubes.atlanta.blue = 3;
    s.cubesLeft.blue -= 3;
    const once = must(s, 'p1', { type: 'treat', color: 'blue' });
    expect(once.cubes.atlanta.blue).toBe(2);

    s.cures.blue = 'cured';
    const all = must(s, 'p1', { type: 'treat', color: 'blue' });
    expect(all.cubes.atlanta.blue).toBe(0);
  });

  it('medic removes all cubes even before a cure', () => {
    const s = newGame();
    s.players[0]!.role = 'medic';
    s.cubes.atlanta.red = 3;
    s.cubesLeft.red -= 3;
    const next = must(s, 'p1', { type: 'treat', color: 'red' });
    expect(next.cubes.atlanta.red).toBe(0);
  });

  it('medic auto-clears cured diseases on entering a city', () => {
    const s = newGame();
    s.players[0]!.role = 'medic';
    s.cures.blue = 'cured';
    s.cubes.chicago.blue = 2;
    s.cubesLeft.blue -= 2;
    const next = must(s, 'p1', { type: 'drive', to: 'chicago' });
    expect(next.cubes.chicago.blue).toBe(0);
  });

  it('treating the last cured cube eradicates the disease', () => {
    const s = newGame();
    s.cures.blue = 'cured';
    s.cubes.atlanta.blue = 1;
    s.cubesLeft.blue -= 1;
    const next = must(s, 'p1', { type: 'treat', color: 'blue' });
    expect(next.cures.blue).toBe('eradicated');
  });
});

describe('build-station', () => {
  it('requires the city card, except for the operations expert', () => {
    const s = newGame();
    s.players[0]!.role = 'scientist';
    s.players[0]!.location = 'tokyo';
    expect(mustFail(s, 'p1', { type: 'build-station' })).toMatch(/do not hold/);
    s.players[0]!.hand = ['tokyo'];
    expect(must(s, 'p1', { type: 'build-station' }).researchStations).toContain('tokyo');

    const ops = newGame();
    ops.players[0]!.location = 'tokyo'; // ops expert, empty hand
    expect(must(ops, 'p1', { type: 'build-station' }).researchStations).toContain('tokyo');
  });

  it('relocates the oldest station when building a 7th', () => {
    const s = newGame(); // p1 is the ops expert — builds for free
    s.researchStations = ['atlanta', 'tokyo', 'paris', 'lima', 'cairo', 'sydney'];
    s.players[0]!.location = 'moscow';
    const next = must(s, 'p1', { type: 'build-station' });
    expect(next.researchStations).toHaveLength(6);
    expect(next.researchStations).toContain('moscow');
    expect(next.researchStations).not.toContain('atlanta');
  });

  it('rejects building where a station exists', () => {
    const s = newGame();
    expect(mustFail(s, 'p1', { type: 'build-station' })).toMatch(/already a station/);
  });
});

describe('share-knowledge', () => {
  it('passes the current city card between co-located players', () => {
    const s = newGame();
    s.players[0]!.hand = ['atlanta'];
    const next = must(s, 'p1', {
      type: 'share-knowledge', withPlayer: 'p2', city: 'atlanta', direction: 'give',
    });
    expect(next.players[0]!.hand).toEqual([]);
    expect(next.players[1]!.hand).toEqual(['atlanta']);
  });

  it('rejects non-matching cities unless the giver is the researcher', () => {
    const s = newGame();
    s.players[0]!.hand = ['tokyo'];
    expect(
      mustFail(s, 'p1', { type: 'share-knowledge', withPlayer: 'p2', city: 'tokyo', direction: 'give' })
    ).toMatch(/matching your current city/);

    // p2 is the researcher: taking tokyo FROM p2 means p2 gives → allowed
    s.players[0]!.hand = [];
    s.players[1]!.hand = ['tokyo'];
    const next = must(s, 'p1', {
      type: 'share-knowledge', withPlayer: 'p2', city: 'tokyo', direction: 'take',
    });
    expect(next.players[0]!.hand).toEqual(['tokyo']);
  });

  it('requires same city', () => {
    const s = newGame();
    s.players[1]!.location = 'miami';
    s.players[0]!.hand = ['atlanta'];
    expect(
      mustFail(s, 'p1', { type: 'share-knowledge', withPlayer: 'p2', city: 'atlanta', direction: 'give' })
    ).toMatch(/same city/);
  });

  it('forces the receiver to discard when over the hand limit', () => {
    const s = newGame();
    s.players[0]!.hand = ['atlanta'];
    s.players[1]!.hand = citiesOfColor('red', 7);
    const over = must(s, 'p1', {
      type: 'share-knowledge', withPlayer: 'p2', city: 'atlanta', direction: 'give',
    });
    expect(over.pendingDiscard).toBe('p2');
    // p1 cannot act until p2 discards
    expect(mustFail(over, 'p1', { type: 'drive', to: 'chicago' })).toMatch(/must discard/);
    const resolved = must(over, 'p2', { type: 'discard', card: 'atlanta' });
    expect(resolved.pendingDiscard).toBeNull();
    expect(resolved.players[1]!.hand).toHaveLength(7);
  });
});

describe('discover-cure', () => {
  it('needs 5 matching cards at a station (4 for the scientist) and wins on the 4th cure', () => {
    const s = newGame();
    s.players[0]!.role = 'scientist';
    const blues = citiesOfColor('blue', 4);
    s.players[0]!.hand = [...blues, 'tokyo'];
    expect(
      mustFail(s, 'p1', { type: 'discover-cure', color: 'blue', cards: [...blues.slice(0, 3), 'tokyo'] })
    ).toMatch(/not a blue city/);

    const cured = must(s, 'p1', { type: 'discover-cure', color: 'blue', cards: blues });
    expect(cured.cures.blue).toBe('eradicated'); // no blue cubes on a cleared board
    expect(cured.players[0]!.hand).toEqual(['tokyo']);

    // cure the remaining three -> win
    let g = cured;
    for (const color of ['yellow', 'black', 'red'] as const) {
      g.players[g.turnPlayerIndex]!.role = 'scientist';
      g.players[g.turnPlayerIndex]!.location = 'atlanta';
      g.players[g.turnPlayerIndex]!.hand = citiesOfColor(color, 4);
      const r = applyAction(g, g.players[g.turnPlayerIndex]!.id, {
        type: 'discover-cure', color, cards: citiesOfColor(color, 4),
      });
      if (!r.ok) throw new Error(r.error);
      g = r.state;
    }
    expect(g.result).toEqual({ result: 'won', reason: 'all four diseases cured' });
  });

  it('requires a research station', () => {
    const s = newGame();
    s.players[0]!.role = 'scientist';
    s.players[0]!.location = 'tokyo';
    s.players[0]!.hand = citiesOfColor('blue', 4);
    expect(
      mustFail(s, 'p1', { type: 'discover-cure', color: 'blue', cards: citiesOfColor('blue', 4) })
    ).toMatch(/research station/);
  });
});
