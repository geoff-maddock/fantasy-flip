import { describe, it, expect } from 'vitest';
import {
  createGame,
  defaultSettings,
  startGame,
  selectRow,
  modVal,
  modSuit,
  setAceMode,
  playEvent,
  activeValue,
  activeSuit,
  allTargets,
  endTurn,
  closeAssault,
  lastStandFlip,
  resolveAssaultNow,
  finalScore,
  isGameOver,
  useAbility,
  type Game,
  type Settings,
} from '../../src/engine';
import type { Card } from '../../src/engine';

function newGame(cls: Parameters<typeof createGame>[0]['cls'], overrides: Partial<Settings> = {}, seed = 12345): Game {
  const settings = { ...defaultSettings(), ...overrides };
  const g = createGame({ cls, settings, seed });
  startGame(g);
  return g;
}

// Force a specific card into the row for deterministic assertions.
function forceRowCard(g: Game, i: number, card: Card) {
  g.state.row[i] = { card, taken: false };
}

describe('setup & determinism', () => {
  it('starts round 1 with a full omen row and hero hand', () => {
    const g = newGame('knight');
    expect(g.state.round).toBe(1);
    expect(g.state.turn).toBe(1);
    expect(g.state.row.length).toBe(4);
    expect(g.state.hand.length).toBe(3);
    expect(g.state.draftsLeft).toBe(2);
  });

  it('is deterministic for a fixed seed', () => {
    const a = newGame('knight', {}, 999);
    const b = newGame('knight', {}, 999);
    expect(a.state.row.map((s) => s.card)).toEqual(b.state.row.map((s) => s.card));
    expect(a.state.hand).toEqual(b.state.hand);
  });

  it('applies difficulty starting resources', () => {
    const g = newGame('knight'); // adventurer: 3 gold, 1 mana
    expect(g.state.gold).toBe(3);
    expect(g.state.mana).toBe(1);
  });
});

describe('card selection & manipulation', () => {
  it('selects and deselects a row card', () => {
    const g = newGame('ranger');
    selectRow(g, 0);
    expect(g.state.active?.idx).toBe(0);
    selectRow(g, 0);
    expect(g.state.active).toBeNull();
  });

  it('tweaks value for 1 gold each', () => {
    const g = newGame('knight');
    forceRowCard(g, 0, { suit: 'S', rank: 5 });
    selectRow(g, 0);
    const gold0 = g.state.gold;
    modVal(g, 1);
    expect(activeValue(g)).toBe(6);
    expect(g.state.gold).toBe(gold0 - 1);
  });

  it('gives ranger a free club tweak', () => {
    const g = newGame('ranger');
    forceRowCard(g, 0, { suit: 'C', rank: 5 });
    selectRow(g, 0);
    const gold0 = g.state.gold;
    modVal(g, 1);
    expect(g.state.gold).toBe(gold0); // free
  });

  it('changes suit for mana', () => {
    const g = newGame('knight');
    g.state.mana = 5;
    forceRowCard(g, 0, { suit: 'S', rank: 5 });
    selectRow(g, 0);
    modSuit(g, 'H');
    expect(activeSuit(g)).toBe('H');
    expect(g.state.mana).toBe(3); // costs 2
  });

  it('druid swaps clubs<->hearts free', () => {
    const g = newGame('druid');
    forceRowCard(g, 0, { suit: 'C', rank: 5 });
    selectRow(g, 0);
    const mana0 = g.state.mana;
    modSuit(g, 'H');
    expect(g.state.mana).toBe(mana0);
  });

  it('sets ace high/low', () => {
    const g = newGame('knight');
    forceRowCard(g, 0, { suit: 'S', rank: 1 });
    selectRow(g, 0);
    setAceMode(g, true);
    expect(activeValue(g)).toBe(11);
    setAceMode(g, false);
    expect(activeValue(g)).toBe(1);
  });
});

describe('board placement — the core 4', () => {
  it('places a matching high spade into the first dungeon room and consumes a pick', () => {
    const g = newGame('knight');
    forceRowCard(g, 0, { suit: 'S', rank: 10 });
    selectRow(g, 0);
    const t = allTargets(g).find((x) => x.key === 'dungeon')!;
    expect(t.legal).toBe(true);
    const drafts0 = g.state.draftsLeft;
    t.apply(g);
    expect(g.state.dungeonNext).toBe(1);
    expect(g.state.draftsLeft).toBe(drafts0 - 1);
    expect(g.state.gold).toBeGreaterThanOrEqual(3); // room 0 grants +1 gold
  });

  it('enforces the rising trail in the forest', () => {
    const g = newGame('ranger');
    forceRowCard(g, 0, { suit: 'C', rank: 5 });
    selectRow(g, 0);
    allTargets(g).find((x) => x.key === 'forest')!.apply(g);
    expect(g.state.trail).toEqual([5]);
    // a lower club is now illegal
    forceRowCard(g, 1, { suit: 'C', rank: 3 });
    selectRow(g, 1);
    expect(allTargets(g).find((x) => x.key === 'forest')!.legal).toBe(false);
  });

  it('enforces parity on temple altars', () => {
    const g = newGame('druid');
    forceRowCard(g, 0, { suit: 'H', rank: 5 }); // odd -> sun only
    selectRow(g, 0);
    const sun = allTargets(g).find((x) => x.key === 'altar:sun')!;
    const moon = allTargets(g).find((x) => x.key === 'altar:moon')!;
    expect(sun.legal).toBe(true);
    expect(moon.legal).toBe(false);
  });

  it('buys a market item when value and gold suffice', () => {
    const g = newGame('knight');
    g.state.gold = 10;
    forceRowCard(g, 0, { suit: 'D', rank: 6 }); // Crown needs value>=6, price 6
    selectRow(g, 0);
    const buyCrown = allTargets(g).find((x) => x.label === 'Buy Crown')!;
    expect(buyCrown.legal).toBe(true);
    buyCrown.apply(g);
    expect(g.state.items['Crown']).toBe(true);
    expect(g.state.fortune).toBe(2);
    expect(g.state.gold).toBe(4);
  });
});

describe('face events', () => {
  it('jack grants +3 gold', () => {
    const g = newGame('knight');
    forceRowCard(g, 0, { suit: 'S', rank: 11 });
    selectRow(g, 0);
    const gold0 = g.state.gold;
    playEvent(g, 'gold');
    expect(g.state.gold).toBe(gold0 + 3);
  });

  it('bard gets +1 xp on any face event', () => {
    const g = newGame('bard');
    forceRowCard(g, 0, { suit: 'S', rank: 12 });
    selectRow(g, 0);
    playEvent(g, 'mana');
    expect(g.state.xp).toBe(1);
    expect(g.state.mana).toBe(1 + 2); // start 1 + queen 2
  });
});

describe('class ability', () => {
  it('knight ability adds +3 once per round', () => {
    const g = newGame('knight');
    forceRowCard(g, 0, { suit: 'S', rank: 4 });
    selectRow(g, 0);
    useAbility(g);
    expect(activeValue(g)).toBe(7);
    expect(g.state.abilityUsed).toBe(true);
    // second use is a no-op
    useAbility(g);
    expect(activeValue(g)).toBe(7);
  });
});

describe('turn & assault flow', () => {
  it('leftover face cards raise threat at end of turn', () => {
    const g = newGame('knight');
    g.state.row = [
      { card: { suit: 'S', rank: 12 }, taken: false },
      { card: { suit: 'H', rank: 13 }, taken: false },
      { card: { suit: 'C', rank: 3 }, taken: false },
      { card: { suit: 'D', rank: 4 }, taken: false },
    ];
    endTurn(g);
    expect(g.state.threat).toBe(2);
    expect(g.state.turn).toBe(2);
  });

  it('knight defense repels a weak assault', () => {
    const g = newGame('knight');
    // jump to turn 5 with no threat; base round1 = 2, knight def = 1... force a win
    g.state.defBonus = 5;
    g.state.turn = 5;
    g.state.round = 1;
    g.state.row = [];
    endTurn(g); // triggers assault (pyl off => resolves now)
    expect(g.state.assault?.resolved).toBe(true);
    expect(g.state.assault?.outcome?.win).toBe(true);
    expect(g.state.glory).toBe(1);
  });

  it('plays a full 3-round game to completion', () => {
    const g = newGame('knight');
    let guard = 0;
    while (!isGameOver(g) && guard++ < 100) {
      // draft nothing, just end turns; at turn 5 resolve assault then close
      if (g.state.turn === 5) {
        endTurn(g);
        if (g.state.assault) {
          resolveAssaultNow(g);
          closeAssault(g);
        }
      } else {
        endTurn(g);
      }
    }
    expect(isGameOver(g)).toBe(true);
    const score = finalScore(g);
    expect(typeof score.total).toBe('number');
    expect(score.tier).toBeTruthy();
  });

  it('last stand red flip adds defense', () => {
    const g = newGame('knight', { pyl: true });
    g.state.turn = 5;
    g.state.round = 1;
    g.state.row = [];
    endTurn(g);
    const a = g.state.assault!;
    expect(a.resolved).toBe(false); // pyl waits for last stand
    const def0 = a.def + a.bonusDef;
    // force a red card on top of the deck
    g.state.deck.push({ suit: 'H', rank: 7 });
    lastStandFlip(g);
    expect(a.bonusDef).toBe(1);
    expect(a.def + a.bonusDef).toBe(def0 + 1);
  });
});
