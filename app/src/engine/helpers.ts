import type { Card, Game, GameState, Suit } from './types';
import type { DungeonRoom } from '../content';

export const isFace = (c: Card): boolean => c.rank >= 11;

export function attrL(g: Game, k: keyof GameState['attrs']): number {
  return g.settings.attrs ? g.state.attrs[k] || 0 : 0;
}

export function totalDefense(g: Game): number {
  const S = g.state;
  let d = S.defBonus + (S.tempDef || 0);
  if (S.cls === 'knight') d += 1;
  if (S.items['Shield']) d += 1;
  if (attrL(g, 'might') >= 1) d += 1;
  return d;
}

export function activeCard(g: Game): Card | null {
  const S = g.state;
  if (!S.active) return null;
  return S.active.source === 'row' ? S.row[S.active.idx]!.card : S.hand[S.active.idx]!;
}

export function activeValue(g: Game): number {
  const c = activeCard(g);
  if (!c) return 0;
  const a = g.state.active!;
  if (a.forced != null) return a.forced;
  return Math.max(1, Math.min(13, c.rank + a.mod));
}

export function activeSuit(g: Game): Suit | null {
  const c = activeCard(g);
  if (!c) return null;
  return g.state.active!.suit || c.suit;
}

export function suitChangeCost(g: Game, to: Suit): number {
  const S = g.state;
  const from = activeSuit(g);
  if (S.cls === 'druid' && from && to && ((from === 'C' && to === 'H') || (from === 'H' && to === 'C'))) {
    return 0;
  }
  if (S.freeSuit) return 0;
  return S.items['Amulet'] || attrL(g, 'wisdom') >= 2 ? 1 : 2;
}

export function tweakCost(g: Game): number {
  const S = g.state;
  const c = activeCard(g);
  if ((S.items['Boots'] || attrL(g, 'agility') >= 2) && !S.freeTweakUsed) return 0;
  if (S.cls === 'ranger' && c && c.suit === 'C' && !S.active!.freeClubUsed) return 0;
  return 1;
}

export function handLimit(g: Game): number {
  return g.settings.pyl && g.state.wounds >= 5 ? 2 : 3;
}

export function trapLimit(g: Game, room: DungeonRoom): number {
  return room.thr + (g.state.items['Torch'] ? 1 : 0) + (attrL(g, 'agility') >= 1 ? 1 : 0);
}

export function fightNeed(g: Game, room: DungeonRoom): number {
  return room.thr - (g.state.items['Sword'] ? 1 : 0) - (attrL(g, 'might') >= 2 ? 1 : 0);
}
