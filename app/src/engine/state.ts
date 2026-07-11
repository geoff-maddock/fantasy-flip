import type { Game, GameState, Settings } from './types';
import type { ClassId, Suit } from '../content';
import { difficulties } from '../content';
import { newDeck } from './deck';
import { defaultRng, makeRng, type Rng } from './rng';

export function defaultSettings(): Settings {
  return {
    attrs: false,
    followers: false,
    spells: false,
    pyl: false,
    chess: false,
    runes: false,
    diff: 'adventurer',
    boards: { S: 'dungeon', C: 'forest', H: 'temple', D: 'market' } as Record<Suit, string>,
  };
}

export function diffOf(settings: Settings) {
  return difficulties[settings.diff] ?? difficulties.adventurer!;
}

export function createState(cls: ClassId, settings: Settings, rng: Rng): GameState {
  const d = diffOf(settings);
  return {
    cls,
    round: 1,
    turn: 1,
    deck: newDeck(rng),
    discard: [],
    pdeck: newDeck(rng),
    pdiscard: [],
    row: [],
    hand: [],
    draftsLeft: 2,
    threat: 0,
    gold: d.gold,
    mana: d.mana,
    xp: 0,
    wounds: 0,
    glory: 0,
    lore: 0,
    spirit: 0,
    fortune: 0,
    defBonus: 0,
    tempDef: 0,
    dungeonNext: 0,
    trail: [],
    altars: { sun: [], moon: [] },
    items: {},
    unlocked: { tower: false, bog: false, tavern: false },
    unlockCount: 0,
    tower: [],
    pens: [[], [], []],
    run: [],
    cata: { pos: -1, visited: Array(10).fill(false), done: false },
    lines: [
      { vals: [], st: 'open' },
      { vals: [], st: 'open' },
    ],
    grid: Array(16).fill(false),
    fill: null,
    thicketRows: [false, false, false, false],
    stones: [[], [], [], []],
    roadPos: -1,
    oracle: { slots: [], pending: null },
    gems: { emerald: [], ruby: [], diamond: [] },
    routes: { built: Array(8).fill(false), towns: Array(6).fill(false) },
    chess: {
      champ: [4, 2],
      pieces: [
        { t: 'R', r: 0, c: 0, alive: true, rw: { glory: 1 } },
        { t: 'K', r: 0, c: 2, alive: true, rw: { glory: 2, xp: 2 } },
        { t: 'B', r: 0, c: 4, alive: true, rw: { spirit: 1 } },
        { t: 'N', r: 1, c: 1, alive: true, rw: { mana: 2 } },
        { t: 'P', r: 1, c: 3, alive: true, rw: { gold: 1 } },
        { t: 'P', r: 2, c: 2, alive: true, rw: { gold: 1 } },
      ],
    },
    spellMode: null,
    spellFirst: null,
    attrs: { might: 0, agility: 0, wisdom: 0, spirit: 0 },
    followers: { squire: 0, herbalist: 0, acolyte: 0, trader: 0 },
    trailBreaks: 0,
    parityBreaks: 0,
    freeSuit: false,
    runes: { ember: 0, tide: 0, gale: 0, stone: 0 },
    runesUsed: { ember: 0, tide: 0, gale: 0, stone: 0 },
    confluences: 0,
    abilityUsed: false,
    freeTweakUsed: false,
    over: false,
    delve: null,
    assault: null,
    active: null,
    log: [],
  };
}

export interface NewGameOpts {
  cls: ClassId;
  settings?: Settings;
  seed?: number; // when provided, the game is fully deterministic
  rng?: Rng; // explicit generator (takes precedence over seed) — used by the bots
}

export function createGame(opts: NewGameOpts): Game {
  const settings = opts.settings ?? defaultSettings();
  const rng: Rng = opts.rng ?? (opts.seed !== undefined ? makeRng(opts.seed) : defaultRng);
  const state = createState(opts.cls, settings, rng);
  return { state, settings, rng };
}
