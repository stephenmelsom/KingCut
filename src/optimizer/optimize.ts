import { packBin, type SplitRule } from './guillotine';
import type {
  Cut,
  OptimizationPriority,
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
  /** When true and respectGrain is on, this item only fits on grained stock. */
  grain: boolean;
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
const THOROUGH_ORDER_LIMIT = 16;

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
    const hasGrain = !!p.grain;
    // Grained panels cannot rotate when grain is being respected.
    const allowRotation =
      options.allowRotation && !(options.respectGrain && hasGrain);
    for (let i = 0; i < qty; i++) {
      items.push({
        panelId: p.id,
        label: p.label,
        w,
        h,
        allowRotation,
        grain: hasGrain,
      });
    }
  }

  const sheets = expandStock(stock);
  if (sheets.length === 0 || items.length === 0) {
    return emptyResult(items);
  }

  let best: Result | null = null;
  const seed = seedFor(items, sheets);
  for (const sort of SORTS) {
    const sorted = sortItems(items, sort);
    const orders = orderVariants(sorted, options.thorough, mixSeed(seed, sort));
    for (const fit of FITS) {
      for (const split of SPLITS) {
        for (const swapSheet of [false, true]) {
          for (const ordered of orders) {
            const r = packAcrossSheets(
              ordered,
              sheets,
              options,
              fit,
              split,
              swapSheet,
            );
            if (better(r, best, options.priority)) best = r;
          }
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

function orderVariants(items: Item[], thorough: boolean, seed: number): Item[][] {
  if (!thorough || items.length < 3) return [items];

  const count = Math.min(
    THOROUGH_ORDER_LIMIT,
    Math.max(4, items.length * 2),
  );
  const variants = [items];
  const seen = new Set([signature(items)]);

  for (let i = 0; i < count; i++) {
    const shuffled = shuffle(items, mixSeed(seed, String(i)));
    const key = signature(shuffled);
    if (!seen.has(key)) {
      seen.add(key);
      variants.push(shuffled);
    }
  }

  return variants;
}

function shuffle(items: Item[], seed: number): Item[] {
  const next = [...items];
  const random = mulberry32(seed);
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function signature(items: Item[]): string {
  return items
    .map((item) => `${item.panelId}:${item.w}:${item.h}:${item.allowRotation}`)
    .join('|');
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
    const sheetHasGrain = !!sheet.grain;
    // When grain is being respected, don't swap a grained sheet's orientation
    // — grain is a physical property of the stock, not a free variable.
    const effectiveSwap = options.respectGrain && sheetHasGrain ? false : swapSheet;
    const rawW = Number(sheet.length);
    const rawH = Number(sheet.width);
    const sheetW = effectiveSwap ? rawH : rawW;
    const sheetH = effectiveSwap ? rawW : rawH;

    // Partition the queue: when respecting grain, grained items can only be
    // placed on grained stock.
    const eligible: Item[] = [];
    const ineligible: Item[] = [];
    for (const it of remaining) {
      if (options.respectGrain && it.grain && !sheetHasGrain) {
        ineligible.push(it);
      } else {
        eligible.push(it);
      }
    }

    const packed = packBin(sheetW, sheetH, eligible, options.kerf, fit, split);
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
    // Carry forward what didn't fit on this sheet plus anything that was
    // ineligible for this sheet's grain — both should get a chance on later sheets.
    remaining = [...packed.unplaced, ...ineligible];
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

function better(
  a: Result,
  b: Result | null,
  priority: OptimizationPriority,
): boolean {
  if (!b) return true;
  // Placing every panel is always the first concern.
  if (a.unplaced.length !== b.unplaced.length)
    return a.unplaced.length < b.unplaced.length;
  const order = criteriaFor(priority);
  for (const key of order) {
    const av = metric(a, key);
    const bv = metric(b, key);
    if (av !== bv) return av < bv;
  }
  return false;
}

type Metric = 'waste' | 'sheets' | 'cuts' | 'cut-length';

function criteriaFor(priority: OptimizationPriority): Metric[] {
  // The chosen priority leads. The remaining metrics are tiebreakers in a
  // sensible order that keeps results stable across priority choices.
  switch (priority) {
    case 'waste':
      return ['waste', 'sheets', 'cuts', 'cut-length'];
    case 'sheets':
      return ['sheets', 'waste', 'cuts', 'cut-length'];
    case 'cuts':
      return ['cuts', 'cut-length', 'waste', 'sheets'];
    case 'cut-length':
      return ['cut-length', 'cuts', 'waste', 'sheets'];
  }
}

function metric(r: Result, key: Metric): number {
  switch (key) {
    case 'waste':
      return r.totals.wastedArea;
    case 'sheets':
      return r.totals.sheetsUsed;
    case 'cuts':
      return r.totals.cuts;
    case 'cut-length':
      return r.totals.cutLength;
  }
}

function seedFor(
  items: Item[],
  sheets: { sheet: StockSheet; copyIndex: number }[],
): number {
  const itemKey = items
    .map((item) =>
      [
        item.panelId,
        item.label ?? '',
        item.w,
        item.h,
        item.allowRotation ? 1 : 0,
        item.grain ? 1 : 0,
      ].join(':'),
    )
    .join('|');
  const sheetKey = sheets
    .map(({ sheet, copyIndex }) =>
      [
        sheet.id,
        sheet.length,
        sheet.width,
        copyIndex,
        sheet.grain ? 1 : 0,
      ].join(':'),
    )
    .join('|');
  return hashString(`${itemKey}#${sheetKey}`);
}

function mixSeed(seed: number, value: string): number {
  return hashString(`${seed}:${value}`);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
export function deriveCuts(
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
