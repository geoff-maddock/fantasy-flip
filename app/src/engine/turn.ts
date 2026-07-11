import type { Game } from './types';
import { rankLabel, SUITS } from '../content';
import { drawAdv, drawHero, log } from './deck';
import { handLimit, isFace } from './helpers';
import { resolveProphecy } from './boards/oracle-hook';
import { chessEndTurnThreat } from './boards/chess';
import { resolveAssault } from './assault';

// Start a new round: discard the hand, draw a fresh Hero Hand of 3, reset abilities.
export function startRound(g: Game): void {
  const S = g.state;
  S.abilityUsed = false;
  S.trailBreaks = 0;
  S.parityBreaks = 0;
  for (const c of S.hand) S.pdiscard.push(c);
  S.hand = [];
  for (let i = 0; i < 3; i++) { const c = drawHero(g); if (c) S.hand.push(c); }
  log(S, 'Round ' + S.round + ': you draw a fresh Hero Hand of 3 cards.', 'sys');
}

// Start a new turn: sweep the row, flip 4 fresh omens, reset per-turn flags, and
// draw one hero card up to the hand limit.
export function startTurn(g: Game): void {
  const S = g.state;
  for (const slot of S.row) if (!slot.taken) S.discard.push(slot.card);
  S.row = [];
  for (let i = 0; i < 4; i++) { const c = drawAdv(g); if (c) S.row.push({ card: c, taken: false }); }
  S.draftsLeft = 2;
  S.freeTweakUsed = false;
  resolveProphecy(g);
  S.active = null;
  if (S.hand.length < handLimit(g)) {
    const c = drawHero(g);
    if (c) { S.hand.push(c); log(S, 'You draw the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' into your Hero Hand.', 'lt'); }
  }
  if (g.settings.pyl && S.wounds >= 5) log(S, 'You are Battered (5+ wounds): hand limit 2.', 'bad');
}

// End the current turn. Leftover face cards raise Threat; turn 5 triggers the assault.
// Returns false and does nothing if a Thicket clearing is mid-resolution.
export function endTurn(g: Game): boolean {
  const S = g.state;
  if (S.fill) { log(S, 'Finish clearing the Thicket cells first.', 'bad'); return false; }
  S.active = null;
  S.spellMode = null;
  S.spellFirst = null;
  chessEndTurnThreat(g);
  const faces = S.row.filter((s) => !s.taken && isFace(s.card)).length;
  if (faces > 0) { S.threat += faces; log(S, 'Leftover face cards stir the horde: +' + faces + ' 🔥 Threat.', 'bad'); }
  if (S.turn === 5) { resolveAssault(g); return true; }
  S.turn++;
  startTurn(g);
  log(S, '— Turn ' + S.turn + ' —', 'sys');
  return true;
}
