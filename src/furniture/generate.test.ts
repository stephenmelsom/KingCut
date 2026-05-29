import { describe, expect, it } from 'vitest';
import {
  defaultFurnitureDesign,
  generateFurnitureParts,
  getFurnitureDesignValidationError,
  normalizeFurnitureDesign,
} from './generate';

describe('furniture grid generation', () => {
  it('generates a basic frameless carcass', () => {
    const parts = generateFurnitureParts({
      ...defaultFurnitureDesign,
      width: 30,
      height: 34,
      depth: 24,
      materialThickness: 0.75,
      includeBack: false,
      rows: [{ id: 'row-1', height: 32.5 }],
      columns: [{ id: 'col-1', width: 28.5 }],
      cells: [[{ kind: 'shelf', door: 'none' }]],
    });

    expect(parts).toEqual([
      { length: 34, width: 24, qty: 2, label: 'Cabinet side', thickness: 0.75 },
      {
        length: 28.5,
        width: 24,
        qty: 2,
        label: 'Cabinet top/bottom',
        thickness: 0.75,
      },
    ]);
  });

  it('adds a recessed toe board and shrinks the usable interior height', () => {
    const parts = generateFurnitureParts({
      ...defaultFurnitureDesign,
      width: 30,
      height: 34.5,
      depth: 24,
      materialThickness: 0.75,
      includeBack: false,
      includeToeKick: true,
      toeKickHeight: 4,
      toeKickDepth: 3,
      // interior height = 34.5 - 2*0.75 - 4 = 29
      rows: [{ id: 'row-1', height: 29 }],
      columns: [{ id: 'col-1', width: 28.5 }],
      cells: [[{ kind: 'shelf', door: 'none' }]],
    });

    expect(parts).toContainEqual({
      length: 28.5,
      width: 4,
      qty: 1,
      label: 'Toe kick board',
      thickness: 0.75,
    });
    // Cabinet sides still run full height to the floor.
    expect(parts).toContainEqual({
      length: 34.5,
      width: 24,
      qty: 2,
      label: 'Cabinet side',
      thickness: 0.75,
    });
  });

  it('rejects a toe kick taller than the available interior', () => {
    expect(
      getFurnitureDesignValidationError({
        ...defaultFurnitureDesign,
        includeToeKick: true,
        toeKickHeight: 100,
      }),
    ).toMatch(/interior dimensions/i);
  });

  it('rejects a toe kick setback that reaches the cabinet depth', () => {
    expect(
      getFurnitureDesignValidationError({
        ...defaultFurnitureDesign,
        depth: 24,
        includeToeKick: true,
        toeKickDepth: 24,
      }),
    ).toMatch(/setback/i);
  });

  it('rejects row and column sums that do not match the interior', () => {
    expect(
      getFurnitureDesignValidationError({
        ...defaultFurnitureDesign,
        columns: [{ id: 'col-1', width: 20 }],
      }),
    ).toMatch(/column widths/i);

    expect(
      getFurnitureDesignValidationError({
        ...defaultFurnitureDesign,
        rows: [{ id: 'row-1', height: 20 }],
        cells: [[{ kind: 'shelf', door: 'none' }]],
      }),
    ).toMatch(/row heights/i);
  });

  it('generates backs, dividers, drawers, single doors, and paired doors', () => {
    const parts = generateFurnitureParts({
      ...defaultFurnitureDesign,
      width: 40,
      height: 32,
      depth: 20,
      materialThickness: 0.75,
      includeBack: true,
      rows: [
        { id: 'row-1', height: 12 },
        { id: 'row-2', height: 17.75 },
      ],
      columns: [
        { id: 'col-1', width: 18 },
        { id: 'col-2', width: 19.75 },
      ],
      cells: [
        [
          { kind: 'drawer', door: 'none' },
          { kind: 'shelf', door: 'single' },
        ],
        [
          { kind: 'shelf', door: 'pair' },
          { kind: 'shelf', door: 'none' },
        ],
      ],
      drawerSideClearance: 1,
      drawerFrontGap: 0.125,
      drawerBoxThickness: 0.5,
    });

    expect(parts).toContainEqual({
      length: 40,
      width: 32,
      qty: 1,
      label: 'Cabinet back',
      thickness: 0.25,
    });
    expect(parts).toContainEqual({
      length: 30.5,
      width: 20,
      qty: 1,
      label: 'Vertical divider 1',
      thickness: 0.75,
    });
    expect(parts).toContainEqual({
      length: 18,
      width: 20,
      qty: 1,
      label: 'Column 1 horizontal divider 1',
      thickness: 0.75,
    });
    expect(parts).toContainEqual({
      length: 17.875,
      width: 11.875,
      qty: 1,
      label: 'R1C1 drawer front',
      thickness: 0.75,
    });
    expect(parts).toContainEqual({
      length: 19.625,
      width: 11.875,
      qty: 1,
      label: 'R1C2 door',
      thickness: 0.75,
    });
    expect(parts).toContainEqual({
      length: 8.9375,
      width: 17.625,
      qty: 2,
      label: 'R2C1 door pair',
      thickness: 0.75,
    });
    expect(parts).toContainEqual({
      length: 16,
      width: 18.25,
      qty: 1,
      label: 'R1C1 drawer bottom',
      thickness: 0.25,
    });
  });
});

describe('legacy furniture migration', () => {
  it('migrates shelf-only designs into shelf rows', () => {
    const migrated = normalizeFurnitureDesign({
      shelfCount: 2,
      drawerCount: 0,
    });

    expect(migrated.columns).toHaveLength(1);
    expect(migrated.rows).toHaveLength(3);
    expect(migrated.cells.flat()).toEqual([
      { kind: 'shelf', door: 'none' },
      { kind: 'shelf', door: 'none' },
      { kind: 'shelf', door: 'none' },
    ]);
  });

  it('migrates drawer-only designs into drawer rows', () => {
    const migrated = normalizeFurnitureDesign({
      shelfCount: 0,
      drawerCount: 3,
    });

    expect(migrated.rows).toHaveLength(3);
    expect(migrated.cells.flat()).toEqual([
      { kind: 'drawer', door: 'none' },
      { kind: 'drawer', door: 'none' },
      { kind: 'drawer', door: 'none' },
    ]);
  });

  it('migrates mixed designs with drawer rows first', () => {
    const migrated = normalizeFurnitureDesign({
      shelfCount: 1,
      drawerCount: 2,
    });

    expect(migrated.rows).toHaveLength(4);
    expect(migrated.cells.flat()).toEqual([
      { kind: 'drawer', door: 'none' },
      { kind: 'drawer', door: 'none' },
      { kind: 'shelf', door: 'none' },
      { kind: 'shelf', door: 'none' },
    ]);
  });
});
