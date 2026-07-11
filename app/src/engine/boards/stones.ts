import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.stones;
const runeAt = (i: number): RuneType | undefined => C.runeSpots[String(i)];

function currentCol(g: Game): number {
  return g.state.stones.findIndex((col) => col.length < 2);
}
function prevSum(g: Game): number {
  let best = 0;
  for (const col of g.state.stones) {
    if (col.length === 2) best = col[0]! + col[1]!;
    else break;
  }
  return best;
}

export function canStones(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.C !== 'stones') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'C') return false;
  const k = currentCol(g);
  if (k < 0) return false;
  const col = g.state.stones[k]!;
  if (col.length === 0) return true;
  return col[0]! + activeValue(g) > prevSum(g);
}

export function doStones(g: Game): void {
  if (!canStones(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const k = currentCol(g);
  S.stones[k]!.push(v);
  if (S.stones[k]!.length === 2) {
    const sum = S.stones[k]![0]! + S.stones[k]![1]!;
    log(S, 'Standing Stones: pair ' + (k + 1) + ' rises with sum ' + sum + '.', 'good');
    gainReward(g, C.pairRewards[k]!, 'Stone pair ' + (k + 1));
    const rune = runeAt(k);
    if (rune) grantRune(g, rune);
  } else {
    log(S, 'Standing Stones: a ' + v + ' is set — its partner must push the sum past ' + prevSum(g) + '.', 'good');
  }
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const stonesBoard: BoardPlugin = {
  id: C.id, suit: 'C', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return [{ key: 'stones', label: 'Set stone', legal: canStones(g), apply: doStones }];
  },
};
