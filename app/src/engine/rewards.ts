import type { Game } from './types';
import type { Reward, RuneType } from '../content';
import { runes as RUNES, rankLabel, SUITS } from '../content';
import { drawAdv, drawHero, log } from './deck';
import { activeCard, activeValue, isFace } from './helpers';

// Apply a reward bundle to state and log the gains. `where` is an optional label.
export function gainReward(g: Game, rw: Reward, where?: string): void {
  const S = g.state;
  const bits: string[] = [];
  if (rw.gold) { S.gold += rw.gold; bits.push('+' + rw.gold + ' 🪙'); }
  if (rw.mana) { S.mana += rw.mana; bits.push('+' + rw.mana + ' 🔮'); }
  if (rw.xp) { S.xp += rw.xp; bits.push('+' + rw.xp + ' XP'); }
  if (rw.glory) { S.glory += rw.glory; bits.push('+' + rw.glory + '⭐ Glory'); }
  if (rw.lore) { S.lore += rw.lore; bits.push('+' + rw.lore + '⭐ Lore'); }
  if (rw.spirit) { S.spirit += rw.spirit; bits.push('+' + rw.spirit + '⭐ Spirit'); }
  if (rw.fortune) { S.fortune += rw.fortune; bits.push('+' + rw.fortune + '⭐ Fortune'); }
  if (rw.def) { S.defBonus += rw.def; bits.push('+' + rw.def + ' 🛡'); }
  if (rw.heal) {
    let healed = 0;
    for (let i = 0; i < rw.heal; i++) if (S.wounds > 0) { S.wounds--; healed++; }
    if (healed) bits.push('healed ' + healed + ' 🩸');
    else bits.push('(no wounds to heal)');
  }
  if (bits.length) log(S, (where ? where + ': ' : '') + bits.join(', '), 'good');
}

// Rune module (Phase 2). Awarding a rune may complete a Confluence set.
export function grantRune(g: Game, t: RuneType): void {
  if (!g.settings.runes) return;
  const S = g.state;
  S.runes[t]++;
  const rune = RUNES[t]!;
  log(S, 'You inscribe a ' + rune.icon + ' ' + rune.name + ' rune (' + S.runes[t] + ' collected).', 'sys');
  const sets = Math.min(S.runes.ember, S.runes.tide, S.runes.gale, S.runes.stone);
  while (S.confluences < sets) {
    S.confluences++;
    log(S, '✨ CONFLUENCE — all four elements align!', 'sys');
    gainReward(g, { spirit: 2 }, 'Confluence ' + S.confluences);
  }
}

export function runeCharges(g: Game, t: RuneType): number {
  return Math.floor(g.state.runes[t] / 2) - g.state.runesUsed[t];
}

export function usePower(g: Game, t: RuneType): void {
  const S = g.state;
  if (!g.settings.runes || runeCharges(g, t) <= 0) return;
  if (t === 'ember') {
    const c = activeCard(g);
    if (!S.active || !c || isFace(c)) { log(S, 'Searing Sigil: select a number card first.', 'bad'); return; }
    S.runesUsed[t]++;
    if (S.active.forced != null) S.active.forced = Math.min(13, S.active.forced + 4);
    else S.active.mod = Math.min(13 - c.rank, S.active.mod + 4);
    log(S, '☄️ Searing Sigil: the card blazes to ' + activeValue(g) + '.', 'sys');
  } else if (t === 'tide') {
    S.runesUsed[t]++;
    for (const slot of S.row) if (!slot.taken) S.discard.push(slot.card);
    S.row = [];
    for (let i = 0; i < 4; i++) { const c = drawAdv(g); if (c) S.row.push({ card: c, taken: false }); }
    S.active = null;
    log(S, '💧 Tidecall: the omens wash away — four fresh cards surface.', 'sys');
  } else if (t === 'gale') {
    S.runesUsed[t]++;
    S.draftsLeft++;
    const c = drawHero(g);
    if (c) { S.hand.push(c); log(S, '🌪️ Galestep: +1 pick, and the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' blows into your hand.', 'sys'); }
    else log(S, '🌪️ Galestep: +1 pick this turn.', 'sys');
  } else if (t === 'stone') {
    S.runesUsed[t]++;
    S.defBonus++;
    gainReward(g, { heal: 2 }, '🪨 Stoneward');
    log(S, '🪨 Stoneward: +1 🛡 permanently.', 'sys');
  }
}

export function recruit(g: Game, kind: keyof Game['state']['followers']): void {
  if (!g.settings.followers) return;
  g.state.followers[kind]++;
}
