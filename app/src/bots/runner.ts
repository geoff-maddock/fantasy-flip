import {
  createGame,
  startGame,
  isGameOver,
  finalScore,
  activeCard,
  activeValue,
  isFace,
  playEvent,
  campCard,
  useAbility,
  endTurn,
  resolveAssaultNow,
  closeAssault,
  lastStandFlip,
  delveFlip,
  delveBank,
  overdraw,
  usePower,
  runeCharges,
  spendFollower,
  fillThicketCell,
  thicketLegalCells,
  unlockLoc,
  unlockCost,
  type Game,
  type Settings,
  type GameState,
  type EventChoice,
} from '../engine';
import { canDungeon, doDungeon } from '../engine/boards/dungeon';
import { canForest, doForest } from '../engine/boards/forest';
import { canAltar, doAltar } from '../engine/boards/temple';
import { canBuy, doBuy, canSell, trySell } from '../engine/boards/market';
import { canCata, doCata } from '../engine/boards/catacombs';
import { canLine, doLine, lineSum, canCharge, chargeLine } from '../engine/boards/warcamp';
import { canThicket, doThicketStart } from '../engine/boards/thicket';
import { canStones, doStones } from '../engine/boards/stones';
import { canRoad, doRoad } from '../engine/boards/road';
import { canOracle, doOracle } from '../engine/boards/oracle';
import { canGem, doGem } from '../engine/boards/gemcutter';
import { canRoute, doRoute } from '../engine/boards/traderoute';
import { canTower, doTower, canPen, doPen, canTavern, doTavern } from '../engine/boards/charter';
import { chessTargets, doChessMove, chessAttacked } from '../engine/boards/chess';
import { canTrain, doTrain, ATTR_KEYS } from '../engine/modules/attributes';
import { dungeon, forest, temple, market, advanced, type Reward } from '../content';
import type { Policy, Rnd } from './strategies';

const ROOMS = dungeon.rooms;
const CRYPTS = advanced.catacombs.crypts;
const FSLOTS = forest.slots;
const STONE_RW = advanced.stones.pairRewards;
const ALTARS = temple.altars;
const SHRINES = advanced.road.shrines;
const GEMS = advanced.gemcutter.gems;
const EDGES = advanced.traderoute.edges;
const TOWER = advanced.tower.floors;
const BOG_GLORY = advanced.bog.glory;
const TAVERN = advanced.tavern.boxes;
const ITEMS = market.items;
const WAR = advanced.warcamp;

interface Opt { cat: string; est: number; run: (g: Game) => void }

function est(S: GameState, rw?: Reward): number {
  if (!rw) return 0;
  return (
    ((rw.glory || 0) + (rw.lore || 0) + (rw.spirit || 0) + (rw.fortune || 0)) * 2 +
    (rw.xp || 0) + (rw.gold || 0) * 0.3 + (rw.mana || 0) * 0.35 + (rw.def || 0) * 1.2 + (rw.heal || 0) * (S.wounds ? 1 : 0.1)
  );
}

// King's "war" (threat-reduction) choice maps to the engine's 'threat' option.
function faceChoice(pick: string): EventChoice {
  return (pick === 'war' ? 'threat' : pick) as EventChoice;
}

function options(g: Game, pol: Policy, rnd: Rnd): Opt[] {
  const S = g.state;
  const c = activeCard(g);
  if (!c) return [];
  const out: Opt[] = [];
  if (isFace(c)) {
    const chs = c.rank === 11 ? ['gold', 'cards'] : c.rank === 12 ? ['mana', 'heal', 'enchant'] : ['war', 'guard', 'lore'];
    const pick = pol.face(c, chs, S, rnd) || chs[0]!;
    out.push({ cat: 'face', est: 1.4, run: (gg) => playEvent(gg, faceChoice(pick)) });
    return out;
  }
  if (canDungeon(g)) { const r = ROOMS[S.dungeonNext]!; out.push({ cat: 'dungeon', est: est(S, r.rw) + (r.t === 'B' ? 1.2 : 0) + (g.settings.pyl ? 0.4 : 0), run: doDungeon }); }
  if (canCata(g)) out.push({ cat: 'catacombs', est: est(S, CRYPTS[(S.cata.pos + activeValue(g)) % 10]!.rw), run: doCata });
  for (let i = 0; i < 2; i++) if (canLine(g, i)) { const after = lineSum(g, i) + activeValue(g); out.push({ cat: 'warcamp', est: after <= WAR.high ? (after >= WAR.low ? 1.6 : 0.5) : -1.5, run: (gg) => doLine(gg, i) }); }
  if (canForest(g)) out.push({ cat: 'forest', est: est(S, FSLOTS[S.trail.length]!.rw), run: doForest });
  if (canThicket(g)) out.push({ cat: 'thicket', est: 0.9, run: doThicketStart });
  if (canStones(g)) { const k = S.stones.findIndex((col) => col.length < 2); out.push({ cat: 'stones', est: S.stones[k]!.length === 1 ? est(S, STONE_RW[k]!) : 0.35, run: doStones }); }
  for (const alt of ['sun', 'moon'] as const) if (canAltar(g, alt)) { const idx = S.altars[alt].length; out.push({ cat: 'temple', est: est(S, ALTARS[alt].boxes[idx]) + (idx === 3 ? 2 : 0.6) + activeValue(g) * 0.06, run: (gg) => doAltar(gg, alt) }); }
  if (canRoad(g)) { const i = SHRINES.findIndex((s, j) => j > S.roadPos && s.v === activeValue(g)); out.push({ cat: 'road', est: est(S, SHRINES[i]!.rw) - (i - S.roadPos - 1) * 0.5, run: doRoad }); }
  if (canOracle(g)) { const gu = pol.oracle(activeValue(g), rnd); if (gu) out.push({ cat: 'oracle', est: 1.3, run: (gg) => doOracle(gg, gu) }); }
  for (const k of ['emerald', 'ruby', 'diamond'] as const) if (canGem(g, k)) out.push({ cat: 'gemcutter', est: S.gems[k].length === 2 ? est(S, GEMS[k].rw) : 0.55, run: (gg) => doGem(gg, k) });
  for (let i = 0; i < EDGES.length; i++) if (canRoute(g, i)) { const e = EDGES[i]!; const nt = (S.routes.towns[e.a] ? 0 : 1) + (S.routes.towns[e.b] ? 0 : 1); out.push({ cat: 'traderoute', est: 0.4 + nt * 1.1, run: (gg) => doRoute(gg, i) }); }
  if (canTower(g)) out.push({ cat: 'tower', est: est(S, TOWER[S.tower.length]!), run: doTower });
  for (let i = 0; i < 3; i++) if (canPen(g, i)) out.push({ cat: 'bog', est: S.pens[i]!.length === 1 ? BOG_GLORY[i]! * 2 : 0.4, run: (gg) => doPen(gg, i) });
  if (canTavern(g)) out.push({ cat: 'tavern', est: est(S, TAVERN[S.run.length]!), run: doTavern });
  if (g.settings.chess) { const att = chessAttacked(g, false); for (const [r, cc] of chessTargets(g)) { const p = S.chess.pieces.find((pp) => pp.alive && pp.r === r && pp.c === cc); out.push({ cat: 'chess', est: (p ? est(S, p.rw) + 0.5 : 0) - (att.has(r + ',' + cc) ? 0.7 : 0) - 0.1, run: (gg) => doChessMove(gg, r, cc) }); } }
  if (g.settings.attrs) for (const k of ATTR_KEYS) if (canTrain(g, k)) out.push({ cat: 'train', est: 0.9, run: (gg) => doTrain(gg, k) });
  for (let i = 0; i < ITEMS.length; i++) if (canBuy(g, i)) { const it = ITEMS[i]!; out.push({ cat: 'market', est: 1.6 + ((pol.itemBias && pol.itemBias[it.name]) || 0), run: (gg) => doBuy(gg, i) }); }
  if (canSell(g)) out.push({ cat: 'market', est: Math.ceil(activeValue(g) / 2) * 0.3, run: trySell });
  out.push({ cat: 'camp', est: 0.15, run: campCard });
  return out;
}

interface Cand { src: 'row' | 'hand'; idx: number; forced: number | null; opt: Opt; score: number }

function candidates(g: Game, pol: Policy, rnd: Rnd): Cand[] {
  const S = g.state;
  const cands: Cand[] = [];
  const sources: Array<['row' | 'hand', number]> = [];
  if (S.draftsLeft > 0) S.row.forEach((slot, i) => { if (!slot.taken) sources.push(['row', i]); });
  S.hand.forEach((_, i) => sources.push(['hand', i]));
  for (const [src, idx] of sources) {
    const card = src === 'row' ? S.row[idx]!.card : S.hand[idx]!;
    const modes = card.rank === 1 ? pol.aceModes : [null];
    for (const forced of modes) {
      S.active = { source: src, idx, mod: 0, suit: null, forced, freeClubUsed: false };
      for (const opt of options(g, pol, rnd)) {
        const score = opt.est * pol.starBias + (pol.wcat[opt.cat] || 0) + rnd() * pol.noise;
        cands.push({ src, idx, forced, opt, score });
      }
    }
  }
  S.active = null;
  cands.sort((a, b) => b.score - a.score);
  return cands;
}

export interface Metrics {
  n: number;
  totals: number[];
  tiers: Record<string, number>;
  byCat: Record<string, { uses: number; stars: number; gold: number; xp: number; wounds: number }>;
  delve: { n: number; busts: number; gold: number };
  ls: { n: number; flips: number };
  assault: { n: number; wins: number; wounds: number };
  oracle: { bets: number; hits: number };
  war: { charged: number; routed: number };
  items: Record<string, number>;
  unlocks: Record<string, number>;
  conf: number;
  runesGot: number;
  runeCasts: number;
  overdraws: number;
  captures: number;
  goldEnd: number;
  woundsEnd: number;
  complete: { dungeon: number; trail: number; towns: number };
  errors: number;
}

export function newMetrics(): Metrics {
  return {
    n: 0, totals: [], tiers: {}, byCat: {}, delve: { n: 0, busts: 0, gold: 0 },
    ls: { n: 0, flips: 0 }, assault: { n: 0, wins: 0, wounds: 0 }, oracle: { bets: 0, hits: 0 },
    war: { charged: 0, routed: 0 }, items: {}, unlocks: {}, conf: 0, runesGot: 0, runeCasts: 0,
    overdraws: 0, captures: 0, goldEnd: 0, woundsEnd: 0, complete: { dungeon: 0, trail: 0, towns: 0 }, errors: 0,
  };
}

const snap = (S: GameState) => ({ g: S.gold, m: S.mana, x: S.xp, w: S.wounds, st: S.glory + S.lore + S.spirit + S.fortune });
const diff = (S: GameState, a: ReturnType<typeof snap>) => ({ gold: S.gold - a.g, xp: S.xp - a.x, wounds: S.wounds - a.w, stars: S.glory + S.lore + S.spirit + S.fortune - a.st });

function preActions(g: Game, pol: Policy, M: Metrics, rnd: Rnd): void {
  const S = g.state;
  for (let i = 0; i < 2; i++) if (canCharge(g, i) && lineSum(g, i) >= pol.chargeAt) {
    const s0 = snap(S); chargeLine(g, i);
    const a = M.byCat['warcamp'] || (M.byCat['warcamp'] = { uses: 0, stars: 0, gold: 0, xp: 0, wounds: 0 });
    a.stars += diff(S, s0).stars; M.war.charged++;
  }
  if (g.settings.runes) {
    const order = pol.stoneFirst ? (['stone', 'gale', 'tide'] as const) : (['gale', 'tide', 'stone'] as const);
    for (const t of order) if (runeCharges(g, t) > 0 && rnd() < 0.5) { usePower(g, t); M.runeCasts++; break; }
  }
  if (g.settings.pyl && S.hand.length < 3 && pol.over(rnd)) { overdraw(g); M.overdraws++; }
  if (!S.abilityUsed && rnd() < 0.35) useAbility(g);
  if (g.settings.followers) for (const k of ['herbalist', 'acolyte', 'trader'] as const) if (S.followers[k] > 0 && rnd() < 0.3) spendFollower(g, k);
  if (S.xp >= unlockCost(g) + 2 && rnd() < pol.unlockP) {
    for (const k of ['tower', 'bog', 'tavern'] as const) if (!S.unlocked[k]) { unlockLoc(g, k); break; }
  }
}

function handleAssault(g: Game, pol: Policy, M: Metrics, rnd: Rnd): void {
  const S = g.state;
  let flips = 0;
  while (g.settings.pyl && S.assault && !S.assault.resolved && pol.lsGo(S.assault.base + S.assault.bonusThreat, S.assault.def + S.assault.bonusDef, flips, rnd)) { lastStandFlip(g); flips++; M.ls.flips++; }
  if (flips) M.ls.n++;
  resolveAssaultNow(g);
  if (S.assault!.outcome!.win) M.assault.wins++;
  else M.assault.wounds += (S.assault!.outcome as { w: number }).w;
  M.assault.n++;
  closeAssault(g);
}

// Play one full game headlessly under a policy, recording per-area metrics.
export function playGame(cls: Parameters<typeof createGame>[0]['cls'], settings: Settings, pol: Policy, M: Metrics, rnd: Rnd): void {
  const g = createGame({ cls, settings, rng: rnd }); // deck + decisions share one generator
  startGame(g);
  const S = g.state;
  let guard = 0;
  const attr = (cat: string, d: ReturnType<typeof diff>) => {
    const a = M.byCat[cat] || (M.byCat[cat] = { uses: 0, stars: 0, gold: 0, xp: 0, wounds: 0 });
    a.uses++; a.stars += d.stars; a.gold += Math.max(0, d.gold); a.xp += d.xp; a.wounds += Math.max(0, d.wounds);
  };
  while (!isGameOver(g)) {
    if (++guard > 4000) throw new Error('lab loop guard');
    if (S.fill) { const cells = thicketLegalCells(g); if (cells.length) fillThicketCell(g, cells[Math.floor(rnd() * cells.length)]!); else S.fill = null; continue; }
    if (S.delve) {
      M.delve.n++;
      while (S.delve && !S.delve.busted && pol.delveGo(S.delve, rnd)) delveFlip(g);
      if (S.delve) { if (S.delve.busted) M.delve.busts++; else M.delve.gold += S.delve.lootG; delveBank(g); }
      continue;
    }
    preActions(g, pol, M, rnd);
    const cands = candidates(g, pol, rnd);
    if (!cands.length) {
      const s0 = snap(S);
      endTurn(g);
      if (S.assault) handleAssault(g, pol, M, rnd);
      attr('turn/assault', diff(S, s0));
      continue;
    }
    const pick = cands[0]!;
    S.active = { source: pick.src, idx: pick.idx, mod: 0, suit: null, forced: pick.forced, freeClubUsed: false };
    if (g.settings.runes && runeCharges(g, 'ember') > 0 && !isFace(activeCard(g)!) && rnd() < 0.3) { usePower(g, 'ember'); M.runeCasts++; }
    const s0 = snap(S);
    pick.opt.run(g);
    attr(pick.opt.cat, diff(S, s0));
    S.active = null;
    if (S.draftsLeft === 0 && (S.hand.length === 0 || rnd() < 0.35)) {
      const s1 = snap(S);
      endTurn(g);
      if (S.assault) handleAssault(g, pol, M, rnd);
      attr('turn/assault', diff(S, s1));
    }
  }
  // census
  const sc = finalScore(g);
  M.totals.push(sc.total);
  M.tiers[sc.tier] = (M.tiers[sc.tier] || 0) + 1;
  M.goldEnd += S.gold; M.woundsEnd += S.wounds;
  M.oracle.bets += S.oracle.slots.length;
  M.oracle.hits += S.oracle.slots.filter((s) => s.hit).length;
  M.war.routed += S.lines.filter((l) => l.st === 'routed').length;
  for (const it of Object.keys(S.items)) M.items[it] = (M.items[it] || 0) + 1;
  for (const k of ['tower', 'bog', 'tavern'] as const) if (S.unlocked[k]) M.unlocks[k] = (M.unlocks[k] || 0) + 1;
  M.conf += S.confluences;
  M.runesGot += S.runes.ember + S.runes.tide + S.runes.gale + S.runes.stone;
  M.captures += S.chess.pieces.filter((p) => !p.alive).length;
  M.complete.dungeon += S.dungeonNext; M.complete.trail += S.trail.length;
  M.complete.towns += S.routes.towns.filter((x) => x).length;
}
