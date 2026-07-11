import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced, rankLabel } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.oracle;
type Guess = 'hi' | 'lo';

export function canOracle(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.H !== 'oracle') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'H') return false;
  return !g.state.oracle.pending && g.state.oracle.slots.length < 4;
}

export function doOracle(g: Game, guess: Guess): void {
  if (!canOracle(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  S.oracle.pending = { v, guess };
  log(S, 'Oracle: you prophesy the next omen will be ' + (guess === 'hi' ? 'HIGHER' : 'LOWER') + ' than ' + v + '…', 'sys');
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

// Resolved at the start of each turn (via the oracle hook), once the fresh row
// exists, against the row's first card.
export function resolveProphecy(g: Game): void {
  const S = g.state;
  const p = S.oracle.pending;
  if (!p || !S.row.length) return;
  S.oracle.pending = null;
  const r = S.row[0]!.card.rank;
  const hit = p.guess === 'hi' ? r >= p.v : r <= p.v;
  const idx = S.oracle.slots.length;
  S.oracle.slots.push({ v: p.v, guess: p.guess, hit });
  if (hit) {
    log(S, '👁 The omen shows ' + rankLabel(r) + ' — the prophecy of ' + p.v + ' (' + (p.guess === 'hi' ? 'higher' : 'lower') + ') is TRUE!', 'good');
    gainReward(g, C.rewards[idx]!, 'Prophecy ' + (idx + 1));
    const rune = C.runeGrants[String(idx)];
    if (rune) grantRune(g, rune);
  } else {
    log(S, '👁 The omen shows ' + rankLabel(r) + ' — the prophecy is FALSE and struck from the record.', 'bad');
  }
}

export const oracleBoard: BoardPlugin = {
  id: C.id, suit: 'H', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return [
      { key: 'oracle:hi', label: 'Prophesy higher', legal: canOracle(g), apply: (gg: Game) => doOracle(gg, 'hi') },
      { key: 'oracle:lo', label: 'Prophesy lower', legal: canOracle(g), apply: (gg: Game) => doOracle(gg, 'lo') },
    ];
  },
};
