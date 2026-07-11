import type { Card, Game } from '../types';
import { modules, dungeon, rankLabel, SUITS } from '../../content';
import { drawAdv, drawHero, log } from '../deck';
import { gainReward, recruit } from '../rewards';

const SPELLS = modules.spells;
const ROOMS = dungeon.rooms;
const dungeonFollow = (i: number): string | undefined => dungeon.followSpots?.[String(i)];

// Spell component value: faces count as 10.
const compVal = (c: Card): number => (c.rank >= 11 ? 10 : c.rank);

// Begin casting: the currently-active card becomes the first component.
export function beginSpell(g: Game, id: string): void {
  const S = g.state;
  if (!g.settings.spells || !S.active) return;
  const sp = SPELLS.find((s) => s.id === id);
  if (!sp) return;
  if (S.mana < sp.mana) { log(S, 'Not enough mana for ' + sp.name + '.', 'bad'); return; }
  if (id === 'fireball' && (g.settings.boards.S !== 'dungeon' || S.dungeonNext >= ROOMS.length)) {
    log(S, 'There is no dungeon room to burn.', 'bad');
    return;
  }
  S.spellMode = id;
  S.spellFirst = { source: S.active.source, idx: S.active.idx };
  S.active = null;
  log(S, '✨ Casting ' + sp.icon + ' ' + sp.name + ' — choose a second card to burn (row cards each use a pick).', 'sys');
}

export function cancelSpell(g: Game): void {
  const S = g.state;
  S.spellMode = null;
  S.spellFirst = null;
  log(S, 'The spell fizzles harmlessly (nothing spent).', 'lt');
}

// Pick the second component and resolve the spell.
export function spellPickSecond(g: Game, source: 'row' | 'hand', idx: number): void {
  const S = g.state;
  const sp = SPELLS.find((s) => s.id === S.spellMode);
  const f = S.spellFirst;
  if (!sp || !f) return;
  if (source === f.source && idx === f.idx) { log(S, 'Choose a different card for the second component.', 'bad'); return; }
  if (source === 'row' && S.row[idx]!.taken) return;
  const picksNeeded = (f.source === 'row' ? 1 : 0) + (source === 'row' ? 1 : 0);
  if (picksNeeded > S.draftsLeft) { log(S, 'Not enough picks left to burn those row cards.', 'bad'); return; }
  const c1 = f.source === 'row' ? S.row[f.idx]!.card : S.hand[f.idx]!;
  const c2 = source === 'row' ? S.row[idx]!.card : S.hand[idx]!;
  const sum = compVal(c1) + compVal(c2);
  if (sum < sp.min) { log(S, sp.name + ' needs combined value ≥ ' + sp.min + ' (you have ' + sum + ').', 'bad'); return; }

  S.mana -= sp.mana;
  S.draftsLeft -= picksNeeded;
  const consumeRow = (src: 'row' | 'hand', i: number) => {
    if (src === 'row') { S.row[i]!.taken = true; S.discard.push(S.row[i]!.card); }
  };
  consumeRow(f.source, f.idx);
  consumeRow(source, idx);
  const handIdxs: number[] = [];
  if (f.source === 'hand') handIdxs.push(f.idx);
  if (source === 'hand') handIdxs.push(idx);
  handIdxs.sort((a, b) => b - a).forEach((i) => { S.pdiscard.push(S.hand[i]!); S.hand.splice(i, 1); });
  log(S, '✨ ' + sp.icon + ' ' + sp.name + ' consumes the ' + rankLabel(c1.rank) + SUITS[c1.suit].sym + ' and ' + rankLabel(c2.rank) + SUITS[c2.suit].sym + ' (combined ' + sum + ', −' + sp.mana + ' 🔮).', 'sys');

  if (sp.id === 'fireball') {
    const room = ROOMS[S.dungeonNext]!;
    S.dungeonNext++;
    log(S, '🔥 The ' + room.em + ' ' + room.name + ' is obliterated!', 'good');
    gainReward(g, room.rw, room.name);
    const f2 = dungeonFollow(S.dungeonNext - 1);
    if (g.settings.followers && f2) recruit(g, f2 as keyof Game['state']['followers']);
  } else if (sp.id === 'divination') {
    for (const slot of S.row) if (!slot.taken) S.discard.push(slot.card);
    S.row = [];
    for (let i = 0; i < 4; i++) { const c = drawAdv(g); if (c) S.row.push({ card: c, taken: false }); }
    log(S, '👁 The Omen Row is swept clean — four fresh cards are revealed.', 'good');
  } else if (sp.id === 'transmute') {
    const gold = Math.floor(sum / 2);
    S.gold += gold;
    log(S, '⚗ Base matter becomes gold: +' + gold + ' 🪙.', 'good');
  } else if (sp.id === 'timewarp') {
    S.draftsLeft++;
    const c = drawHero(g);
    if (c) { S.hand.push(c); log(S, '⏳ Time bends — +1 pick, and the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' slips into your hand.', 'good'); }
    else log(S, '⏳ Time bends — +1 pick this turn.', 'good');
  }
  S.spellMode = null;
  S.spellFirst = null;
}

export { SPELLS };
