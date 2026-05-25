import { describe, it, expect } from 'vitest';
import { optimize } from './optimize';
import type { Options, Panel, StockSheet } from './types';

const defaultOptions: Options = {
  kerf: 0,
  allowRotation: true,
  singleSheet: false,
  showLabels: true,
};

describe('optimize', () => {
  it('returns empty result for no input', () => {
    const result = optimize([], [], defaultOptions);
    expect(result.sheets).toEqual([]);
    expect(result.unplaced).toEqual([]);
  });

  it('places a single panel that fits', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 10, width: 5, qty: 1, label: 'A' },
    ];
    const stock: StockSheet[] = [{ id: 's1', length: 20, width: 10, qty: 1 }];
    const result = optimize(panels, stock, defaultOptions);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placements).toHaveLength(1);
    expect(result.unplaced).toEqual([]);
    expect(result.totals.usedArea).toBe(50);
  });

  it('reports unplaced when panel is larger than every stock sheet', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 100, width: 100, qty: 1, label: 'huge' },
    ];
    const stock: StockSheet[] = [{ id: 's1', length: 20, width: 10, qty: 5 }];
    const result = optimize(panels, stock, defaultOptions);
    expect(result.sheets).toHaveLength(0);
    expect(result.unplaced).toHaveLength(1);
  });

  it('rotates a panel when needed', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 10, width: 4, qty: 1, label: 'A' },
    ];
    const stock: StockSheet[] = [{ id: 's1', length: 5, width: 10, qty: 1 }];
    const result = optimize(panels, stock, defaultOptions);
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0].placements).toHaveLength(1);
    const placement = result.sheets[0].placements[0];
    expect(placement.rotated).toBe(true);
    expect(placement.w).toBe(4);
    expect(placement.h).toBe(10);
  });

  it('kerf consumes space', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 50, width: 10, qty: 2, label: 'A' },
    ];
    // Two 50×10 panels exactly fit a 100×10 sheet only when kerf is 0.
    const stockNoKerf: StockSheet[] = [
      { id: 's1', length: 100, width: 10, qty: 2 },
    ];
    const r1 = optimize(panels, stockNoKerf, { ...defaultOptions, kerf: 0 });
    expect(r1.sheets).toHaveLength(1);
    expect(r1.sheets[0].placements).toHaveLength(2);

    const r2 = optimize(panels, stockNoKerf, { ...defaultOptions, kerf: 1 });
    // Two panels totalling 100 + 1 of kerf can't fit in 100 width, so the
    // second panel spills to a second sheet.
    const totalPlacements = r2.sheets.reduce(
      (s, sheet) => s + sheet.placements.length,
      0,
    );
    expect(totalPlacements).toBe(2);
    expect(r2.sheets.length).toBeGreaterThan(1);
  });

  it('places the reference example onto a single sheet', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 17, width: 19, qty: 1, label: 'Top' },
      { id: 'p2', length: 15.5, width: 19, qty: 4, label: 'Shelf' },
      { id: 'p3', length: 52, width: 19, qty: 2, label: 'Side' },
    ];
    const stock: StockSheet[] = [{ id: 's1', length: 96, width: 48, qty: 1 }];
    const result = optimize(panels, stock, {
      ...defaultOptions,
      kerf: 0.13,
    });
    expect(result.sheets).toHaveLength(1);
    expect(result.unplaced).toEqual([]);
    // 7 panels total
    expect(result.sheets[0].placements).toHaveLength(7);
    // Used area = 17*19 + 4*(15.5*19) + 2*(52*19) = 323 + 1178 + 1976 = 3477
    expect(result.sheets[0].usedArea).toBeCloseTo(3477, 5);
    expect(result.totals.totalArea).toBe(96 * 48);
  });

  it('respects singleSheet by not allocating more sheets', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 50, width: 10, qty: 4, label: 'A' },
    ];
    // Two would fit per 100×10 sheet, total needs 2 sheets.
    const stock: StockSheet[] = [
      { id: 's1', length: 100, width: 10, qty: 5 },
    ];
    const result = optimize(panels, stock, {
      ...defaultOptions,
      singleSheet: true,
    });
    expect(result.sheets).toHaveLength(1);
    expect(result.unplaced.length).toBeGreaterThan(0);
  });
});
