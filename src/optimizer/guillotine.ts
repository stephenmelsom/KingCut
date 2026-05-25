import type { Placement } from './types';

export type Rect = { x: number; y: number; w: number; h: number };

type Item = {
  panelId: string;
  label?: string;
  w: number;
  h: number;
  allowRotation: boolean;
  grain: boolean;
};

type FitChoice = 'best-area' | 'best-short-side' | 'best-long-side';

export type SplitRule = 'sas' | 'las';

export type PackResult = {
  placements: Placement[];
  remainingFree: Rect[];
  unplaced: Item[];
  usedArea: number;
};

const EPS = 1e-9;

/**
 * Pack items into a single bin (sheetW × sheetH) using a guillotine algorithm.
 * Items are tried in the given order. For each item, finds the best free rect
 * by the given heuristic, places it at the rect's origin, and splits the
 * remaining space into two rectangles using shorter-axis split (SAS).
 *
 * Kerf is subtracted on each split: the new free rects start `kerf` away
 * from the placed panel.
 */
export function packBin(
  sheetW: number,
  sheetH: number,
  items: Item[],
  kerf: number,
  fit: FitChoice,
  split: SplitRule = 'sas',
): PackResult {
  const free: Rect[] = [{ x: 0, y: 0, w: sheetW, h: sheetH }];
  const placements: Placement[] = [];
  const unplaced: Item[] = [];
  let usedArea = 0;

  for (const item of items) {
    const found = findFreeRect(free, item, fit);
    if (!found) {
      unplaced.push(item);
      continue;
    }
    const { index, rotated } = found;
    const rect = free[index];
    const w = rotated ? item.h : item.w;
    const h = rotated ? item.w : item.h;

    placements.push({
      panelId: item.panelId,
      label: item.label,
      x: rect.x,
      y: rect.y,
      w,
      h,
      rotated,
      grain: item.grain,
    });
    usedArea += w * h;

    // Split: replace `rect` with up to two new rects (right, top).
    free.splice(index, 1);
    const leftoverW = rect.w - w;
    const leftoverH = rect.h - h;

    // SAS: split so that the LARGER leftover stays as a full strip.
    //   If leftoverW >= leftoverH -> horizontal cut: top rect = full width.
    // LAS: opposite.
    const horizontalSplit =
      split === 'sas' ? leftoverW >= leftoverH : leftoverW < leftoverH;
    // horizontalSplit = the cut goes across the full width (top rect is full W)
    //                   and the right rect is bounded by panel height.
    // !horizontalSplit = the cut goes down the full height (right rect is full H)
    //                    and the top rect is bounded by panel width.

    if (horizontalSplit) {
      const rightW = rect.w - w - kerf;
      const topH = rect.h - h - kerf;
      if (rightW > EPS && h > EPS) {
        free.push({ x: rect.x + w + kerf, y: rect.y, w: rightW, h });
      }
      if (topH > EPS && rect.w > EPS) {
        free.push({ x: rect.x, y: rect.y + h + kerf, w: rect.w, h: topH });
      }
    } else {
      const rightW = rect.w - w - kerf;
      const topH = rect.h - h - kerf;
      if (rightW > EPS && rect.h > EPS) {
        free.push({ x: rect.x + w + kerf, y: rect.y, w: rightW, h: rect.h });
      }
      if (topH > EPS && w > EPS) {
        free.push({ x: rect.x, y: rect.y + h + kerf, w, h: topH });
      }
    }
  }

  return { placements, remainingFree: free, unplaced, usedArea };
}

function findFreeRect(
  free: Rect[],
  item: Item,
  fit: FitChoice,
): { index: number; rotated: boolean } | null {
  let bestIdx = -1;
  let bestRotated = false;
  let bestScore = Infinity;

  for (let i = 0; i < free.length; i++) {
    const r = free[i];
    // Try non-rotated.
    if (item.w <= r.w + EPS && item.h <= r.h + EPS) {
      const score = scoreFit(r, item.w, item.h, fit);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
        bestRotated = false;
      }
    }
    // Try rotated.
    if (item.allowRotation && item.h <= r.w + EPS && item.w <= r.h + EPS) {
      const score = scoreFit(r, item.h, item.w, fit);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
        bestRotated = true;
      }
    }
  }
  return bestIdx === -1 ? null : { index: bestIdx, rotated: bestRotated };
}

function scoreFit(r: Rect, w: number, h: number, fit: FitChoice): number {
  const leftoverW = r.w - w;
  const leftoverH = r.h - h;
  switch (fit) {
    case 'best-area':
      return r.w * r.h - w * h;
    case 'best-short-side':
      return Math.min(leftoverW, leftoverH);
    case 'best-long-side':
      return Math.max(leftoverW, leftoverH);
  }
}
