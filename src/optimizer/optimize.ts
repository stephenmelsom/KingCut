import { packBin, type SplitRule } from './guillotine';
import type {
  Cut,
  Options,
  Panel,
  Placement,
  Result,
  SheetLayout,
  StockSheet,
} from './types';

type Item = {
  panelId: string;
  label?: string;
  w: number;
  h: number;
  allowRotation: boolean;
};

type SortName =
  | 'area-desc'
  | 'long-side-desc'
  | 'short-side-desc'
  | 'perimeter-desc'
  | 'area-asc'
  | 'long-side-asc';

type FitName = 'best-area' | 'best-short-side' | 'best-long-side';

const SORTS: SortName[] = [
  'area-desc',
  'long-side-desc',
  'short-side-desc',
  'perimeter-desc',
  'area-asc',
  'long-side-asc',
];
const FITS: FitName[] = ['best-area', 'best-short-side', 'best-long-side'];
const SPLITS: SplitRule[] = ['sas', 'las'];

export function optimize(
  panels: Panel[],
  stock: StockSheet[],
  options: Options,
): Result {
  const items: Item[] = [];
  for (const p of panels) {
    const qty = Math.max(0, Math.floor(p.qty || 0));
    const w = Number(p.length);
    const h = Number(p.width);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) continue;
    for (let i = 0; i < qty; i++) {
      items.push({
        panelId: p.id,
        label: p.label,
        w,
        h,
        allowRotation: options.allowRotation,
      });
    }
  }

  const sheets = expandStock(stock);
  if (sheets.length === 0 || items.length === 0) {
    return emptyResult(items);
  }

  let best: Result | null = null;
  for (const sort of SORTS) {
    for (const fit of FITS) {
      for (const split of SPLITS) {
        for (const swapSheet of [false, true]) {
          const ordered = sortItems(items, sort);
          const r = packAcrossSheets(
            ordered,
            sheets,
            options,
            fit,
            split,
            swapSheet,
          );
          if (better(r, best)) best = r;
        }
      }
    }
  }
  return best ?? emptyResult(items);
}

function expandStock(stock: StockSheet[]): { sheet: StockSheet; copyIndex: number }[] {
  const list: { sheet: StockSheet; copyIndex: number }[] = [];
  const sorted = [...stock]
    .filter(
      (s) =>
        Number(s.length) > 0 &&
        Number(s.width) > 0 &&
        Math.floor(s.qty || 0) > 0,
    )
    .sort((a, b) => b.length * b.width - a.length * a.width);
  for (const s of sorted) {
    const qty = Math.max(0, Math.floor(s.qty || 0));
    for (let i = 0; i < qty; i++) list.push({ sheet: s, copyIndex: i });
  }
  return list;
}

function sortItems(items: Item[], sort: SortName): Item[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case 'area-desc':
        return b.w * b.h - a.w * a.h;
      case 'long-side-desc':
        return Math.max(b.w, b.h) - Math.max(a.w, a.h);
      case 'short-side-desc':
        return Math.min(b.w, b.h) - Math.min(a.w, a.h);
      case 'perimeter-desc':
        return b.w + b.h - (a.w + a.h);
      case 'area-asc':
        return a.w * a.h - b.w * b.h;
      case 'long-side-asc':
        return Math.max(a.w, a.h) - Math.max(b.w, b.h);
    }
  });
  return copy;
}

function packAcrossSheets(
  items: Item[],
  stockList: { sheet: StockSheet; copyIndex: number }[],
  options: Options,
  fit: FitName,
  split: SplitRule,
  swapSheet: boolean,
): Result {
  let remaining = items;
  const sheets: SheetLayout[] = [];
  const maxSheets = options.singleSheet ? 1 : stockList.length;

  for (let i = 0; i < maxSheets && remaining.length > 0; i++) {
    const { sheet } = stockList[i];
    const rawW = Number(sheet.length);
    const rawH = Number(sheet.width);
    const sheetW = swapSheet ? rawH : rawW;
    const sheetH = swapSheet ? rawW : rawH;
    const packed = packBin(sheetW, sheetH, remaining, options.kerf, fit, split);
    if (packed.placements.length === 0) {
      // Nothing fit on this sheet — likely all items larger than sheet, give up.
      break;
    }
    const cuts = deriveCuts(packed.placements, sheetW, sheetH, sheets.length);
    const cutLength = cuts.reduce((s, c) => s + c.length, 0);
    sheets.push({
      sheetId: sheet.id,
      sheetLabel: sheet.label,
      sheetIndex: sheets.length,
      sheetW,
      sheetH,
      placements: packed.placements,
      cuts,
      usedArea: packed.usedArea,
      wastedArea: sheetW * sheetH - packed.usedArea,
      cutLength,
    });
    remaining = packed.unplaced;
  }

  const totals = {
    usedArea: sheets.reduce((s, x) => s + x.usedArea, 0),
    wastedArea: sheets.reduce((s, x) => s + x.wastedArea, 0),
    totalArea: sheets.reduce((s, x) => s + x.sheetW * x.sheetH, 0),
    cuts: sheets.reduce((s, x) => s + x.cuts.length, 0),
    cutLength: sheets.reduce((s, x) => s + x.cutLength, 0),
    sheetsUsed: sheets.length,
  };

  return {
    sheets,
    unplaced: remaining.map((i) => ({
      panelId: i.panelId,
      label: i.label,
      w: i.w,
      h: i.h,
    })),
    totals,
  };
}

function better(a: Result, b: Result | null): boolean {
  if (!b) return true;
  // Fewer unplaced wins.
  if (a.unplaced.length !== b.unplaced.length)
    return a.unplaced.length < b.unplaced.length;
  // Fewer sheets used wins.
  if (a.totals.sheetsUsed !== b.totals.sheetsUsed)
    return a.totals.sheetsUsed < b.totals.sheetsUsed;
  // Less waste wins.
  return a.totals.wastedArea < b.totals.wastedArea;
}

function emptyResult(items: Item[]): Result {
  return {
    sheets: [],
    unplaced: items.map((i) => ({
      panelId: i.panelId,
      label: i.label,
      w: i.w,
      h: i.h,
    })),
    totals: {
      usedArea: 0,
      wastedArea: 0,
      totalArea: 0,
      cuts: 0,
      cutLength: 0,
      sheetsUsed: 0,
    },
  };
}

/**
 * Derive an approximate ordered guillotine cut list from placements.
 * For each unique edge x-coordinate (other than 0 and sheetW) within the
 * filled region, emit a vertical cut. Same for horizontal.
 * This is an approximation — not all placements are reachable by global
 * cuts, but it gives a useful count and total cut length.
 */
function deriveCuts(
  placements: Placement[],
  sheetW: number,
  sheetH: number,
  sheetIndex: number,
): Cut[] {
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const p of placements) {
    if (p.x > 0) xs.add(round(p.x));
    if (p.x + p.w < sheetW) xs.add(round(p.x + p.w));
    if (p.y > 0) ys.add(round(p.y));
    if (p.y + p.h < sheetH) ys.add(round(p.y + p.h));
  }
  const cuts: Cut[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    cuts.push({
      sheetIndex,
      axis: 'x',
      pos: x,
      from: { x: 0, y: 0, w: sheetW, h: sheetH },
      length: sheetH,
    });
  }
  for (const y of [...ys].sort((a, b) => a - b)) {
    cuts.push({
      sheetIndex,
      axis: 'y',
      pos: y,
      from: { x: 0, y: 0, w: sheetW, h: sheetH },
      length: sheetW,
    });
  }
  return cuts;
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
