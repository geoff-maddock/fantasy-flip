import type { Game, Suit } from '../types';
import { registerBoard, activeBoard, type BoardPlugin, type PlacementTarget } from './types';
import { dungeonBoard } from './dungeon';
import { forestBoard } from './forest';
import { templeBoard } from './temple';
import { marketBoard } from './market';
import { catacombsBoard } from './catacombs';
import { warcampBoard } from './warcamp';
import { thicketBoard } from './thicket';
import { stonesBoard } from './stones';
import { roadBoard } from './road';
import { oracleBoard } from './oracle';
import { gemcutterBoard } from './gemcutter';
import { traderouteBoard } from './traderoute';
import { towerBoard, bogBoard, tavernBoard } from './charter';
import { chessBoard } from './chess';

// Register every board. Suit-slot boards, alternate boards, charter boards, and
// the chess module board all live in one registry; the engine core never
// hard-codes any board's rules.
for (const b of [
  dungeonBoard, forestBoard, templeBoard, marketBoard,
  catacombsBoard, warcampBoard, thicketBoard, stonesBoard,
  roadBoard, oracleBoard, gemcutterBoard, traderouteBoard,
  towerBoard, bogBoard, tavernBoard, chessBoard,
]) {
  registerBoard(b);
}

export { registerBoard, activeBoard, getBoard } from './types';
export type { BoardPlugin, PlacementTarget } from './types';

const SUIT_ORDER: Suit[] = ['S', 'C', 'H', 'D'];

// Every board currently in play: one per suit slot, plus unlocked charter boards
// and the chess board when its module is on.
export function activeBoards(g: Game): BoardPlugin[] {
  const out: BoardPlugin[] = [];
  for (const s of SUIT_ORDER) {
    const b = activeBoard(g, s);
    if (b) out.push(b);
  }
  if (g.state.unlocked.tower) out.push(towerBoard);
  if (g.state.unlocked.bog) out.push(bogBoard);
  if (g.state.unlocked.tavern) out.push(tavernBoard);
  if (g.settings.chess) out.push(chessBoard);
  return out;
}

// All placement targets across active boards for the current active card.
export function allTargets(g: Game): Array<PlacementTarget & { board: string }> {
  const out: Array<PlacementTarget & { board: string }> = [];
  for (const b of activeBoards(g)) {
    for (const t of b.targets(g)) out.push({ ...t, board: b.id });
  }
  return out;
}

// Free (non-card-consuming) board actions — e.g. War Camp charges.
export function allFreeActions(g: Game): Array<PlacementTarget & { board: string }> {
  const out: Array<PlacementTarget & { board: string }> = [];
  for (const b of activeBoards(g)) {
    if (!b.freeActions) continue;
    for (const t of b.freeActions(g)) out.push({ ...t, board: b.id });
  }
  return out;
}
