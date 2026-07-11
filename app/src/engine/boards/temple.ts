import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { temple as C, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune, recruit } from '../rewards';

type AltarKey = 'sun' | 'moon';
const ALTARS = C.altars;
const runeAt = (key: AltarKey, idx: number): RuneType | undefined => C.runeSpots?.[key]?.[String(idx)];
const followAt = (idx: number): string | undefined => C.followSpots?.[String(idx)];

export function canAltar(g: Game, key: AltarKey): boolean {
  const c = activeCard(g);
  if (g.settings.boards.H !== 'temple') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'H') return false;
  const a = ALTARS[key];
  const vals = g.state.altars[key];
  if (vals.length >= 4) return false;
  const v = activeValue(g);
  if (v % 2 !== a.parity && g.state.parityBreaks <= 0) return false;
  if (vals.includes(v)) return false;
  return true;
}

export function doAltar(g: Game, key: AltarKey): void {
  if (!canAltar(g, key)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const a = ALTARS[key];
  const idx = S.altars[key].length;
  if (v % 2 !== a.parity) { S.parityBreaks--; log(S, 'The Acolyte intercedes — parity is ignored.', 'sys'); }
  S.altars[key].push(v);
  log(S, 'Temple: you inscribe a ' + v + ' on the ' + a.name.replace(/ \(.*/, '') + '.', 'good');
  gainReward(g, a.boxes[idx]!, 'Altar offering');
  const f = followAt(idx);
  if (g.settings.followers && f) recruit(g, f as keyof Game['state']['followers']);
  const rune = runeAt(key, idx);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  if (S.altars[key].length === 4) {
    const sum = S.altars[key].reduce((x, y) => x + y, 0);
    const sp = sum >= a.t3 ? 3 : sum >= a.t2 ? 2 : 1;
    S.spirit += sp;
    log(S, 'The altar is complete (sum ' + sum + ')! +' + sp + '⭐ Spirit.', 'good');
  }
  consumeActive(g);
}

export const templeBoard: BoardPlugin = {
  id: C.id,
  suit: C.suit,
  track: C.track,
  name: C.name,
  svg: C.svg,
  mech: C.mech,
  targets(g: Game): PlacementTarget[] {
    return [
      { key: 'altar:sun', label: '☀ Sun altar', legal: canAltar(g, 'sun'), apply: (gg) => doAltar(gg, 'sun') },
      { key: 'altar:moon', label: '☾ Moon altar', legal: canAltar(g, 'moon'), apply: (gg) => doAltar(gg, 'moon') },
    ];
  },
};
