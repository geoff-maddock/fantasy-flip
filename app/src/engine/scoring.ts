import type { Game } from './types';

export interface ScoreResult {
  total: number;
  tier: string;
  rows: Array<[string, number]>;
  fortune: number; // fortune stars including gold conversion
  goldStars: number;
}

// Final scoring. Pure — returns the breakdown without touching state or the DOM.
export function finalScore(g: Game): ScoreResult {
  const S = g.state;
  const goldStars = Math.floor(S.gold / 6);
  const fortune = S.fortune + goldStars;
  const stars = S.glory + S.lore + S.spirit + fortune;
  const wc = S.cls === 'necromancer' ? 1 : 2;
  const total = stars * 2 + S.xp - S.wounds * wc;
  const rows: Array<[string, number]> = [
    ['Glory ⭐ (' + S.glory + ' × 2)', S.glory * 2],
    ['Lore ⭐ (' + S.lore + ' × 2)', S.lore * 2],
    ['Spirit ⭐ (' + S.spirit + ' × 2)', S.spirit * 2],
    ['Fortune ⭐ (' + S.fortune + ' items' + (goldStars ? ' + ' + goldStars + ' from gold hoard' : '') + ') × 2', fortune * 2],
    ['Experience (1 pt each)', S.xp],
    ['Wounds (−' + wc + ' pt' + (wc > 1 ? 's' : '') + ' each' + (S.cls === 'necromancer' ? ', Necromancer' : '') + ')', -S.wounds * wc],
  ];
  let tier = 'Village Peasant';
  if (total >= 25) tier = 'Wandering Adventurer';
  if (total >= 40) tier = 'Hero of the Realm';
  if (total >= 55) tier = 'Champion of Legend';
  if (total >= 70) tier = 'Mythic Slayer';
  if (total >= 85) tier = 'Living Legend';
  return { total, tier, rows, fortune, goldStars };
}
