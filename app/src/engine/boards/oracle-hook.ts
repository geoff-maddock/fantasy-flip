import type { Game } from '../types';
import { resolveProphecy as resolve } from './oracle';

// Core turn flow calls this at the start of each turn, after the fresh row is
// dealt. It only acts when the Veiled Oracle board is active and a prophecy is
// pending; otherwise it is a no-op.
export function resolveProphecy(g: Game): void {
  if (g.settings.boards.H === 'oracle') resolve(g);
}
