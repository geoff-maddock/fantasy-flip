import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.gemcutter;
type GemKey = 'emerald' | 'ruby' | 'diamond';

export function canGem(g: Game, key: GemKey): boolean {
  const c = activeCard(g);
  if (g.settings.boards.D !== 'gemcutter') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'D') return false;
  const vals = g.state.gems[key];
  const v = activeValue(g);
  if (vals.length >= 3) return false;
  if (key === 'emerald') return vals.length === 0 || v === vals[0];
  if (key === 'ruby') return vals.length === 0 || v === vals[vals.length - 1]! + 1;
  // diamond: three summing to exactly 21
  const sum = vals.reduce((a, b) => a + b, 0) + v;
  if (vals.length === 2) return sum === 21;
  if (vals.length === 1) return sum <= 20 && 21 - sum >= 1 && 21 - sum <= 13;
  return v <= 13;
}

export function doGem(g: Game, key: GemKey): void {
  if (!canGem(g, key)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  S.gems[key].push(v);
  S.gold += 1;
  const gem = C.gems[key];
  log(S, 'Gemcutter: a ' + v + ' is set into the ' + gem.em + ' ' + gem.name + ' (+1 🪙 for the work).', 'good');
  if (S.gems[key].length === 3) {
    log(S, 'The ' + gem.name + ' setting is complete — flawless!', 'sys');
    gainReward(g, gem.rw, gem.name);
    grantRune(g, gem.rune);
  }
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const gemcutterBoard: BoardPlugin = {
  id: C.id, suit: 'D', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return (['emerald', 'ruby', 'diamond'] as GemKey[]).map((k) => ({
      key: 'gem:' + k,
      label: 'Set ' + C.gems[k].name,
      legal: canGem(g, k),
      apply: (gg: Game) => doGem(gg, k),
    }));
  },
};
