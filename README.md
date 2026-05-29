# KingCut

A free, browser-based cutlist optimizer for sheet goods. Enter a list of panels you want to cut and a list of stock sheets you have, and KingCut figures out a layout that minimizes waste.

No accounts. No upload. Everything runs in your browser; your data stays on your machine.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build a static bundle

```bash
npm run build
```

Output lands in `dist/` — deploy it anywhere (GitHub Pages, Netlify, Vercel, a USB stick).

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow that publishes `dist/` to GitHub Pages on every push to `main`.

In GitHub, open Settings → Pages, set Source to `GitHub Actions`, then push to `main`. The site will be published at:

```text
https://stephenmelsom.github.io/KingCut/
```

## Tests

```bash
npm test
```

Covers the optimizer (placement, rotation, kerf, multi-sheet overflow, the reference example).

## How it works

The optimizer is a guillotine bin packer: it places panels into the bottom-left of free rectangles, then splits the remaining space along a single edge-to-edge cut. This matches the cuts you can actually make on a table saw or panel saw. Kerf (blade thickness) is subtracted on every split.

For each calculation it tries multiple combinations of:

- Panel sort order (largest area first, longest side first, smallest first, …)
- Free-rectangle choice heuristic (best area fit, best short-side fit, best long-side fit)
- Split direction (shorter-axis split, longer-axis split)
- Sheet orientation (both ways)

…and returns the layout with the fewest unplaced panels, then fewest sheets, then least waste.

It will not always match the optimum of a paid commercial optimizer, but for typical inputs (a few dozen panels into shop-sized stock) it gets within a few percent of the theoretical best.

## What it doesn't do (yet)

- Edge banding
- Grain direction
- Per-panel material matching
- Saved projects / sharing
- Print-friendly cut sheets

Pull requests welcome.
