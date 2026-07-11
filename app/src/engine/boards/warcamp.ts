import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.warcamp;

export function lineSum(g: Game, i: number): number {
  return g.state.lines[i]!.vals.reduce((a, b) => a + b, 0);
}

export function canLine(g: Game, i: number): boolean {
  const c = activeCard(g);
  if (g.settings.boards.S !== 'warcamp') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'S') return false;
  const L = g.state.lines[i]!;
  return L.st === 'open' && L.vals.length < C.maxCards;
}

export function doLine(g: Game, i: number): void {
  if (!canLine(g, i)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  S.lines[i]!.vals.push(v);
  const sum = lineSum(g, i);
  log(S, 'War Camp: a ' + v + ' joins line ' + (i + 1) + ' (sum ' + sum + ').', 'good');
  if (S.lines[i]!.vals.length === 3) grantRune(g, C.lineRunes[i === 0 ? 0 : 1]!);
  if (sum > C.high) {
    S.lines[i]!.st = 'routed';
    log(S, 'Line ' + (i + 1) + ' overextends past ' + C.high + ' and is ROUTED — its glory is lost!', 'bad');
  }
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

export function canCharge(g: Game, i: number): boolean {
  const L = g.state.lines[i]!;
  return g.settings.boards.S === 'warcamp' && L.st === 'open' && lineSum(g, i) >= C.low && lineSum(g, i) <= C.high;
}

export function chargeLine(g: Game, i: number): void {
  if (!canCharge(g, i)) return;
  const S = g.state;
  const sum = lineSum(g, i);
  S.lines[i]!.st = 'charged';
  const rw = sum >= C.strong ? { glory: 2, def: 1 } : { glory: 1, def: 1 };
  log(S, '⚔ Line ' + (i + 1) + ' sounds the charge at strength ' + sum + '!', 'sys');
  gainReward(g, rw, 'The charge');
}

export const warcampBoard: BoardPlugin = {
  id: C.id, suit: 'S', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return [0, 1].map((i) => ({ key: 'line:' + i, label: 'Muster line ' + (i + 1), legal: canLine(g, i), apply: (gg: Game) => doLine(gg, i) }));
  },
  freeActions(g): PlacementTarget[] {
    return [0, 1].map((i) => ({ key: 'charge:' + i, label: 'Charge line ' + (i + 1), legal: canCharge(g, i), apply: (gg: Game) => chargeLine(gg, i) }));
  },
};
