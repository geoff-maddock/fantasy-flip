// Central content registry. JSON is imported, validated once at module load, and
// re-exported as typed data. Adding a new board/class/item = edit data here, not engine code.
import { z } from 'zod';
import {
  DungeonRoomSchema,
  ForestSlotSchema,
  AltarSchema,
  ItemSchema,
  ClassSchema,
  DifficultySchema,
  RuneType,
  validate,
  type Reward,
  type DungeonRoom,
  type ForestSlot,
  type Altar,
  type Item,
  type ClassDef,
  type Difficulty,
} from './schema';

import dungeonJson from './boards/dungeon.json';
import forestJson from './boards/forest.json';
import templeJson from './boards/temple.json';
import marketJson from './boards/market.json';
import classesJson from './classes.json';
import difficultiesJson from './difficulties.json';
import runesJson from './runes.json';
import advancedJson from './boards/advanced.json';
import modulesJson from './modules.json';

export type Suit = 'S' | 'C' | 'H' | 'D';
export type Track = 'glory' | 'lore' | 'spirit' | 'fortune';

const RuneSpotFlat = z.record(z.string(), RuneType);
const FollowSpotFlat = z.record(z.string(), z.string());

/* ---------- Board content schemas (metadata + data in one file) ---------- */
const DungeonContent = z.object({
  id: z.literal('dungeon'),
  svg: z.string(),
  name: z.string(),
  suit: z.literal('S'),
  track: z.literal('glory'),
  mech: z.string(),
  rooms: z.array(DungeonRoomSchema),
  runeSpots: RuneSpotFlat.optional(),
  followSpots: FollowSpotFlat.optional(),
});
const ForestContent = z.object({
  id: z.literal('forest'),
  svg: z.string(),
  name: z.string(),
  suit: z.literal('C'),
  track: z.literal('lore'),
  mech: z.string(),
  slots: z.array(ForestSlotSchema),
  runeSpots: RuneSpotFlat.optional(),
  followSpots: FollowSpotFlat.optional(),
});
const TempleContent = z.object({
  id: z.literal('temple'),
  svg: z.string(),
  name: z.string(),
  suit: z.literal('H'),
  track: z.literal('spirit'),
  mech: z.string(),
  altars: z.object({ sun: AltarSchema, moon: AltarSchema }),
  runeSpots: z.object({ sun: RuneSpotFlat, moon: RuneSpotFlat }).optional(),
  followSpots: FollowSpotFlat.optional(),
});
const MarketContent = z.object({
  id: z.literal('market'),
  svg: z.string(),
  name: z.string(),
  suit: z.literal('D'),
  track: z.literal('fortune'),
  mech: z.string(),
  items: z.array(ItemSchema),
  itemRuneMap: z.record(z.string(), RuneType).optional(),
});

export const dungeon = validate(DungeonContent, dungeonJson, 'dungeon');
export const forest = validate(ForestContent, forestJson, 'forest');
export const temple = validate(TempleContent, templeJson, 'temple');
export const market = validate(MarketContent, marketJson, 'market');

export const classes = validate(z.record(z.string(), ClassSchema), classesJson, 'classes');
export const difficulties = validate(z.record(z.string(), DifficultySchema), difficultiesJson, 'difficulties');
export const runes = validate(
  z.record(RuneType, z.object({ icon: z.string(), name: z.string(), power: z.string() })),
  runesJson,
  'runes',
);

export type ClassId = keyof typeof classes;
export type DifficultyId = keyof typeof difficulties;

/* ---------- advanced boards + modules ----------
   These ship as typed JSON. The core catalog above is zod-validated; the
   advanced set is larger and type-checked at the import boundary instead. */
export interface AdvancedContent {
  catacombs: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; crypts: Array<{ em: string; rw: Reward }>; bonus: Reward; runeSpots: Record<string, RuneType> };
  warcamp: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; low: number; high: number; strong: number; maxCards: number; lineRunes: RuneType[] };
  thicket: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; cellRewards: Record<string, Reward>; runeSpots: Record<string, RuneType> };
  stones: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; pairRewards: Reward[]; runeSpots: Record<string, RuneType> };
  road: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; shrines: Array<{ v: number; em: string; rw: Reward }>; runeSpots: Record<string, RuneType> };
  oracle: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; rewards: Reward[]; runeGrants: Record<string, RuneType> };
  gemcutter: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; gems: Record<'emerald' | 'ruby' | 'diamond', { em: string; name: string; hint: string; rw: Reward; rune: RuneType }> };
  traderoute: { id: string; svg: string; suit: string; track: Track; name: string; mech: string; towns: Array<{ n: string; x: number; y: number; rw: Reward }>; edges: Array<{ a: number; b: number; req: number }>; stars: Record<string, number>; townRunes: Record<string, RuneType> };
  tower: { id: string; svg: string; suit: string; track: Track; name: string; icon: string; blurb: string; floors: Reward[]; runeSpots: Record<string, RuneType> };
  bog: { id: string; svg: string; suit: string; track: Track; name: string; icon: string; blurb: string; glory: number[]; emoji: string[]; penTrapRune: RuneType };
  tavern: { id: string; svg: string; suit: string; track: Track; name: string; icon: string; blurb: string; boxes: Reward[]; runeSpots: Record<string, RuneType> };
  unlockCost: number[];
}
export const advanced = advancedJson as unknown as AdvancedContent;

export interface AttrDef { suit: Suit; icon: string; name: string; lv: string[] }
export interface FollowerDef { icon: string; name: string; desc: string }
export interface SpellDef { id: string; icon: string; name: string; mana: number; min: number; desc: string }
export interface ModulesContent {
  attrs: Record<'might' | 'agility' | 'wisdom' | 'spirit', AttrDef>;
  trainReq: number[];
  followers: Record<'squire' | 'herbalist' | 'acolyte' | 'trader', FollowerDef>;
  spells: SpellDef[];
  chess: { glyph: Record<string, string>; name: Record<string, string>; victimRunes: Record<string, RuneType> };
}
export const modules = modulesJson as unknown as ModulesContent;

// Charter (guild-unlockable) board metadata for the renderer.
export const LOCS = {
  tower: { icon: advanced.tower.icon, name: advanced.tower.name, blurb: advanced.tower.blurb },
  bog: { icon: advanced.bog.icon, name: advanced.bog.name, blurb: advanced.bog.blurb },
  tavern: { icon: advanced.tavern.icon, name: advanced.tavern.name, blurb: advanced.tavern.blurb },
} as const;

/* ---------- Static card primitives ---------- */
export const SUITS: Record<Suit, { sym: string; red: boolean; loc: string; name: string }> = {
  S: { sym: '♠', red: false, loc: 'dungeon', name: 'Spades' },
  C: { sym: '♣', red: false, loc: 'forest', name: 'Clubs' },
  H: { sym: '♥', red: true, loc: 'temple', name: 'Hearts' },
  D: { sym: '♦', red: true, loc: 'market', name: 'Diamonds' },
};
export const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const FACE_EMOJI: Record<number, string> = { 11: '🤹', 12: '👸', 13: '🤴', 1: '🌟' };

export function rankLabel(r: number): string {
  return RANK_LABELS[r] ?? String(r);
}

export type {
  Reward,
  DungeonRoom,
  ForestSlot,
  Altar,
  Item,
  ClassDef,
  Difficulty,
  RuneType,
};
