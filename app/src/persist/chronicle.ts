import type { Game, GameState, Settings } from '../engine';
import { createGame, finalScore } from '../engine';
import type { ScoreResult } from '../engine';

// localStorage with an in-memory fallback. localStorage is unavailable in some
// sandboxed previews; the fallback keeps the app working (autosave just won't
// survive a reload there — exactly the prototype's behavior).
const store = {
  ok: (() => {
    try {
      localStorage.setItem('__fd_t', '1');
      localStorage.removeItem('__fd_t');
      return true;
    } catch {
      return false;
    }
  })(),
  mem: {} as Record<string, unknown>,
  get<T>(k: string): T | null {
    try {
      return this.ok ? (JSON.parse(localStorage.getItem(k) ?? 'null') as T) : ((this.mem[k] as T) ?? null);
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown): void {
    try {
      if (this.ok) localStorage.setItem(k, JSON.stringify(v));
      else this.mem[k] = v;
    } catch {
      /* ignore quota errors */
    }
  },
  del(k: string): void {
    try {
      if (this.ok) localStorage.removeItem(k);
      else delete this.mem[k];
    } catch {
      /* ignore */
    }
  },
};

const K_CUR = 'flipdungeon.current';
const K_HIST = 'flipdungeon.history';

interface SavedGame {
  state: GameState;
  settings: Settings;
  v: number;
}

export interface ChronicleEntry {
  ts: number;
  cls: string;
  total: number;
  tier: string;
  diff: string;
  boards: Record<string, string>;
  modules: string[];
  breakdown: Array<[string, number]>;
  stats: Record<string, number>;
  log: Array<{ msg: string; cls: string }>;
}

export function hasSavedGame(): boolean {
  return store.get<SavedGame>(K_CUR) != null;
}

// Autosave the in-progress game (state + settings only; the RNG is not saved).
export function saveGame(g: Game): void {
  store.set(K_CUR, { state: g.state, settings: g.settings, v: 4 });
}

export function clearSaved(): void {
  store.del(K_CUR);
}

// Resume a saved game. RNG restarts from the default generator (draws already
// taken are baked into the saved deck order, so play continues seamlessly).
export function resumeGame(): Game | null {
  const cur = store.get<SavedGame>(K_CUR);
  if (!cur || !cur.state) return null;
  const g = createGame({ cls: cur.state.cls, settings: cur.settings });
  g.state = cur.state;
  return g;
}

export function history(): ChronicleEntry[] {
  return store.get<ChronicleEntry[]>(K_HIST) ?? [];
}

// Record a finished game into the Chronicle (keeps the most recent 30).
export function recordGame(g: Game, ts: number, score?: ScoreResult): ChronicleEntry {
  const S = g.state;
  const sc = score ?? finalScore(g);
  const entry: ChronicleEntry = {
    ts,
    cls: S.cls,
    total: sc.total,
    tier: sc.tier,
    diff: g.settings.diff,
    boards: { ...g.settings.boards },
    modules: Object.entries(g.settings)
      .filter(([, v]) => v === true)
      .map(([k]) => k),
    breakdown: sc.rows,
    stats: {
      glory: S.glory,
      lore: S.lore,
      spirit: S.spirit,
      fortune: sc.fortune,
      xp: S.xp,
      wounds: S.wounds,
      gold: S.gold,
      unlocks: S.unlockCount,
      dungeonRooms: S.dungeonNext,
    },
    log: [...S.log].reverse(),
  };
  const h = history();
  h.unshift(entry);
  store.set(K_HIST, h.slice(0, 30));
  clearSaved();
  return entry;
}

export function clearHistory(): void {
  store.del(K_HIST);
}

// Export the Chronicle as a downloaded JSON file (browser only).
export function exportChronicle(): void {
  const data = JSON.stringify(history(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flip-dungeon-chronicle.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
