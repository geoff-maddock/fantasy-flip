import type { Card, Game } from './types';
import { rankLabel, SUITS } from '../content';
import { drawAdv, log } from './deck';

// PYL: the Delve. Opened after clearing a dungeon room when the module is on.
// Interactive (flip/bank); bots drive it via the same functions.
export function openDelve(g: Game, depth: number): void {
  g.state.delve = { depth, lootG: 0, lootM: 0, blacks: 0, flips: [] };
}

export function delveFlip(g: Game): void {
  const S = g.state;
  if (!S.delve) return;
  const c = drawAdv(g);
  if (!c) { delveBank(g); return; }
  S.delve.flips.push(c);
  S.discard.push(c);
  if (SUITS[c.suit].red) {
    S.delve.lootG += S.delve.depth;
    if (c.rank >= 11) S.delve.lootM += 1;
  } else {
    if (c.rank >= 11) { delveBust(g, c); return; }
    S.delve.blacks++;
    if (S.delve.blacks >= 2) { delveBust(g, c); return; }
  }
}

function delveBust(g: Game, c: Card): void {
  const S = g.state;
  S.wounds += 1;
  log(S, 'Delve: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' springs an ambush — you flee with nothing and take 1 🩸 Wound!', 'bad');
  S.delve!.busted = c;
}

export function delveBank(g: Game): void {
  const S = g.state;
  if (!S.delve) return;
  if (!S.delve.busted && (S.delve.lootG || S.delve.lootM)) {
    S.gold += S.delve.lootG;
    S.mana += S.delve.lootM;
    log(S, 'Delve: you slip out with +' + S.delve.lootG + ' 🪙' + (S.delve.lootM ? ' and +' + S.delve.lootM + ' 🔮' : '') + '.', 'good');
  } else if (!S.delve.busted) {
    log(S, 'Delve: you leave the shadows untouched.', 'lt');
  }
  S.delve = null;
}
