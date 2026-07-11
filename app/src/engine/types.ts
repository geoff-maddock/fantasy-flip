import type { Suit, ClassId, DifficultyId } from '../content';
import type { Rng } from './rng';

export type { Suit };

export interface Card {
  suit: Suit;
  rank: number; // 1..13 (1 = Ace, 11 = J, 12 = Q, 13 = K)
}

export interface RowSlot {
  card: Card;
  taken: boolean;
}

export type LogKind = 'lt' | 'good' | 'bad' | 'sys';
export interface LogEntry {
  msg: string;
  cls: LogKind;
}

// The "active" card being manipulated before placement.
export interface Active {
  source: 'row' | 'hand';
  idx: number;
  mod: number; // net ±value tweak
  suit: Suit | null; // overridden suit, if changed
  forced: number | null; // forced value (Ace hi/lo, or set by powers)
  freeClubUsed: boolean;
}

export interface Assault {
  base: number;
  def: number;
  bonusDef: number;
  bonusThreat: number;
  flips: Card[];
  resolved: boolean;
  outcome?: { win: true; g: number } | { win: false; w: number };
}

export type ChessPieceType = 'R' | 'B' | 'N' | 'P' | 'K';
export interface ChessPiece {
  t: ChessPieceType;
  r: number;
  c: number;
  alive: boolean;
  rw: import('../content').Reward;
}

export interface Delve {
  depth: number;
  lootG: number;
  lootM: number;
  blacks: number;
  flips: Card[];
  busted?: Card;
}

// The full game state. Mirrors the prototype `S` object but is passed explicitly
// (never global) so the engine stays pure and headless.
export interface GameState {
  cls: ClassId;
  round: number;
  turn: number;

  deck: Card[];
  discard: Card[];
  pdeck: Card[]; // player/hero deck
  pdiscard: Card[];
  row: RowSlot[];
  hand: Card[];

  draftsLeft: number;
  threat: number;

  gold: number;
  mana: number;
  xp: number;
  wounds: number;

  glory: number;
  lore: number;
  spirit: number;
  fortune: number;

  defBonus: number;
  tempDef: number;

  // core board state
  dungeonNext: number;
  trail: number[];
  altars: { sun: number[]; moon: number[] };
  items: Record<string, boolean>;

  // guild unlocks + charter boards
  unlocked: { tower: boolean; bog: boolean; tavern: boolean };
  unlockCount: number;
  tower: number[];
  pens: number[][];
  run: number[];

  // advanced alternate boards
  cata: { pos: number; visited: boolean[]; done: boolean };
  lines: Array<{ vals: number[]; st: 'open' | 'charged' | 'routed' }>;
  grid: boolean[];
  fill: { left: number; cells: number[] } | null;
  thicketRows: boolean[];
  stones: number[][];
  roadPos: number;
  oracle: { slots: Array<{ v: number; guess: 'hi' | 'lo'; hit: boolean }>; pending: { v: number; guess: 'hi' | 'lo' } | null };
  gems: { emerald: number[]; ruby: number[]; diamond: number[] };
  routes: { built: boolean[]; towns: boolean[] };
  chess: { champ: [number, number]; pieces: ChessPiece[] };

  // spellcraft in-progress
  spellMode: string | null;
  spellFirst: { source: 'row' | 'hand'; idx: number } | null;

  // module state
  attrs: { might: number; agility: number; wisdom: number; spirit: number };
  followers: { squire: number; herbalist: number; acolyte: number; trader: number };
  trailBreaks: number;
  parityBreaks: number;
  freeSuit: boolean;
  runes: { ember: number; tide: number; gale: number; stone: number };
  runesUsed: { ember: number; tide: number; gale: number; stone: number };
  confluences: number;

  abilityUsed: boolean;
  freeTweakUsed: boolean;
  over: boolean;

  delve: Delve | null;
  assault: Assault | null;
  active: Active | null;

  log: LogEntry[];
}

export interface Settings {
  attrs: boolean;
  followers: boolean;
  spells: boolean;
  pyl: boolean;
  chess: boolean;
  runes: boolean;
  diff: DifficultyId;
  boards: Record<Suit, string>;
}

// A Game bundles mutable state + immutable settings + the RNG. Engine functions
// take this context explicitly. Both the renderer and the bots drive the same
// context. `rng` is never serialized — persistence stores only `state`.
export interface Game {
  state: GameState;
  settings: Settings;
  rng: Rng;
}
