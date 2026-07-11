import type { Game } from './types';
import { advanced, LOCS } from '../content';
import { log } from './deck';

type CharterKey = 'tower' | 'bog' | 'tavern';
const UNLOCK_COST = advanced.unlockCost;

export function unlockCost(g: Game): number {
  return UNLOCK_COST[Math.min(g.state.unlockCount, UNLOCK_COST.length - 1)]!;
}

// Charter a new location with XP. Chartering is a tempo bet — spent XP is a point
// off the final tally, so the location must be finished to break even.
export function unlockLoc(g: Game, key: CharterKey): void {
  const S = g.state;
  if (S.unlocked[key]) return;
  const cost = unlockCost(g);
  if (S.xp < cost) { log(S, 'You need ' + cost + ' XP to charter ' + LOCS[key].name + '.', 'bad'); return; }
  S.xp -= cost;
  S.unlocked[key] = true;
  S.unlockCount++;
  log(S, '⚜ The Guild charters ' + LOCS[key].name + ' for ' + cost + ' XP! A new adventure opens.', 'sys');
}
