import { describe, it, expect } from 'vitest';
import { runLab, labStat, summarize, type LabConfig } from '../../src/bots';
import { defaultSettings } from '../../src/engine';

// The parity gate: run the Proving Grounds headlessly and confirm it reproduces
// the balance shape of Prototypes/flip-dungeon-labreport.json — skilled play
// beats random, every board earns, and the run is deterministic under a seed.
const cfg: LabConfig = {
  n: 60,
  cls: 'all',
  diff: 'cycle',
  strats: ['random', 'greedy', 'specialist', 'defensive', 'gambler'],
  mods: 'all',
  base: defaultSettings(),
  boardsMode: 'random',
  seed: 1,
};

describe('Proving Grounds parity gate', () => {
  const rep = runLab(cfg);

  it('completes every game with no engine errors', () => {
    for (const [name, M] of Object.entries(rep.strategies)) {
      expect(M.n, name).toBe(cfg.n);
      expect(M.errors, name).toBe(0);
      expect(M.totals.length, name).toBe(cfg.n);
    }
  });

  it('shows decisions matter — skilled strategies beat random', () => {
    const avg = (k: string) => labStat(rep.strategies[k]!.totals).avg;
    const random = avg('random');
    expect(avg('specialist')).toBeGreaterThan(random);
    expect(avg('gambler')).toBeGreaterThan(random);
    // scores land in a sane band (prototype saw ~50–80 avg)
    expect(avg('specialist')).toBeGreaterThan(30);
    expect(avg('specialist')).toBeLessThan(140);
  });

  it('every board area earns stars across skilled play', () => {
    const merged: Record<string, number> = {};
    for (const [k, M] of Object.entries(rep.strategies)) {
      if (k === 'random') continue;
      for (const [cat, a] of Object.entries(M.byCat)) merged[cat] = (merged[cat] || 0) + a.uses;
    }
    // the four core boards are always in the pool and must see use
    for (const core of ['dungeon', 'forest', 'temple', 'market']) {
      expect(merged[core], core).toBeGreaterThan(0);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const rep2 = runLab(cfg);
    for (const k of cfg.strats) {
      expect(rep2.strategies[k]!.totals).toEqual(rep.strategies[k]!.totals);
    }
  });

  it('produces a JSON summary and designer notes', () => {
    const s = summarize(rep);
    expect(s.strategies.gambler).toBeTruthy();
    expect(Object.keys(s.areaYields).length).toBeGreaterThan(4);
    expect(rep.notes.length).toBeGreaterThan(3);
    expect(rep.notes.some((n) => n.startsWith('Strategy spread'))).toBe(true);
  });
});
