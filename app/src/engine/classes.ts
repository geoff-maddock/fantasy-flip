import type { Game } from './types';
import { rankLabel, SUITS } from '../content';
import { drawHero, log } from './deck';
import { activeCard, activeValue, isFace } from './helpers';
import { gainReward } from './rewards';

// The once-per-round class ability. No-ops if already used this round.
export function useAbility(g: Game): void {
  const S = g.state;
  if (S.abilityUsed) return;
  const k = S.cls;
  if (k === 'knight') {
    const c = activeCard(g);
    if (!S.active || !c || isFace(c)) { log(S, 'Knight: select a number card first.', 'bad'); return; }
    if (S.active.forced != null) S.active.forced = Math.min(13, S.active.forced + 3);
    else S.active.mod = Math.min(13 - c.rank, S.active.mod + 3);
    log(S, 'Knight ability: +3 to the selected card (now ' + activeValue(g) + ').', 'sys');
  } else if (k === 'ranger') {
    S.trailBreaks++;
    log(S, 'Ranger ability: your next trail space ignores the rising rule.', 'sys');
  } else if (k === 'druid') {
    gainReward(g, { heal: 2, mana: 1 }, 'Druid ability');
  } else if (k === 'bard') {
    S.threat = Math.max(0, S.threat - 2);
    log(S, 'Bard ability: a soothing song calms the horde — −2 🔥 Threat.', 'sys');
  } else if (k === 'alchemist') {
    const c = drawHero(g);
    if (!c) { log(S, 'Alchemist: the hero deck is empty!', 'bad'); return; }
    S.pdiscard.push(c);
    if (isFace(c)) { S.gold += 1; log(S, 'Alchemist ability: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' fizzles… +1 🪙 of residue.', 'bad'); }
    else { const m = Math.ceil(c.rank / 2); S.mana += m; log(S, 'Alchemist ability: the ' + rankLabel(c.rank) + SUITS[c.suit].sym + ' distills into +' + m + ' 🔮!', 'good'); }
  } else if (k === 'necromancer') {
    S.wounds += 1;
    S.mana += 3;
    log(S, 'Necromancer ability: blood magic — +1 🩸 Wound, +3 🔮.', 'sys');
  }
  S.abilityUsed = true;
}
