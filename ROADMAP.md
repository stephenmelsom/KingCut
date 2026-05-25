# Roadmap

Features not yet built. Grouped roughly by category, ordered by impact within each group.

## Material-aware

- **Multiple materials.** Tag each panel with a material name and only place it on stock of the same material. Group results per material. Useful for cabinet projects that mix oak ply, MDF, and melamine in one cutlist.
- **Edge banding.** Per-panel flags for which edges get banding, plus a total linear footage rollup per band type. Order-list output.
- **Offcut library.** Persist leftover rectangles (or let the user enter them) and consume them before cutting new stock. Huge for hobbyists with a scrap bin.

## At-the-saw usability

- **Ordered cut instructions.** Step-by-step "make this cut, then this one" sequence for each sheet, ordered so each cut is achievable on a table saw. Today's cut list is informational; this is operational.
- **Mobile layout.** Single-column responsive design — most users open this on a phone in the shop.
- **Undo/redo.** Anyone editing tables expects it. Cmd/Ctrl-Z + redo.
- **Keyboard shortcuts.** Tab through rows, Enter to add a row, Cmd-K for calculate, etc.

## Algorithm

- **Multiple-solution view.** Show top 3 layouts side-by-side and let the user pick. Useful when ties or near-ties exist.

---

If you pick one up, open a PR. The optimizer in `src/optimizer/` is pure TypeScript and easy to extend; everything else is React + Zustand.
