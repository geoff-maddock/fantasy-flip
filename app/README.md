# Flip Dungeon — digital prototype

A data-driven TypeScript rebuild of the **Fantasy Flip** tabletop game. The prototype
in `../Prototypes/` was a single 3,900-line HTML file; this is the same game
re-implemented as a modular, testable, extensible project that still ships as one
portable offline HTML for playtesters.

## Architecture

```
src/
  engine/    Pure, headless game logic (zero DOM). The single source of truth for
             rules. Drives BOTH the renderer and (later) the bot-testing harness.
  content/   Data only — boards, classes, items, difficulties as validated JSON.
             Add a board = add JSON + a small board plugin; no engine edits.
  render/    Presentation. `dom/` is the default renderer; the `Renderer` interface
             keeps a future canvas renderer swappable. Art assets resolve via
             `assets.ts` (emoji today, real art in a later phase).
  ui/        App bootstrap (the only file that touches the DOM at startup).
test/        Vitest: deterministic engine unit tests (seeded RNG) + a jsdom
             renderer smoke test.
```

Key seam: the engine exposes an action model — `allTargets(g)` enumerates legal
placements and each target's `apply(g)` performs it. The renderer and the bots use
the exact same seam, which is what makes headless play (and reproducible balance
testing) possible.

## Commands

```bash
npm install
npm run dev            # play locally at http://localhost:5173
npm test               # engine + renderer tests
npm run typecheck      # tsc --noEmit
npm run build          # dist/ (hosted, multi-asset)
npm run build:single   # dist-single/index.html — one portable offline file
```

The `build:single` output is a single self-contained HTML file: double-click it
(or open via `file://`) with no server, exactly how playtesters use it.

## Status

- **Phase 1 (done):** core engine + 4 core boards, classes, face events,
  threat/assault loop, scoring, playable DOM renderer.
- **Phase 2 (done):** all 16 boards (4 core + 8 alternates + 3 charter + Chess),
  every optional module (Attributes, Camp Followers, Spellcraft, Runecraft,
  Push-Your-Luck), the Adventurers' Guild, and the Chronicle (localStorage).
- **Phase 3 (done):** the Proving Grounds bot harness (`src/bots/`) — 5 strategies,
  headless N-game runner, auto-generated Designer's Notes, in-app runner. A seeded
  600-game parity gate reproduces the prototype's balance findings (Gambler top,
  Market #1 area, ~21% Delve bust rate, broken gold economy). Golden summary at
  `test/golden/lab-summary.json`.
- **Phase 5 (done):** printable physical components (`src/export/printSheet.ts`) —
  blank dry-erase board templates + a player dashboard + quick reference, built
  from the same content data. "🖨 Print components" on the title screen.
- **Phase 4 (todo):** real art assets replacing emoji, board skins, UX polish. The
  asset-registry seam (`src/render/assets.ts`) is already in place — `registerAsset`
  swaps an emoji key for real art without touching board logic; this phase supplies
  the art and skins.

49 tests pass (engine, advanced boards/modules, bot parity + 600-game gate, DOM
renderer, print export). See `../../.claude/plans/continue-silly-pike.md`.
