import type { Game, Suit } from '../types';
import type { Track } from '../../content';

// A placement target is one legal (or currently-illegal) destination for the
// active card on a board — e.g. the next dungeon room, a specific altar, or a
// shop item. `apply` performs the placement (and consumes the active card).
// Both the DOM renderer and the bots enumerate targets the same way.
export interface PlacementTarget {
  key: string; // stable id, unique within the board (e.g. 'altar:sun', 'buy:0')
  label: string; // human-facing button label
  legal: boolean; // legal right now, given the active card
  apply: (g: Game) => void;
}

// A board plugin encapsulates one mini-game. New boards implement this interface
// and register themselves — the engine core never hard-codes board rules.
export interface BoardPlugin {
  id: string;
  suit: Suit;
  track: Track;
  name: string;
  svg: string;
  mech: string;
  // Placement targets for the current active card. When there is no active card
  // (or it can't go here) targets are returned with legal:false so the renderer
  // can still draw the board.
  targets(g: Game): PlacementTarget[];
  // Optional board actions that do NOT consume the active card (e.g. War Camp's
  // "charge a line"). Enumerated the same way by renderer and bots.
  freeActions?(g: Game): PlacementTarget[];
}

// Registry of board plugins keyed by id.
const registry = new Map<string, BoardPlugin>();

export function registerBoard(b: BoardPlugin): void {
  registry.set(b.id, b);
}

export function getBoard(id: string): BoardPlugin | undefined {
  return registry.get(id);
}

// The board plugin currently active for a given suit, per settings.
export function activeBoard(g: Game, suit: Suit): BoardPlugin | undefined {
  return registry.get(g.settings.boards[suit]);
}
