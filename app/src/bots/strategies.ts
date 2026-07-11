import type { Card, GameState } from '../engine';

// A bot policy scores every enumerated action and makes the push-your-luck /
// event / charge decisions. Ported verbatim from the prototype's LAB_STRATS so
// the balance findings reproduce. `rnd` is injected (defaults to Math.random)
// so batches can be made deterministic.
export type Rnd = () => number;
export type FaceChoice = string;

export interface Policy {
  label: string;
  noise: number;
  starBias: number;
  wcat: Record<string, number>;
  itemBias?: Record<string, number>;
  face: (c: Card, chs: string[], S: GameState, rnd: Rnd) => FaceChoice;
  aceModes: Array<number | null>;
  delveGo: (d: { blacks: number; flips: unknown[] }, rnd: Rnd) => boolean;
  over: (rnd: Rnd) => boolean;
  lsGo: (t: number, d: number, f: number, rnd: Rnd) => boolean;
  chargeAt: number;
  oracle: (v: number, rnd: Rnd) => 'hi' | 'lo' | null;
  unlockP: number;
  stoneFirst?: boolean;
}

export const STRATEGIES: Record<string, Policy> = {
  random: {
    label: 'Random', noise: 3.0, starBias: 1.0, wcat: {},
    face: (_c, chs, _S, rnd) => chs[Math.floor(rnd() * chs.length)]!,
    aceModes: [1, 11],
    delveGo: (_d, rnd) => rnd() < 0.5, over: (rnd) => rnd() < 0.15,
    lsGo: (_t, _d, f, rnd) => rnd() < 0.5 && f < 3, chargeAt: 12,
    oracle: (_v, rnd) => (rnd() < 0.5 ? 'hi' : 'lo'), unlockP: 0.2,
  },
  greedy: {
    label: 'Greedy', noise: 0.35, starBias: 2.2, wcat: {},
    face: (c, _chs, S) => (c.rank === 11 ? 'gold' : c.rank === 12 ? (S.wounds >= 2 ? 'heal' : 'mana') : baseThreatOver(S) ? 'war' : 'lore'),
    aceModes: [1, 11],
    delveGo: (d) => d.blacks === 0 && d.flips.length < 2, over: () => false,
    lsGo: (t, d, f) => t > d && t - d <= 2 && f < 3, chargeAt: 15,
    oracle: (v) => (v >= 7 ? 'lo' : 'hi'), unlockP: 0.5,
  },
  specialist: {
    label: 'Specialist', noise: 0.35, starBias: 1.6,
    wcat: { dungeon: 2, catacombs: 2, warcamp: 2, forest: 2, thicket: 2, stones: 2, temple: 2, road: 2, oracle: 2, market: 2, gemcutter: 2, traderoute: 2, tower: 1.5, bog: 1.5, tavern: 1.5 },
    face: (c) => (c.rank === 11 ? 'cards' : c.rank === 12 ? 'enchant' : 'lore'),
    aceModes: [1, 11],
    delveGo: (d) => d.blacks === 0 && d.flips.length < 2, over: (rnd) => rnd() < 0.2,
    lsGo: (t, d, f) => t > d && f < 2, chargeAt: 14,
    oracle: (v) => (v >= 7 ? 'lo' : 'hi'), unlockP: 0.7,
  },
  defensive: {
    label: 'Defensive', noise: 0.4, starBias: 1.4, wcat: { dungeon: 1 },
    itemBias: { Shield: 2, Sword: 1.5, Torch: 0.5 },
    face: (c, _chs, S) => (c.rank === 11 ? 'gold' : c.rank === 12 ? (S.wounds ? 'heal' : 'mana') : S.turn >= 3 ? 'guard' : 'war'),
    aceModes: [1, 11],
    delveGo: (d) => d.flips.length < 1, over: () => false,
    lsGo: (t, d, f) => t > d && t - d <= 2 && f < 2, chargeAt: 12,
    oracle: (v) => (v >= 8 ? 'lo' : v <= 4 ? 'hi' : null), unlockP: 0.3, stoneFirst: true,
  },
  gambler: {
    label: 'Gambler', noise: 0.8, starBias: 1.3, wcat: { warcamp: 1, oracle: 1 },
    face: (c) => (c.rank === 11 ? 'cards' : c.rank === 12 ? 'mana' : 'lore'),
    aceModes: [11, 1],
    delveGo: (_d, rnd) => rnd() < 0.75, over: (rnd) => rnd() < 0.5,
    lsGo: (t, d, f, rnd) => (t > d && f < 4) || (f < 1 && rnd() < 0.3), chargeAt: 17,
    oracle: () => 'hi', unlockP: 0.35,
  },
};

// Helper: is the round's incoming threat above current defense? Kept faithful to
// the prototype's inline `(threatBase(round)+threat) > totalDefense()`.
import { difficulties } from '../content';
function baseThreatOver(S: GameState): boolean {
  const base = difficulties.adventurer!.base[String(S.round)] ?? 0;
  let def = S.defBonus + (S.tempDef || 0);
  if (S.cls === 'knight') def += 1;
  if (S.items['Shield']) def += 1;
  return base + S.threat > def;
}
