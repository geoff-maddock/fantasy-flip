import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.catacombs;
const runeAt = (i: number): RuneType | undefined => C.runeSpots[String(i)];

function target(g: Game): number {
  return (g.state.cata.pos + activeValue(g)) % 10;
}

export function canCata(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.S !== 'catacombs') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'S') return false;
  if (g.state.cata.visited.every((x) => x)) return false;
  return !g.state.cata.visited[target(g)];
}

export function doCata(g: Game): void {
  if (!canCata(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const t = target(g);
  S.cata.pos = t;
  S.cata.visited[t] = true;
  log(S, 'Catacombs: you step ' + activeValue(g) + ' chambers to crypt ' + (t + 1) + ' and pry it open.', 'good');
  gainReward(g, C.crypts[t]!.rw, 'Crypt ' + (t + 1));
  const rune = runeAt(t);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  if (S.cata.visited.every((x) => x) && !S.cata.done) {
    S.cata.done = true;
    gainReward(g, C.bonus, 'The Nameless blesses you');
  }
  consumeActive(g);
}

export const catacombsBoard: BoardPlugin = {
  id: C.id, suit: 'S', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g) {
    return [{ key: 'catacombs', label: 'Open crypt', legal: canCata(g), apply: doCata }] as PlacementTarget[];
  },
};
