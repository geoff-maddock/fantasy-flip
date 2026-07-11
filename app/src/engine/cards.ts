import type { Game, Suit } from './types';
import { rankLabel, SUITS } from '../content';
import { drawHero, log } from './deck';
import {
  activeCard,
  activeSuit,
  activeValue,
  attrL,
  handLimit,
  isFace,
  suitChangeCost,
  tweakCost,
} from './helpers';
import { gainReward, recruit } from './rewards';
import { spellPickSecond } from './modules/spellcraft';

// Select a row card as the active card (or deselect if it's already active).
// When a spell is mid-cast, the click chooses the second spell component instead.
export function selectRow(g: Game, i: number): void {
  const S = g.state;
  const slot = S.row[i];
  if (!slot || slot.taken) return;
  if (S.spellMode) { spellPickSecond(g, 'row', i); return; }
  if (S.active && S.active.source === 'row' && S.active.idx === i) { S.active = null; return; }
  if (S.draftsLeft <= 0) { log(S, 'No picks left this turn — but you can still play Hero Hand cards.', 'bad'); return; }
  S.active = { source: 'row', idx: i, mod: 0, suit: null, forced: null, freeClubUsed: false };
}

export function selectHand(g: Game, i: number): void {
  const S = g.state;
  if (!S.hand[i]) return;
  if (S.spellMode) { spellPickSecond(g, 'hand', i); return; }
  if (S.active && S.active.source === 'hand' && S.active.idx === i) { S.active = null; return; }
  S.active = { source: 'hand', idx: i, mod: 0, suit: null, forced: null, freeClubUsed: false };
}

export function modVal(g: Game, delta: number): void {
  const S = g.state;
  if (!S.active) return;
  const c = activeCard(g);
  if (!c || isFace(c)) return;
  const cost = tweakCost(g);
  if (S.gold < cost) { log(S, 'Not enough gold to tweak the card.', 'bad'); return; }
  const nv = activeValue(g) + delta;
  if (nv < 1 || nv > 13) { log(S, 'Value must stay between 1 and 13.', 'bad'); return; }
  S.gold -= cost;
  if (cost === 0) {
    if ((S.items['Boots'] || attrL(g, 'agility') >= 2) && !S.freeTweakUsed) S.freeTweakUsed = true;
    else S.active.freeClubUsed = true;
  }
  if (S.active.forced != null) S.active.forced = nv;
  else S.active.mod += delta;
  log(S, 'Card tweaked to ' + activeValue(g) + (cost ? ' (−' + cost + ' 🪙)' : ' (free)') + '.', 'lt');
}

export function modSuit(g: Game, s: Suit): void {
  const S = g.state;
  if (!S.active) return;
  const c = activeCard(g);
  if (!c || isFace(c)) return;
  if (activeSuit(g) === s) return;
  const cost = suitChangeCost(g, s);
  if (S.mana < cost) { log(S, 'Not enough mana to change the suit.', 'bad'); return; }
  S.mana -= cost;
  let why = cost ? ' (−' + cost + ' 🔮)' : ' (free — Druid)';
  const from = activeSuit(g);
  if (cost === 0 && S.freeSuit && !(S.cls === 'druid' && ((from === 'C' && s === 'H') || (from === 'H' && s === 'C')))) {
    S.freeSuit = false;
    why = ' (free — the Queen’s enchantment)';
  }
  S.active.suit = s;
  log(S, 'Suit changed to ' + SUITS[s].sym + why + '.', 'lt');
}

// Remove the active card from its source (row draft consumes a pick; hand does not).
export function consumeActive(g: Game): void {
  const S = g.state;
  if (!S.active) return;
  if (S.active.source === 'row') {
    S.row[S.active.idx]!.taken = true;
    S.discard.push(S.row[S.active.idx]!.card);
    S.draftsLeft--;
  } else {
    S.pdiscard.push(S.hand[S.active.idx]!);
    S.hand.splice(S.active.idx, 1);
  }
  S.active = null;
}

export type EventChoice = 'cards' | 'gold' | 'mana' | 'enchant' | 'heal' | 'guard' | 'lore' | 'threat';

// Resolve a face card (Jack/Queen/King) event with the player's chosen option.
export function playEvent(g: Game, choice: EventChoice): void {
  const S = g.state;
  const c = activeCard(g);
  if (!c || !isFace(c)) return;
  const src = S.active!.source === 'hand' ? 'Hero Hand' : 'Omen Row';
  if (c.rank === 11) {
    if (choice === 'cards') {
      const drawn: string[] = [];
      for (let i = 0; i < 2; i++) { const hc = drawHero(g); if (hc) { S.hand.push(hc); drawn.push(rankLabel(hc.rank) + SUITS[hc.suit].sym); } }
      log(S, 'Jack (' + src + '): light fingers lift ' + (drawn.length ? drawn.join(' and ') : 'nothing') + ' from your own deck into hand.', 'good');
    } else {
      S.gold += 3;
      log(S, 'Jack (' + src + '): the scoundrel fences goods, +3 🪙.', 'good');
    }
    if (g.settings.followers) recruit(g, 'trader');
  }
  if (c.rank === 12) {
    if (choice === 'mana') { S.mana += 2; log(S, 'Queen (' + src + '): +2 🔮.', 'good'); }
    else if (choice === 'enchant') { S.mana += 1; S.freeSuit = true; log(S, 'Queen (' + src + '): +1 🔮, and her enchantment makes your next suit change free.', 'good'); }
    else gainReward(g, { heal: 2 }, 'Queen');
  }
  if (c.rank === 13) {
    if (choice === 'guard') { S.tempDef = (S.tempDef || 0) + 1; log(S, 'King (' + src + '): royal guards man the camp — +1 🛡 until this round’s assault.', 'good'); }
    else if (choice === 'lore') { S.xp += 2; log(S, 'King (' + src + '): a royal decree in your name — +2 XP.', 'good'); }
    else { S.xp += 1; S.threat = Math.max(0, S.threat - 1); log(S, 'King (' + src + '): +1 XP and the horde falters, −1 🔥 Threat.', 'good'); }
  }
  if (S.cls === 'bard') { S.xp += 1; log(S, 'Bard: the court applauds — +1 XP.', 'good'); }
  consumeActive(g);
}

export function setAceMode(g: Game, hi: boolean): void {
  const S = g.state;
  if (!S.active) return;
  const c = activeCard(g);
  if (!c || c.rank !== 1) return;
  S.active.forced = hi ? 11 : 1;
  log(S, 'Ace declared ' + (hi ? 'HIGH (11)' : 'LOW (1)') + '.', 'lt');
}

export function campCard(g: Game): void {
  const S = g.state;
  const c = activeCard(g);
  if (!c || isFace(c)) return;
  let gold = 1;
  if (S.cls === 'alchemist') gold += 1;
  if (attrL(g, 'spirit') >= 2) gold += 1;
  S.gold += gold;
  log(S, 'You camp with the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' — +' + gold + ' 🪙.', 'lt');
  consumeActive(g);
}

// PYL: overdraw a hero card (Phase 2 module).
export function overdraw(g: Game): void {
  const S = g.state;
  if (!g.settings.pyl || S.hand.length >= handLimit(g)) return;
  const c = drawHero(g);
  if (!c) { log(S, 'Your hero deck is spent.', 'bad'); return; }
  if (isFace(c)) {
    S.pdiscard.push(c);
    S.threat += 1;
    log(S, 'Overdraw: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' slips away to the horde — +1 🔥 Threat!', 'bad');
  } else {
    S.hand.push(c);
    log(S, 'Overdraw: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' joins your hand.', 'good');
  }
}
