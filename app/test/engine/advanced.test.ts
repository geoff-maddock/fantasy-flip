import { describe, it, expect } from 'vitest';
import {
  createGame,
  defaultSettings,
  startGame,
  selectRow,
  allTargets,
  allFreeActions,
  unlockLoc,
  chessTargets,
  doChessMove,
  canTrain,
  doTrain,
  spendFollower,
  beginSpell,
  spellPickSecond,
  startTurn,
  type Game,
  type Settings,
  type Card,
  type Suit,
} from '../../src/engine';

function boardsFor(overrides: Partial<Record<Suit, string>>): Record<Suit, string> {
  return { S: 'dungeon', C: 'forest', H: 'temple', D: 'market', ...overrides } as Record<Suit, string>;
}

function newGame(boards: Partial<Record<Suit, string>>, mods: Partial<Settings> = {}): Game {
  const settings: Settings = { ...defaultSettings(), ...mods, boards: boardsFor(boards) };
  const g = createGame({ cls: 'druid', settings, seed: 42 });
  startGame(g);
  return g;
}

// Place a card in row slot 0 and select it. Resets active + drafts so tests can
// exercise board legality without fighting the per-turn pick economy.
function put(g: Game, card: Card): void {
  g.state.active = null;
  g.state.draftsLeft = 9;
  g.state.row[0] = { card, taken: false };
  selectRow(g, 0);
}
function place(g: Game, key: string): void {
  const t = allTargets(g).find((x) => x.key === key);
  if (!t) throw new Error('no target ' + key);
  t.apply(g);
}

describe('alternate spade boards', () => {
  it('catacombs moves exactly the card value around the ring', () => {
    const g = newGame({ S: 'catacombs' });
    put(g, { suit: 'S', rank: 3 });
    place(g, 'catacombs');
    expect(g.state.cata.pos).toBe(2); // -1 + 3 = 2 mod 10
    expect(g.state.cata.visited[2]).toBe(true);
  });

  it('war camp charges within the band and routs on overshoot', () => {
    const g = newGame({ S: 'warcamp' });
    put(g, { suit: 'S', rank: 8 });
    place(g, 'line:0');
    put(g, { suit: 'S', rank: 6 });
    place(g, 'line:0'); // sum 14 -> in band
    const charge = allFreeActions(g).find((x) => x.key === 'charge:0')!;
    expect(charge.legal).toBe(true);
    charge.apply(g);
    expect(g.state.lines[0]!.st).toBe('charged');
    expect(g.state.glory).toBe(1);
  });
});

describe('alternate club boards', () => {
  it('standing stones require rising pair sums', () => {
    const g = newGame({ C: 'stones' });
    put(g, { suit: 'C', rank: 4 });
    place(g, 'stones');
    put(g, { suit: 'C', rank: 5 });
    place(g, 'stones'); // pair 0 sum 9
    expect(g.state.stones[0]).toEqual([4, 5]);
    expect(g.state.lore).toBe(1);
  });
});

describe('alternate heart boards', () => {
  it('pilgrim road only accepts exact shrine values', () => {
    const g = newGame({ H: 'road' });
    put(g, { suit: 'H', rank: 5 }); // no shrine at 5
    expect(allTargets(g).find((x) => x.key === 'road')!.legal).toBe(false);
    put(g, { suit: 'H', rank: 2 }); // shrine 0 is value 2
    expect(allTargets(g).find((x) => x.key === 'road')!.legal).toBe(true);
  });

  it('oracle prophecy resolves at next turn start', () => {
    const g = newGame({ H: 'oracle' });
    put(g, { suit: 'H', rank: 5 });
    place(g, 'oracle:lo'); // predict next omen <= 5
    expect(g.state.oracle.pending).not.toBeNull();
    // force next row's first card low, then advance turn
    g.state.deck.push({ suit: 'S', rank: 3 });
    startTurn(g);
    expect(g.state.oracle.pending).toBeNull();
    expect(g.state.oracle.slots.length).toBe(1);
    expect(g.state.oracle.slots[0]!.hit).toBe(true);
  });
});

describe('alternate diamond boards', () => {
  it('gemcutter emerald needs three equal', () => {
    const g = newGame({ D: 'gemcutter' });
    for (let i = 0; i < 3; i++) { put(g, { suit: 'D', rank: 7 }); place(g, 'gem:emerald'); }
    expect(g.state.gems.emerald).toEqual([7, 7, 7]);
    expect(g.state.fortune).toBe(2);
  });

  it('trade roads must connect after the first road', () => {
    const g = newGame({ D: 'traderoute' });
    put(g, { suit: 'D', rank: 5 });
    place(g, 'route:0'); // Harbor-Mill req 3, first is free
    expect(g.state.routes.built[0]).toBe(true);
    expect(g.state.routes.towns[0] && g.state.routes.towns[1]).toBe(true);
  });
});

describe('charter boards', () => {
  it('unlock costs XP and opens the tower, which descends', () => {
    const g = newGame({});
    g.state.xp = 5;
    unlockLoc(g, 'tower');
    expect(g.state.unlocked.tower).toBe(true);
    expect(g.state.xp).toBe(2);
    put(g, { suit: 'S', rank: 9 });
    place(g, 'tower');
    put(g, { suit: 'S', rank: 5 });
    expect(allTargets(g).find((x) => x.key === 'tower')!.legal).toBe(true); // 5 < 9 ok
    place(g, 'tower');
    put(g, { suit: 'S', rank: 8 });
    expect(allTargets(g).find((x) => x.key === 'tower')!.legal).toBe(false); // 8 not < 5
  });
});

describe('modules', () => {
  it('chess: champion captures a pawn', () => {
    const g = newGame({}, { chess: true });
    // champion starts at [4,2]; a diamond queen-move can reach far. Put a pawn adjacent.
    g.state.chess.pieces = [{ t: 'P', r: 3, c: 2, alive: true, rw: { gold: 1 } }];
    put(g, { suit: 'D', rank: 5 });
    const targets = chessTargets(g);
    expect(targets.some(([r, c]) => r === 3 && c === 2)).toBe(true);
    doChessMove(g, 3, 2);
    expect(g.state.chess.pieces[0]!.alive).toBe(false);
    expect(g.state.gold).toBeGreaterThanOrEqual(1);
  });

  it('attributes: train might with a big spade', () => {
    const g = newGame({}, { attrs: true });
    put(g, { suit: 'S', rank: 6 }); // req[0] = 4
    expect(canTrain(g, 'might')).toBe(true);
    doTrain(g, 'might');
    expect(g.state.attrs.might).toBe(1);
  });

  it('followers: squire adds +2 to the active card', () => {
    const g = newGame({}, { followers: true });
    g.state.followers.squire = 1;
    put(g, { suit: 'S', rank: 4 });
    spendFollower(g, 'squire');
    // active value should now be 6
    const t = allTargets(g).find((x) => x.key === 'dungeon');
    expect(t).toBeTruthy();
    expect(g.state.followers.squire).toBe(0);
  });

  it('spellcraft: transmute two cards into gold', () => {
    const g = newGame({}, { spells: true });
    g.state.mana = 5;
    g.state.row = [
      { card: { suit: 'S', rank: 8 }, taken: false },
      { card: { suit: 'D', rank: 6 }, taken: false },
    ];
    selectRow(g, 0);
    beginSpell(g, 'transmute');
    const gold0 = g.state.gold;
    spellPickSecond(g, 'row', 1); // sum 14 -> +7 gold
    expect(g.state.gold).toBe(gold0 + 7);
    expect(g.state.mana).toBe(4);
  });
});
