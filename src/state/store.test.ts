import { describe, expect, it } from 'vitest';
import { defaultFurnitureDesign } from '../furniture/generate';
import { useStore } from './store';

describe('store furniture handoff', () => {
  it('replaces panels with furniture parts while preserving stock and options', () => {
    const stock = [{ id: 'sheet-1', length: 96, width: 48, qty: 2, label: 'Maple' }];
    const options = {
      kerf: 0.125,
      allowRotation: false,
      singleSheet: true,
      showLabels: false,
      priority: 'sheets' as const,
      thorough: true,
      respectGrain: true,
    };

    useStore.setState({
      panels: [{ id: 'old-panel', length: 10, width: 10, qty: 1, label: 'Old' }],
      stock,
      options,
      furnitureDesign: {
        ...defaultFurnitureDesign,
        includeBack: false,
        rows: [{ id: 'row-1', height: 33 }],
        columns: [{ id: 'col-1', width: 28.5 }],
        cells: [[{ kind: 'shelf', door: 'single' }]],
      },
      result: {
        sheets: [],
        unplaced: [],
        totals: {
          usedArea: 1,
          wastedArea: 1,
          totalArea: 2,
          cuts: 0,
          cutLength: 0,
          sheetsUsed: 0,
        },
      },
    });

    useStore.getState().replacePanelsWithFurnitureParts();

    const state = useStore.getState();
    expect(state.stock).toBe(stock);
    expect(state.options).toBe(options);
    expect(state.result).toBeNull();
    expect(state.panels).not.toContainEqual(
      expect.objectContaining({ id: 'old-panel' }),
    );
    expect(state.panels.map((panel) => panel.label)).toEqual([
      'Cabinet side',
      'Cabinet top/bottom',
      'R1C1 door',
    ]);
  });
});
