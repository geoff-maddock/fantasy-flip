import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { market as C, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { grantRune, recruit } from '../rewards';

const ITEMS = C.items;
const itemRune = (name: string): RuneType | undefined => C.itemRuneMap?.[name];

export function canBuy(g: Game, i: number): boolean {
  const it = ITEMS[i]!;
  const c = activeCard(g);
  if (g.settings.boards.D !== 'market') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'D') return false;
  if (g.state.items[it.name]) return false;
  return activeValue(g) >= it.price && g.state.gold >= it.price;
}

export function doBuy(g: Game, i: number): void {
  if (!canBuy(g, i)) return;
  const S = g.state;
  const it = ITEMS[i]!;
  const c = activeCard(g)!;
  S.gold -= it.price;
  S.items[it.name] = true;
  S.fortune += it.name === 'Crown' ? 2 : 1;
  log(S, 'Market: you buy the ' + it.em + ' ' + it.name + ' for ' + it.price + ' 🪙.', 'good');
  if (it.name === 'Crown') { S.xp += 2; log(S, 'The Crown gleams: +2 XP.', 'good'); }
  const rune = itemRune(it.name);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export function canSell(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.D !== 'market') return false;
  return !!(c && !isFace(c) && activeSuit(g) === 'D');
}

export function trySell(g: Game): void {
  if (!canSell(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const gold = Math.ceil(v / 2);
  S.gold += gold;
  log(S, 'Market: you sell wares worth ' + v + ' for +' + gold + ' 🪙.', 'good');
  if (g.settings.followers && v >= 8) recruit(g, 'trader');
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const marketBoard: BoardPlugin = {
  id: C.id,
  suit: C.suit,
  track: C.track,
  name: C.name,
  svg: C.svg,
  mech: C.mech,
  targets(g: Game): PlacementTarget[] {
    const out: PlacementTarget[] = [{ key: 'sell', label: 'Sell for gold', legal: canSell(g), apply: trySell }];
    ITEMS.forEach((it, i) => {
      out.push({ key: 'buy:' + i, label: 'Buy ' + it.name, legal: canBuy(g, i), apply: (gg) => doBuy(gg, i) });
    });
    return out;
  },
};
