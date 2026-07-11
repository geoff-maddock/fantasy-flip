import type { BoardPlugin, PlacementTarget } from './types';
import type { Game } from '../types';
import { advanced, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const C = advanced.thicket;
const cellRw = (i: number) => C.cellRewards[String(i)];
const runeAt = (i: number): RuneType | undefined => C.runeSpots[String(i)];

const fillCount = (v: number): number => (v <= 4 ? 1 : v <= 9 ? 2 : 3);

export function canThicket(g: Game): boolean {
  const c = activeCard(g);
  if (g.settings.boards.C !== 'thicket') return false;
  if (!c || isFace(c) || activeSuit(g) !== 'C') return false;
  if (g.state.fill) return false;
  return g.state.grid.some((x) => !x);
}

export function doThicketStart(g: Game): void {
  if (!canThicket(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const n = Math.min(fillCount(activeValue(g)), S.grid.filter((x) => !x).length);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
  S.fill = { left: n, cells: [] };
  log(S, 'Thicket: clear ' + n + ' touching cell' + (n > 1 ? 's' : '') + '.', 'sys');
}

export function thicketLegalCells(g: Game): number[] {
  const S = g.state;
  if (!S.fill) return [];
  const out: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (S.grid[i]) continue;
    if (S.fill.cells.length === 0) { out.push(i); continue; }
    const r = Math.floor(i / 4), c = i % 4;
    const adj = S.fill.cells.some((j) => {
      const jr = Math.floor(j / 4), jc = j % 4;
      return Math.abs(jr - r) + Math.abs(jc - c) === 1;
    });
    if (adj) out.push(i);
  }
  return out;
}

export function fillThicketCell(g: Game, i: number): void {
  const S = g.state;
  if (!S.fill || S.grid[i] || !thicketLegalCells(g).includes(i)) return;
  S.grid[i] = true;
  S.fill.cells.push(i);
  S.fill.left--;
  const rw = cellRw(i);
  if (rw) gainReward(g, rw, 'Clearing');
  const rune = runeAt(i);
  if (rune) grantRune(g, rune);
  const r = Math.floor(i / 4);
  if ([0, 1, 2, 3].every((c) => S.grid[r * 4 + c]) && !S.thicketRows[r]) {
    S.thicketRows[r] = true;
    gainReward(g, { lore: 1 }, 'Row ' + (r + 1) + ' cleared');
  }
  if (S.fill.left <= 0 || thicketLegalCells(g).length === 0) {
    S.fill = null;
    if (S.grid.every((x) => x)) gainReward(g, { lore: 1 }, 'The Thicket lies open');
  }
}

export const thicketBoard: BoardPlugin = {
  id: C.id, suit: 'C', track: C.track, name: C.name, svg: C.svg, mech: C.mech,
  targets(g): PlacementTarget[] {
    return [{ key: 'thicket', label: 'Clear thicket', legal: canThicket(g), apply: doThicketStart }];
  },
};
