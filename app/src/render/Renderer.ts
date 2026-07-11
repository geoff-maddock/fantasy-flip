import type { Game } from '../engine';

// Presentation interface. The engine is renderer-agnostic; a renderer consumes a
// Game and reflects state changes. Today there is one DOM renderer; the interface
// keeps a future canvas/WebGL renderer swappable without engine changes.
export interface Renderer {
  // Mount the renderer into a host element and take over the screen.
  mount(host: HTMLElement): void;
  // Reflect the current game state (called after every action).
  update(): void;
  // Attach a game to render. Passing null returns to the title/setup screen.
  setGame(game: Game | null): void;
}
