import { makeRng } from '../engine';
import { classes, difficulties, market, type ClassId, type DifficultyId, type Suit } from '../content';
import { STRATEGIES, type Policy } from './strategies';
import { newMetrics, playGame, type Metrics } from './runner';
import type { Settings } from '../engine';

const ITEMS = market.items;

export interface LabConfig {
  n: number; // games per strategy
  cls: 'all' | ClassId;
  diff: 'cycle' | DifficultyId;
  strats: string[]; // strategy keys
  mods: 'all' | 'chosen' | 'rotate';
  base: Settings; // provides chosen-mods flags + fixed boards
  boardsMode: 'random' | 'fixed';
  seed?: number; // base seed → deterministic run
}

export interface LabReport {
  cfg: LabConfig;
  strategies: Record<string, Metrics>;
  notes: string[];
}

export interface Stat { min: number; med: number; avg: number; max: number }
export function labStat(arr: number[]): Stat {
  if (!arr.length) return { min: 0, med: 0, avg: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    min: sorted[0]!,
    med: sorted[Math.floor(sorted.length / 2)]!,
    avg: +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1),
    max: sorted[sorted.length - 1]!,
  };
}

const BOARD_POOL: Record<Suit, string[]> = {
  S: ['dungeon', 'catacombs', 'warcamp'],
  C: ['forest', 'thicket', 'stones'],
  H: ['temple', 'road', 'oracle'],
  D: ['market', 'gemcutter', 'traderoute'],
};

function settingsFor(cfg: LabConfig, g: number, diffs: string[]): Settings {
  const modeOn = (chosen: boolean, rotate: boolean): boolean =>
    cfg.mods === 'all' || (cfg.mods === 'chosen' && chosen) || (cfg.mods === 'rotate' && rotate);
  return {
    attrs: modeOn(cfg.base.attrs, g % 2 === 0),
    followers: modeOn(cfg.base.followers, g % 3 === 0),
    spells: modeOn(cfg.base.spells, g % 2 === 1),
    pyl: modeOn(cfg.base.pyl, (g >> 1) % 2 === 0),
    chess: modeOn(cfg.base.chess, g % 3 === 1),
    runes: modeOn(cfg.base.runes, g % 2 === 0),
    diff: (diffs[g % diffs.length] ?? 'adventurer') as DifficultyId,
    boards:
      cfg.boardsMode === 'random'
        ? ({ S: BOARD_POOL.S[g % 3]!, C: BOARD_POOL.C[(g + 1) % 3]!, H: BOARD_POOL.H[(g + 2) % 3]!, D: BOARD_POOL.D[g % 3]! } as Record<Suit, string>)
        : { ...cfg.base.boards },
  };
}

// Run the Proving Grounds: play cfg.n games per selected strategy and aggregate.
export function runLab(cfg: LabConfig, onProgress?: (strat: string, g: number, n: number) => void): LabReport {
  const report: LabReport = { cfg, strategies: {}, notes: [] };
  const clsList: ClassId[] = cfg.cls === 'all' ? (Object.keys(classes) as ClassId[]) : [cfg.cls];
  const diffs = cfg.diff === 'cycle' ? Object.keys(difficulties) : [cfg.diff];
  for (const sname of cfg.strats) {
    const pol = STRATEGIES[sname];
    if (!pol) continue;
    const M = newMetrics();
    for (let g = 0; g < cfg.n; g++) {
      const settings = settingsFor(cfg, g, diffs);
      const cls = clsList[g % clsList.length]!;
      const rnd = cfg.seed !== undefined ? makeRng(cfg.seed + g * 7919 + hashStrat(sname)) : Math.random;
      try {
        playGame(cls, settings, pol, M, rnd);
        M.n++;
      } catch {
        M.errors++;
      }
      if (onProgress && g % 10 === 0) onProgress(sname, g, cfg.n);
    }
    M.totals.sort((a, b) => a - b);
    report.strategies[sname] = M;
  }
  report.notes = labNotes(report);
  return report;
}

function hashStrat(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

const BOARD_CATS = ['dungeon', 'catacombs', 'warcamp', 'forest', 'thicket', 'stones', 'temple', 'road', 'oracle', 'market', 'gemcutter', 'traderoute', 'tower', 'bog', 'tavern', 'chess'];

// Auto-generated Designer's Notes — the same heuristics the prototype used.
export function labNotes(rep: LabReport): string[] {
  const notes: string[] = [];
  const strats = Object.entries(rep.strategies);
  if (!strats.length) return notes;
  const ranked = strats
    .map(([k, M]) => ({ k, label: (STRATEGIES[k] as Policy).label, avg: labStat(M.totals).avg }))
    .sort((a, b) => b.avg - a.avg);
  notes.push('Strategy spread: ' + ranked.map((r) => r.label + ' ' + r.avg).join(' > ') + '.');
  const rnd = ranked.find((r) => r.k === 'random');
  const top = ranked[0]!;
  if (rnd && top.k !== 'random' && rnd.avg > top.avg * 0.85)
    notes.push('⚠ Random play scores within 15% of the best strategy — decisions may not matter enough.');
  if (ranked.find((r) => r.k === 'gambler') === top) notes.push('⚠ Gambler is the top strategy — push-your-luck EV is too generous.');
  if (ranked.find((r) => r.k === 'defensive') === top) notes.push('⚠ Defensive is the top strategy — assaults may be overtuned.');

  const merged: Record<string, { uses: number; stars: number }> = {};
  for (const [k, M] of strats) {
    if (k === 'random') continue;
    for (const [cat, a] of Object.entries(M.byCat)) {
      const t = merged[cat] || (merged[cat] = { uses: 0, stars: 0 });
      t.uses += a.uses;
      t.stars += a.stars;
    }
  }
  const games = strats.filter(([k]) => k !== 'random').reduce((a, [, M]) => a + M.n, 0) || 1;
  const rows = BOARD_CATS.filter((c) => merged[c] && merged[c]!.uses > 0).map((c) => ({ c, perGame: +(merged[c]!.stars / games).toFixed(2) }));
  rows.sort((a, b) => b.perGame - a.perGame);
  if (rows.length) notes.push('Star output per game by area (skilled bots): ' + rows.map((r) => r.c + ' ' + r.perGame).join(', ') + '.');

  const sum = (f: (m: Metrics) => number) => strats.reduce((a, [, M]) => a + f(M), 0);
  const allGames = strats.reduce((a, [, M]) => a + M.n, 0) || 1;
  const dn = sum((M) => M.delve.n);
  if (dn > 0) notes.push('Delve: ' + ((100 * sum((M) => M.delve.busts)) / dn).toFixed(0) + '% bust rate, avg banked ' + (sum((M) => M.delve.gold) / dn).toFixed(1) + ' 🪙 per delve.');
  const ob = sum((M) => M.oracle.bets);
  if (ob > 0) notes.push('Oracle hit rate ' + ((100 * sum((M) => M.oracle.hits)) / ob).toFixed(0) + '%.');
  const an = sum((M) => M.assault.n);
  if (an > 0) notes.push('Assaults repelled ' + ((100 * sum((M) => M.assault.wins)) / an).toFixed(0) + '% of the time, avg ' + (sum((M) => M.assault.wounds) / an).toFixed(2) + ' wounds per failed defense.');
  const rt = sum((M) => M.war.routed);
  if (sum((M) => M.war.charged) + rt > 0) notes.push('War Camp: ' + sum((M) => M.war.charged) + ' charges vs ' + rt + ' routs.');
  const itemTotals: Record<string, number> = {};
  for (const [, M] of strats) for (const [it, c] of Object.entries(M.items)) itemTotals[it] = (itemTotals[it] || 0) + c;
  const cold = ITEMS.map((i) => i.name).filter((nm) => (itemTotals[nm] || 0) / allGames < 0.15);
  if (cold.length) notes.push('Cold Market items (bought in <15% of games): ' + cold.join(', ') + '.');
  if (sum((M) => M.runesGot) > 0) notes.push('Runecraft: ' + (sum((M) => M.runesGot) / allGames).toFixed(1) + ' runes and ' + (sum((M) => M.conf) / allGames).toFixed(2) + ' Confluences per game.');
  notes.push('Average leftover gold at game end: ' + (sum((M) => M.goldEnd) / allGames).toFixed(1) + ' 🪙.');
  return notes;
}

// Compact JSON summary comparable to Prototypes/flip-dungeon-labreport.json.
export function summarize(rep: LabReport) {
  const strategies: Record<string, Stat> = {};
  for (const [k, M] of Object.entries(rep.strategies)) strategies[k] = labStat(M.totals);
  const games = Object.values(rep.strategies).reduce((a, M) => a + M.n, 0) || 1;
  const areaYields: Record<string, number> = {};
  for (const M of Object.values(rep.strategies)) {
    for (const [cat, a] of Object.entries(M.byCat)) areaYields[cat] = +(((areaYields[cat] || 0) + a.stars)).toFixed(2);
  }
  for (const k of Object.keys(areaYields)) areaYields[k] = +((areaYields[k]! / games) * Object.keys(rep.strategies).length).toFixed(2);
  return { meta: { games: rep.cfg.n, strategies: rep.cfg.strats }, strategies, areaYields, notes: rep.notes };
}
