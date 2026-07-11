import type { BoardPlugin, PlacementTarget } from './types';
import type { Game, ChessPiece } from '../types';
import { modules } from '../../content';
import { log } from '../deck';
import { activeCard, activeSuit, activeValue, isFace } from '../helpers';
import { consumeActive } from '../cards';
import { gainReward, grantRune } from '../rewards';

const CH = modules.chess;
const DIRS_ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS_BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIRS_QUEEN = DIRS_ROOK.concat(DIRS_BISHOP);
const KNIGHT_HOPS = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

function pieceAt(g: Game, r: number, c: number): ChessPiece | null {
  return g.state.chess.pieces.find((p) => p.alive && p.r === r && p.c === c) || null;
}
function occupied(g: Game, r: number, c: number): 'champ' | 'enemy' | null {
  if (g.state.chess.champ[0] === r && g.state.chess.champ[1] === c) return 'champ';
  return pieceAt(g, r, c) ? 'enemy' : null;
}

// Squares attacked by the living court. Lines are blocked by any piece/champion.
export function chessAttacked(g: Game, excludeKing: boolean): Set<string> {
  const out = new Set<string>();
  for (const p of g.state.chess.pieces) {
    if (!p.alive) continue;
    if (excludeKing && p.t === 'K') continue;
    if (p.t === 'P') {
      for (const dc of [-1, 1]) { const r = p.r + 1, c = p.c + dc; if (r >= 0 && r < 5 && c >= 0 && c < 5) out.add(r + ',' + c); }
    } else if (p.t === 'N') {
      for (const [dr, dc] of KNIGHT_HOPS) { const r = p.r + dr!, c = p.c + dc!; if (r >= 0 && r < 5 && c >= 0 && c < 5) out.add(r + ',' + c); }
    } else if (p.t === 'K') {
      for (const [dr, dc] of DIRS_QUEEN) { const r = p.r + dr!, c = p.c + dc!; if (r >= 0 && r < 5 && c >= 0 && c < 5) out.add(r + ',' + c); }
    } else {
      const dirs = p.t === 'R' ? DIRS_ROOK : DIRS_BISHOP;
      for (const [dr, dc] of dirs) {
        let r = p.r + dr!, c = p.c + dc!;
        while (r >= 0 && r < 5 && c >= 0 && c < 5) {
          out.add(r + ',' + c);
          if (occupied(g, r, c)) break;
          r += dr!; c += dc!;
        }
      }
    }
  }
  return out;
}

function kingDefended(g: Game): boolean {
  const k = g.state.chess.pieces.find((p) => p.t === 'K' && p.alive);
  if (!k) return false;
  return chessAttacked(g, true).has(k.r + ',' + k.c);
}

export function chessTargets(g: Game): Array<[number, number]> {
  const c = activeCard(g);
  if (!g.settings.chess || !c || isFace(c)) return [];
  const su = activeSuit(g);
  const v = activeValue(g);
  const [cr, cc] = g.state.chess.champ;
  const targets: Array<[number, number]> = [];
  const addIfLegal = (r: number, col: number): boolean => {
    const occ = occupied(g, r, col);
    if (occ === 'champ') return false;
    if (occ === 'enemy') {
      const p = pieceAt(g, r, col)!;
      if (p.t === 'K' && kingDefended(g)) return false;
      targets.push([r, col]);
      return false;
    }
    targets.push([r, col]);
    return true;
  };
  if (su === 'C') {
    for (const [dr, dc] of KNIGHT_HOPS) {
      const r = cr + dr!, col = cc + dc!;
      if (r >= 0 && r < 5 && col >= 0 && col < 5) addIfLegal(r, col);
    }
  } else {
    const dirs = su === 'S' ? DIRS_ROOK : su === 'H' ? DIRS_BISHOP : DIRS_QUEEN;
    for (const [dr, dc] of dirs) {
      let r = cr + dr!, col = cc + dc!, steps = 1;
      while (r >= 0 && r < 5 && col >= 0 && col < 5 && steps <= v) {
        if (!addIfLegal(r, col)) break;
        r += dr!; col += dc!; steps++;
      }
    }
  }
  return targets;
}

export function doChessMove(g: Game, r: number, c: number): void {
  const legal = chessTargets(g).some(([tr, tc]) => tr === r && tc === c);
  if (!legal) return;
  const S = g.state;
  const card = activeCard(g)!;
  const victim = pieceAt(g, r, c);
  S.chess.champ = [r, c];
  if (victim) {
    victim.alive = false;
    log(S, 'Gambit: your Champion strikes down the ' + CH.glyph[victim.t] + ' ' + CH.name[victim.t] + '!', 'good');
    gainReward(g, victim.rw, CH.name[victim.t]);
    const rune = CH.victimRunes[victim.t];
    if (rune) grantRune(g, rune);
    if (victim.t === 'K') log(S, '♚ The Shadow King is toppled — the board is yours!', 'sys');
  } else {
    log(S, 'Gambit: your Champion advances to ' + 'abcde'[c] + (5 - r) + '.', 'lt');
  }
  if (card.rank === 1) { S.xp += 1; log(S, 'Ace bonus: +1 XP.', 'good'); }
  consumeActive(g);
}

// End-of-turn: if the champion sits on an attacked square, the court harries it.
export function chessEndTurnThreat(g: Game): void {
  if (!g.settings.chess) return;
  const S = g.state;
  if (chessAttacked(g, false).has(S.chess.champ[0] + ',' + S.chess.champ[1])) {
    S.threat += 1;
    log(S, '♟ The court harries your exposed Champion: +1 🔥 Threat.', 'bad');
  }
}

export const chessBoard: BoardPlugin = {
  id: 'chess', suit: 'S', track: 'glory', name: "The Tyrant's Gambit", svg: 'fd-chess',
  mech: 'Capture the shadow court — suit picks the move (♠ rook, ♥ bishop, ♦ queen, ♣ knight).',
  targets(g): PlacementTarget[] {
    return chessTargets(g).map(([r, c]) => ({
      key: 'chess:' + r + ':' + c,
      label: 'Move ' + 'abcde'[c] + (5 - r),
      legal: true,
      apply: (gg: Game) => doChessMove(gg, r, c),
    }));
  },
};
