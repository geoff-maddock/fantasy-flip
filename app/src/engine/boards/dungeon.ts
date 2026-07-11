import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { dungeon as C, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, fightNeed, isFace, trapLimit } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune, recruit } from '../rewards';
import { openDelve } from '../delve';

const ROOMS = C.rooms;
const runeAt = (idx: number): RuneType | undefined => C.runeSpots?.[String(idx)];
const followAt = (idx: number): string | undefined => C.followSpots?.[String(idx)];

export function canDungeon(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.S !== 'dungeon') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'S') return false;
  if (g.state.dungeonNext >= ROOMS.length) return false;
  const room = ROOMS[g.state.dungeonNext]!;
  const v = activeValue(g);
  return room.t === 'T' ? v <= trapLimit(g, room) : v >= fightNeed(g, room);
}

export function doDungeon(g: Game): void {
  if (!canDungeon(g)) return;
  const S = g.state;
  const room = ROOMS[S.dungeonNext]!;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const idx = S.dungeonNext;
  S.dungeonNext++;
  const kind = room.t === 'T' ? 'slip past' : 'defeat';
  log(S, 'Dungeon: you ' + kind + ' the ' + room.em + ' ' + room.name + ' with a ' + v + '.', 'good');
  gainReward(g, room.rw, room.name);
  const f = followAt(idx);
  if (g.settings.followers && f) recruit(g, f as keyof Game['state']['followers']);
  const rune = runeAt(idx);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  if (S.dungeonNext < ROOMS.length && ROOMS[S.dungeonNext]!.d !== room.d) {
    log(S, 'You descend to depth ' + ROOMS[S.dungeonNext]!.d + '…', 'sys');
  }
  consumeActive(g);
  if (g.settings.pyl) openDelve(g, room.d);
}

export const dungeonBoard: BoardPlugin = {
  id: C.id,
  suit: C.suit,
  track: C.track,
  name: C.name,
  svg: C.svg,
  mech: C.mech,
  targets(g: Game): PlacementTarget[] {
    return [{ key: 'dungeon', label: 'Enter room', legal: canDungeon(g), apply: doDungeon }];
  },
};
