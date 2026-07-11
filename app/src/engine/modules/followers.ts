import type { Game } from '../types';
import { log } from '../deck';
import { activeCard, activeValue, isFace } from '../helpers';

type FollowerKey = 'squire' | 'herbalist' | 'acolyte' | 'trader';

// Spend a banked follower for its one-shot rule-break.
export function spendFollower(g: Game, k: FollowerKey): void {
  const S = g.state;
  if (!g.settings.followers || S.followers[k] <= 0) return;
  if (k === 'squire') {
    const c = activeCard(g);
    if (!S.active || !c || isFace(c)) { log(S, 'Squire: select a number card first.', 'bad'); return; }
    S.followers[k]--;
    if (S.active.forced != null) S.active.forced = Math.min(13, S.active.forced + 2);
    else S.active.mod = Math.min(13 - c.rank, S.active.mod + 2);
    log(S, '⚔ A Squire lends their strength: +2 (card is now ' + activeValue(g) + ').', 'sys');
  } else if (k === 'herbalist') {
    S.followers[k]--;
    S.trailBreaks++;
    log(S, '🌿 The Herbalist marks a hidden path — next trail space ignores the rising rule.', 'sys');
  } else if (k === 'acolyte') {
    S.followers[k]--;
    S.parityBreaks++;
    log(S, '🕯 The Acolyte prepares a rite — next altar offering ignores odd/even.', 'sys');
  } else if (k === 'trader') {
    S.followers[k]--;
    S.gold += 2;
    log(S, '🧺 The Trader turns a tidy profit: +2 🪙.', 'sys');
  }
}

export const FOLLOWER_KEYS: FollowerKey[] = ['squire', 'herbalist', 'acolyte', 'trader'];
