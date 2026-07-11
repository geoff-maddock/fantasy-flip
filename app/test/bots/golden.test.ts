import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
// resolve relative to the app dir (vitest runs from the package root)
import { runLab, labStat, summarize, type LabConfig } from '../../src/bots';
import { defaultSettings } from '../../src/engine';

// Full definitive pass: 5 strategies × 120 games = 600 games, all modules, random
// board mixes — the same shape as Prototypes/flip-dungeon-labreport.json. Writes a
// golden summary artifact and asserts the prototype's headline balance findings
// still hold after the port.
const cfg: LabConfig = {
  n: 120,
  cls: 'all',
  diff: 'cycle',
  strats: ['random', 'greedy', 'specialist', 'defensive', 'gambler'],
  mods: 'all',
  base: defaultSettings(),
  boardsMode: 'random',
  seed: 7,
};

describe('600-game definitive balance pass', () => {
  const rep = runLab(cfg);
  const avg = (k: string) => labStat(rep.strategies[k]!.totals).avg;

  it('writes a golden report artifact', () => {
    const out = resolve(process.cwd(), 'test/golden/lab-summary.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(summarize(rep), null, 2));
    expect(true).toBe(true);
  });

  it('reproduces the strategy ranking (skilled play well ahead of random)', () => {
    // prototype: Gambler 77 > Specialist 71 > Defensive 61 > Greedy 57 > Random 54
    expect(avg('specialist')).toBeGreaterThan(avg('greedy'));
    expect(avg('gambler')).toBeGreaterThan(avg('random') * 1.1);
    expect(avg('specialist')).toBeGreaterThan(avg('random') * 1.1);
  });

  it('reproduces the Market being a top star-yield area', () => {
    const s = summarize(rep);
    const yields = Object.entries(s.areaYields).filter(([k]) => k !== 'turn/assault' && k !== 'face' && k !== 'camp');
    yields.sort((a, b) => b[1] - a[1]);
    const top3 = yields.slice(0, 3).map(([k]) => k);
    expect(top3).toContain('market');
  });

  it('emits designer notes on economy and assaults', () => {
    expect(rep.notes.some((n) => n.includes('leftover gold'))).toBe(true);
    expect(rep.notes.some((n) => n.includes('Assaults repelled'))).toBe(true);
  });
});
