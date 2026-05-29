# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Notes

- This is a side project. Don't worry about creating branches or PRs. Just yeet everything to main.

## What this is

KingCut is a free, browser-based cutlist optimizer for sheet goods. The user enters panels to cut and stock sheets they own; the app computes a low-waste guillotine cutting layout. Everything runs client-side — no backend, no accounts. State persists to `localStorage` and projects can be shared via a URL hash. It's a Vite + React 19 + TypeScript SPA deployed as a static bundle to GitHub Pages.

## Commands

```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # tsc -b (typecheck) + vite build → dist/
npm run lint         # eslint
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch mode
```

Run a single test file or test by name:

```bash
npx vitest run src/optimizer/optimize.test.ts
npx vitest run -t "respects grain"
```

Tests run in the `node` environment (see `vite.config.ts`) and `globals: false`, so test files import `describe`/`it`/`expect` from `vitest` explicitly. CI (`.github/workflows/pages.yml`) runs `npm test` then `npm run build` and deploys `dist/` on every push to `main`.

## Architecture

The codebase splits into a pure-logic core (no React) and a React/Zustand UI shell. When changing behavior, prefer editing the pure modules and their tests — the UI mostly renders their output.

### `src/optimizer/` — the packing engine (pure TypeScript, the heart of the app)

- `types.ts` — shared domain types: `Panel`, `StockSheet`, `Options`, and the result shape (`Result` → `SheetLayout[]` → `Placement[]`/`Cut[]`). Read this first.
- `guillotine.ts` — `packBin()` packs items into a *single* sheet using a guillotine free-rectangle algorithm: place an item in the best free rect (by a fit heuristic), then split the leftover space with one edge-to-edge cut (SAS = shorter-axis split, or LAS). Kerf is subtracted on every split. This is the lowest-level primitive.
- `optimize.ts` — `optimize()` is the entry point. It first **partitions panels and stock by material thickness** (panels only nest on stock of equal thickness) via `thicknessKey`, solves each thickness group independently in `optimizeGroup`, then merges and re-indexes the layouts in `mergeResults`. Within a group it brute-forces the cartesian product of {sort order × fit heuristic × split rule × sheet-orientation swap × (optional) shuffled orders} and keeps the best result per `better()`/`criteriaFor()`, which ranks by the user's chosen `priority` (waste / sheets / cuts / cut-length) with the others as tiebreakers — but always minimizes unplaced panels first. `deriveCuts()` (also exported, reused by the store) reconstructs an approximate ordered cut list from final placements.

The optimizer is **deterministic**: the "thorough" shuffle variants are seeded from a hash of the inputs (`seedFor`/`mulberry32`), so the same inputs always yield the same layout.

Grain handling lives in `optimizeGroup`/`packAcrossSheets`: when `respectGrain` is on, grained panels can't rotate and only place on grained stock, and grained stock won't have its orientation swapped.

### `src/furniture/` — cabinet part generator (pure TypeScript)

- `generate.ts` — `generateFurnitureParts(design)` turns a `FurnitureDesign` (carcass dimensions, a grid of rows × columns, per-cell shelf/drawer/door config, toe kick, back panel) into a flat list of `FurniturePartDraft` panels with thicknesses. `normalizeFurnitureDesign()` fills defaults and migrates legacy shapes — always route designs through it. This feeds the cutlist via the store's `replacePanelsWithFurnitureParts`.

### `src/state/` — Zustand store + persistence

- `store.ts` — single `useStore` (Zustand) holding panels, stock, options, unit, furniture design, the active project, and the last optimization `result`. Every mutating action calls `persistSoon()` to write through to `localStorage`. `calculate()` invokes `optimize()`; `movePlacement()` lets the user drag a panel and recomputes that sheet's cuts/areas via `deriveCuts`. Supports multiple named projects.
- `persistence.ts` — `localStorage` read/write (keys are versioned, e.g. `kingcut/projects/v1`), debounced saves, and one-time migration of legacy single-project state.
- `sharing.ts` — encode/decode a project into a URL hash (`#project=…`) for share links, plus CSV import/export of panels + stock.

### `src/components/` — React 19 view layer

Presentational components driven by the store. `App.tsx` is a two-tab shell (Cutlist / Furniture) with a resizable left input panel. `LayoutCanvas.tsx` renders/drags the computed sheets; `PrintView.tsx` produces the print/PDF cut sheets; `FurniturePage.tsx` + `FurniturePreview.tsx` (Three.js) drive the cabinet designer.

## Gotchas

- **Print/PDF layout is fragile.** Several recent commits fixed the print sheet diagram overflowing/clipping the page. Any change touching `PrintView.tsx` or print CSS must be rendered and visually verified (e.g. headless Chrome → PDF) before deploy — don't eyeball the JSX.
- **Default thickness is `0.75`.** Both the optimizer (`DEFAULT_THICKNESS`) and store blanks assume 0.75 when thickness is missing; thickness grouping rounds to 4 decimals to absorb float noise.
- Keep optimizer/furniture changes covered by the existing `*.test.ts` suites — they encode the reference example and edge cases (rotation, kerf, multi-sheet overflow, grain, per-thickness nesting).
