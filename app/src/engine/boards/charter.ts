import type { BoardPlugin } from './types';
import type { Game } from '../types';
import { advanced, type RuneType } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

/* ---------- Wizard's Tower (any suit; strictly descending floors) ---------- */
const TW = advanced.tower;
const towerRune = (i: number): RuneType | undefined => TW.runeSpots[String(i)];

export function canTower(g: Game): boolean {
  const c = activeCard(g);
  if (!g.state.unlocked.tower || !c || isFace(c)) return false;
  if (g.state.tower.length >= TW.floors.length) return false;
  const v = activeValue(g);
  if (g.state.tower.length === 0) return true;
  return v < g.state.tower[g.state.tower.length - 1]!;
}
export function doTower(g: Game): void {
  if (!canTower(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const idx = S.tower.length;
  S.tower.push(v);
  log(S, 'Tower: you inscribe a ' + v + ' ward on floor ' + (idx + 1) + '.', 'good');
  gainReward(g, TW.floors[idx]!, 'Floor ' + (idx + 1));
  const rune = towerRune(idx);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  if (S.tower.length === TW.floors.length) log(S, 'The Tower is complete — its wards hum with power!', 'sys');
  consumeActive(g);
}

/* ---------- Beast Bog (♠/♣; bait then match to trap) ---------- */
const BG = advanced.bog;
export function canPen(g: Game, i: number): boolean {
  const c = activeCard(g);
  if (!g.state.unlocked.bog || !c || isFace(c)) return false;
  const su = activeSuit(g);
  if (su !== 'S' && su !== 'C') return false;
  const pen = g.state.pens[i]!;
  const v = activeValue(g);
  if (pen.length >= 2) return false;
  if (pen.length === 1) return v === pen[0];
  return !g.state.pens.some((p, j) => j !== i && p.length > 0 && p[0] === v);
}
export function doPen(g: Game, i: number): void {
  if (!canPen(g, i)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  S.pens[i]!.push(v);
  if (S.pens[i]!.length === 1) {
    log(S, 'Bog: you bait pen ' + (i + 1) + ' with a ' + v + '. Now match it!', 'good');
  } else {
    const gold = Math.ceil(v / 2);
    S.glory += BG.glory[i]!;
    S.gold += gold;
    log(S, 'Bog: a ' + BG.emoji[i]! + ' beast of strength ' + v + ' is trapped in pen ' + (i + 1) + '! +' + BG.glory[i] + '⭐ Glory, +' + gold + ' 🪙.', 'good');
    if (i === 2) grantRune(g, BG.penTrapRune);
  }
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

/* ---------- Gilded Tavern (♥/♦; adjacency run) ---------- */
const TV = advanced.tavern;
const tavernRune = (i: number): RuneType | undefined => TV.runeSpots[String(i)];
export function canTavern(g: Game): boolean {
  const c = activeCard(g);
  if (!g.state.unlocked.tavern || !c || isFace(c)) return false;
  const su = activeSuit(g);
  if (su !== 'H' && su !== 'D') return false;
  if (g.state.run.length >= TV.boxes.length) return false;
  const v = activeValue(g);
  if (g.state.run.includes(v)) return false;
  if (g.state.run.length === 0) return true;
  return g.state.run.some((x) => Math.abs(x - v) === 1);
}
export function doTavern(g: Game): void {
  if (!canTavern(g)) return;
  const S = g.state;
  const c = activeCard(g)!;
  const v = activeValue(g);
  const idx = S.run.length;
  S.run.push(v);
  log(S, 'Tavern: you play a ' + v + ' into the run [' + [...S.run].sort((a, b) => a - b).join('-') + '].', 'good');
  gainReward(g, TV.boxes[idx]!, 'Run card ' + (idx + 1));
  const rune = tavernRune(idx);
  if (rune) grantRune(g, rune);
  if (c.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  if (S.run.length === TV.boxes.length) log(S, 'The whole tavern cheers — a perfect run!', 'sys');
  consumeActive(g);
}

export const towerBoard: BoardPlugin = {
  id: 'tower', suit: 'S', track: TW.track, name: TW.name, svg: TW.svg, mech: TW.blurb,
  targets: (g) => [{ key: 'tower', label: 'Build floor', legal: canTower(g), apply: doTower }],
};
export const bogBoard: BoardPlugin = {
  id: 'bog', suit: 'S', track: BG.track, name: BG.name, svg: BG.svg, mech: BG.blurb,
  targets: (g) => [0, 1, 2].map((i) => ({ key: 'pen:' + i, label: 'Pen ' + (i + 1), legal: canPen(g, i), apply: (gg: Game) => doPen(gg, i) })),
};
export const tavernBoard: BoardPlugin = {
  id: 'tavern', suit: 'H', track: TV.track, name: TV.name, svg: TV.svg, mech: TV.blurb,
  targets: (g) => [{ key: 'tavern', label: 'Add to run', legal: canTavern(g), apply: doTavern }],
};
