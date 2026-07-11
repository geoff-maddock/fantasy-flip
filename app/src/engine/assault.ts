import type { Game } from './types';
import { SUITS, rankLabel } from '../content';
import { diffOf } from './state';
import { drawAdv, log } from './deck';
import { totalDefense } from './helpers';
import { recruit } from './rewards';

function threatBase(g: Game, round: number): number {
  return diffOf(g.settings).base[String(round)] ?? 0;
}

// Round-end Monster Assault. Sets up the assault; with PYL on, the player may make
// a Last Stand (flip cards) before resolving. Without PYL it resolves immediately.
export function resolveAssault(g: Game): void {
  const S = g.state;
  S.assault = {
    base: threatBase(g, S.round) + S.threat,
    def: totalDefense(g),
    bonusDef: 0,
    bonusThreat: 0,
    flips: [],
    resolved: false,
  };
  S.threat = 0;
  if (!g.settings.pyl) resolveAssaultNow(g);
}

// PYL: flip one card — red rallies (+1 🛡 this battle), black emboldens (+1 🔥).
export function lastStandFlip(g: Game): void {
  const S = g.state;
  const a = S.assault;
  if (!a || a.resolved) return;
  const c = drawAdv(g);
  if (!c) return;
  a.flips.push(c);
  S.discard.push(c);
  if (SUITS[c.suit].red) { a.bonusDef++; log(S, 'Last Stand: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' rallies to you — +1 🛡.', 'good'); }
  else { a.bonusThreat++; log(S, 'Last Stand: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' emboldens the horde — +1 🔥.', 'bad'); }
}

export function resolveAssaultNow(g: Game): void {
  const S = g.state;
  const a = S.assault;
  if (!a || a.resolved) return;
  a.resolved = true;
  const threat = a.base + a.bonusThreat;
  const def = a.def + a.bonusDef;
  if (def >= threat) {
    const gg = S.round === 3 ? 2 : 1;
    a.outcome = { win: true, g: gg };
    S.glory += gg;
    S.xp += 1;
    log(S, 'Assault repelled! +' + gg + '⭐ Glory, +1 XP.', 'good');
    if (g.settings.followers) recruit(g, 'squire');
  } else {
    const cap = S.round + diffOf(g.settings).wcap;
    const w = Math.min(threat - def, cap);
    a.outcome = { win: false, w };
    S.wounds += w;
    log(S, 'Assault breaks through: +' + w + ' 🩸 Wounds.', 'bad');
    if (g.settings.pyl && S.wounds >= 5) log(S, 'You are Battered (5+ wounds): hand limit 2.', 'bad');
  }
  S.tempDef = 0;
}

// Close the assault and advance to the next round (or trigger final scoring).
// Returns true if the game is over.
export function closeAssault(g: Game): boolean {
  const S = g.state;
  if (S.assault && !S.assault.resolved) resolveAssaultNow(g);
  S.assault = null;
  if (S.round === 3) {
    S.over = true;
    return true;
  }
  S.round++;
  S.turn = 1;
  return false;
}
