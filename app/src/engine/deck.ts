import type { Card, Game, GameState } from './types';
import { SUITS } from '../content';
import { shuffleInPlace, type Rng } from './rng';

export function newDeck(rng: Rng): Card[] {
  const d: Card[] = [];
  for (const s of Object.keys(SUITS) as Array<keyof typeof SUITS>) {
    for (let r = 1; r <= 13; r++) d.push({ suit: s, rank: r });
  }
  shuffleInPlace(d, rng);
  return d;
}

// Draw from the shared adventure deck, reshuffling the discard when empty.
export function drawAdv(g: Game): Card | null {
  const S = g.state;
  if (S.deck.length === 0) {
    S.deck = S.discard;
    S.discard = [];
    shuffleInPlace(S.deck, g.rng);
    if (S.deck.length === 0) return null;
    log(S, 'The adventure deck is reshuffled.', 'sys');
  }
  return S.deck.pop() ?? null;
}

// Draw from the player's own (hero) deck.
export function drawHero(g: Game): Card | null {
  const S = g.state;
  if (S.pdeck.length === 0) {
    S.pdeck = S.pdiscard;
    S.pdiscard = [];
    shuffleInPlace(S.pdeck, g.rng);
  }
  return S.pdeck.pop() ?? null;
}

// Low-level logger (kept here to avoid a circular import; the public `log`
// re-exports it). Newest entries first, matching the prototype.
export function log(S: GameState, msg: string, cls: 'lt' | 'good' | 'bad' | 'sys' = 'lt'): void {
  S.log.unshift({ msg, cls });
}
