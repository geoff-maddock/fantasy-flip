import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.road;
const SHRINES = C.shrines;
const runeAt = (i: number): RuneType | undefined => C.runeSpots[String(i)];

export function canRoad(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.H !== 'road') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'H') return false;
  const v = activeValue(g);
  return SHRINES.some((s, i) => i > g.state.roadPos && s.v === v);
}

export function doRoad(g: Game): void {
  if (!canRoad(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const i = SHRINES.findIndex((s, j) => j > S.roadPos && s.v === v);
  const skipped = i - S.roadPos - 1;
  S.roadPos = i;
  log(S, 'Pilgrim Road: you walk to the ' + SHRINES[i]!.em + ' shrine of ' + v + (skipped > 0 ? ' — ' + skipped + ' shrine' + (skipped > 1 ? 's' : '') + ' pass forever behind you' : '') + '.', skipped > 0 ? 'sys' : 'good');
  gainReward(g, SHRINES[i]!.rw, 'Shrine of ' + v);
  const rune = runeAt(i);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const roadBoard: BoardPlugin = {
  id: C.id, suit: 'H', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return [{ key: 'road', label: 'Walk the road', legal: canRoad(g), apply: doRoad }];
  },
};
