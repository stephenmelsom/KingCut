import { describe, it, expect } from 'vitest';
import { optimize } from './optimize';
import type { Options, Panel, StockSheet } from './types';

const defaultOptions: Options = {
  kerf: 0,
  allowRotation: true,
  singleSheet: false,
  showLabels: true,
  priority: 'waste',
  thorough: false,
  respectGrain: false,
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

  describe('grain direction', () => {
    it('rotates a grained panel when grain is NOT respected', () => {
      // 10×4 panel must rotate to fit a 5×10 sheet.
      const panels: Panel[] = [
        { id: 'p1', length: 10, width: 4, qty: 1, label: 'A', grain: true },
      ];
      const stock: StockSheet[] = [
        { id: 's1', length: 5, width: 10, qty: 1, grain: true },
      ];
      const r = optimize(panels, stock, {
        ...defaultOptions,
        respectGrain: false,
      });
      expect(r.sheets).toHaveLength(1);
      expect(r.sheets[0].placements[0].rotated).toBe(true);
    });

    it('refuses to rotate a grained panel when grain IS respected', () => {
      const panels: Panel[] = [
        { id: 'p1', length: 10, width: 4, qty: 1, label: 'A', grain: true },
      ];
      // The only sheet here would require the panel to rotate to fit;
      // grain respect should block that, leaving it unplaced.
      const stock: StockSheet[] = [
        { id: 's1', length: 5, width: 10, qty: 1, grain: true },
      ];
      const r = optimize(panels, stock, {
        ...defaultOptions,
        respectGrain: true,
      });
      expect(r.sheets).toHaveLength(0);
      expect(r.unplaced).toHaveLength(1);
    });

    it('places a grained panel onto matching grained stock without rotation', () => {
      const panels: Panel[] = [
        { id: 'p1', length: 10, width: 4, qty: 1, label: 'A', grain: true },
      ];
      const stock: StockSheet[] = [
        { id: 's1', length: 20, width: 10, qty: 1, grain: true },
      ];
      const r = optimize(panels, stock, {
        ...defaultOptions,
        respectGrain: true,
      });
      expect(r.sheets).toHaveLength(1);
      expect(r.sheets[0].placements[0].rotated).toBe(false);
      expect(r.sheets[0].placements[0].grain).toBe(true);
    });

    it('keeps grained panels off ungrained stock when grain is respected', () => {
      const panels: Panel[] = [
        { id: 'p1', length: 5, width: 5, qty: 1, label: 'A', grain: true },
      ];
      const stock: StockSheet[] = [
        { id: 's1', length: 20, width: 20, qty: 1, grain: false },
      ];
      const r = optimize(panels, stock, {
        ...defaultOptions,
        respectGrain: true,
      });
      expect(r.sheets).toHaveLength(0);
      expect(r.unplaced).toHaveLength(1);
    });
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

  it('keeps thorough search deterministic and no worse than normal search', () => {
    const panels: Panel[] = [
      { id: 'p1', length: 32, width: 14, qty: 2, label: 'A' },
      { id: 'p2', length: 27, width: 18, qty: 2, label: 'B' },
      { id: 'p3', length: 19, width: 17, qty: 3, label: 'C' },
      { id: 'p4', length: 15, width: 11, qty: 4, label: 'D' },
      { id: 'p5', length: 8, width: 31, qty: 2, label: 'E' },
    ];
    const stock: StockSheet[] = [{ id: 's1', length: 60, width: 40, qty: 4 }];
    const normal = optimize(panels, stock, defaultOptions);
    const thorough = optimize(panels, stock, {
      ...defaultOptions,
      thorough: true,
    });
    const thoroughAgain = optimize(panels, stock, {
      ...defaultOptions,
      thorough: true,
    });

    expect(thorough).toEqual(thoroughAgain);
    expect(thorough.unplaced.length).toBeLessThanOrEqual(normal.unplaced.length);
    if (thorough.unplaced.length === normal.unplaced.length) {
      expect(thorough.totals.wastedArea).toBeLessThanOrEqual(
        normal.totals.wastedArea,
      );
    }
  });
});
