import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.traderoute;
const TOWNS = C.towns;
const EDGES = C.edges;
const townRune = (t: number): RuneType | undefined => C.townRunes[String(t)];

function townsConnected(g: Game): number {
  return g.state.routes.towns.filter((x) => x).length;
}

export function canRoute(g: Game, i: number): boolean {
  const c = activeCard(g);
  if (g.settings.boards.D !== 'traderoute') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'D') return false;
  const e = EDGES[i]!;
  if (g.state.routes.built[i]) return false;
  if (activeValue(g) < e.req) return false;
  if (!g.state.routes.built.some((x) => x)) return true;
  return !!(g.state.routes.towns[e.a] || g.state.routes.towns[e.b]);
}

export function doRoute(g: Game, i: number): void {
  if (!canRoute(g, i)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const e = EDGES[i]!;
  S.routes.built[i] = true;
  log(S, 'Trade Roads: you lay the road ' + TOWNS[e.a]!.n + ' — ' + TOWNS[e.b]!.n + '.', 'good');
  for (const t of [e.a, e.b]) {
    if (!S.routes.towns[t]) {
      S.routes.towns[t] = true;
      gainReward(g, TOWNS[t]!.rw, TOWNS[t]!.n);
      const rune = townRune(t);
      if (rune) grantRune(g, rune);
      const n = townsConnected(g);
      const star = C.stars[String(n)];
      if (star) gainReward(g, { fortune: star }, n + ' towns joined');
    }
  }
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export const traderouteBoard: BoardPlugin = {
  id: C.id, suit: 'D', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return EDGES.map((e, i) => ({
      key: 'route:' + i,
      label: TOWNS[e.a]!.n + '–' + TOWNS[e.b]!.n + ' (≥' + e.req + ')',
      legal: canRoute(g, i),
      apply: (gg: Game) => doRoute(gg, i),
    }));
  },
};
