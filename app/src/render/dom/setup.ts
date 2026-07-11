import { dungeon, forest, temple, market, advanced, SUITS, type Suit } from '../../content';

type Opt = { id: string; name: string; mech: string; svg: string };
const a = advanced;
// Board options available in the picker, grouped by suit — the core board plus
// the two alternates for each suit.
const BOARD_OPTIONS: Record<Suit, Opt[]> = {
  S: [dungeon, a.catacombs, a.warcamp].map((b) => ({ id: b.id, name: b.name, mech: b.mech, svg: b.svg })),
  C: [forest, a.thicket, a.stones].map((b) => ({ id: b.id, name: b.name, mech: b.mech, svg: b.svg })),
  H: [temple, a.road, a.oracle].map((b) => ({ id: b.id, name: b.name, mech: b.mech, svg: b.svg })),
  D: [market, a.gemcutter, a.traderoute].map((b) => ({ id: b.id, name: b.name, mech: b.mech, svg: b.svg })),
};

export function setupBoardPicker(selected: Record<Suit, string>): string {
  return (Object.keys(BOARD_OPTIONS) as Suit[])
    .map((suit) => {
      const opts = BOARD_OPTIONS[suit]
        .map(
          (b) => `<div class="pick ${selected[suit] === b.id ? 'sel' : ''}" data-act="pick-board" data-s="${suit}" data-id="${b.id}">
            <h3>${b.name}</h3><div class="cp">${b.mech}</div>
          </div>`,
        )
        .join('');
      return `<div class="picklabel">${SUITS[suit].sym} ${SUITS[suit].name}</div><div class="grid">${opts}</div>`;
    })
    .join('');
}

export interface ModuleDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

// Optional module toggles. Rules for these ship progressively; toggling a
// not-yet-implemented module is harmless (the engine simply never fires it).
export const MODULE_DEFS: ModuleDef[] = [
  { id: 'pyl', icon: '🎲', name: 'Push Your Luck', desc: 'Delve for loot, Last Stand, Overdraw' },
  { id: 'runes', icon: '☄️', name: 'Runecraft', desc: 'Collect elemental runes for powers' },
  { id: 'attrs', icon: '💪', name: 'Attributes', desc: 'Train Might / Agility / Wisdom / Spirit' },
  { id: 'followers', icon: '⚔️', name: 'Camp Followers', desc: 'Recruit one-shot helpers' },
  { id: 'spells', icon: '🔥', name: 'Spellcraft', desc: 'Two-card mana spells' },
  { id: 'chess', icon: '♟', name: "Tyrant's Gambit", desc: 'Capture the shadow court' },
];
