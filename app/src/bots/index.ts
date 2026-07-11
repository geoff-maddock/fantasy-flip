// The Proving Grounds — headless bot-testing harness. Plays complete games
// through the real engine (no DOM) under five strategies and reports balance.
export { STRATEGIES } from './strategies';
export type { Policy } from './strategies';
export { runLab, labStat, labNotes, summarize } from './report';
export type { LabConfig, LabReport, Stat } from './report';
export { playGame, newMetrics } from './runner';
export type { Metrics } from './runner';
