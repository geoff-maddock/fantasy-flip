import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { forest as C, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune, recruit } from '../rewards';

const SLOTS = C.slots;
const runeAt = (idx: number): RuneType | undefined => C.runeSpots?.[String(idx)];
const followAt = (idx: number): string | undefined => C.followSpots?.[String(idx)];

export function canForest(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.C !== 'forest') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'C') return false;
  const S = g.state;
  if (S.trail.length >= SLOTS.length) return false;
  const v = activeValue(g);
  if (S.trail.length === 0) return true;
  if (S.trailBreaks > 0) return true;
  return v > S.trail[S.trail.length - 1]!;
}

export function doForest(g: Game): void {
  if (!canForest(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const idx = S.trail.length;
  const usedBreak = idx > 0 && v <= S.trail[idx - 1]!;
  S.trail.push(v);
  if (usedBreak) { S.trailBreaks--; log(S, 'The rising rule is bypassed for this space.', 'sys'); }
  log(S, 'Wildwood: you blaze the trail with a ' + v + '.', 'good');
  gainReward(g, SLOTS[idx]!.rw, 'Trail ' + (idx + 1));
  const f = followAt(idx);
  if (g.settings.followers && f) recruit(g, f as keyof Game['state']['followers']);
  const rune = runeAt(idx);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const forestBoard: BoardPlugin = {
  id: C.id,
  suit: C.suit,
  track: C.track,
  name: C.name,
  svg: C.svg,
  mech: C.mech,
  targets(g: Game): PlacementTarget[] {
    return [{ key: 'forest', label: 'Blaze trail', legal: canForest(g), apply: doForest }];
  },
};
