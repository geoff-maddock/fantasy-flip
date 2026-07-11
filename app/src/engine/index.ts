// Public engine API. This is the single import surface for the renderer and the
// bots. Everything below is pure and headless — no DOM references anywhere in
// the engine/ tree.
import type { Game } from './types';
import { classes } from '../content';
import { log } from './deck';
import { startRound, startTurn } from './turn';

export type {
  Game,
  GameState,
  Settings,
  Card,
  RowSlot,
  Active,
  Assault,
  Delve,
  LogEntry,
  LogKind,
  Suit,
} from './types';

export { createGame, createState, defaultSettings, diffOf } from './state';
export type { NewGameOpts } from './state';
export { makeRng, defaultRng } from './rng';

// Begin a game at Round 1, Turn 1.
export function startGame(g: Game): void {
  const S = g.state;
  log(S, 'You set out as the ' + classes[S.cls]!.name + '. Round 1 begins.', 'sys');
  const mods = Object.entries(g.settings)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  if (mods.length) log(S, 'Experimental modules active: ' + mods.join(', ') + '.', 'sys');
  startRound(g);
  startTurn(g);
}

// ----- card selection & manipulation -----
export {
  selectRow,
  selectHand,
  modVal,
  modSuit,
  consumeActive,
  playEvent,
  setAceMode,
  campCard,
  overdraw,
} from './cards';
export type { EventChoice } from './cards';

// ----- derived getters the renderer/bots need -----
export {
  isFace,
  activeCard,
  activeValue,
  activeSuit,
  totalDefense,
  handLimit,
  tweakCost,
  suitChangeCost,
  attrL,
} from './helpers';

// ----- rewards / runes / followers -----
export { gainReward, grantRune, runeCharges, usePower, recruit } from './rewards';

// ----- boards -----
export { activeBoards, allTargets, allFreeActions, activeBoard, getBoard, registerBoard } from './boards';
export type { BoardPlugin, PlacementTarget } from './boards';

// ----- charter / guild + board-specific interactive helpers -----
export { unlockLoc, unlockCost } from './guild';
export { fillThicketCell, thicketLegalCells } from './boards/thicket';
export { chargeLine } from './boards/warcamp';
export { chessTargets, doChessMove, chessAttacked } from './boards/chess';

// ----- optional modules -----
export { beginSpell, cancelSpell, spellPickSecond, SPELLS } from './modules/spellcraft';
export { canTrain, doTrain, ATTR_KEYS } from './modules/attributes';
export { spendFollower, FOLLOWER_KEYS } from './modules/followers';

// ----- turn / assault / scoring -----
export { startRound, startTurn, endTurn } from './turn';
export { resolveAssault, lastStandFlip, resolveAssaultNow, closeAssault } from './assault';
export { finalScore } from './scoring';
export type { ScoreResult } from './scoring';

// ----- classes / delve -----
export { useAbility } from './classes';
export { openDelve, delveFlip, delveBank } from './delve';

// ----- convenience: is the game finished? -----
export function isGameOver(g: Game): boolean {
  return g.state.over;
}
