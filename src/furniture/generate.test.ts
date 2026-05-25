import { describe, expect, it } from 'vitest';
import {
  defaultFurnitureDesign,
  generateFurnitureParts,
} from './generate';

describe('generateFurnitureParts', () => {
  it('generates a basic frameless carcass', () => {
    const parts = generateFurnitureParts({
      ...defaultFurnitureDesign,
      width: 30,
      height: 34,
      depth: 24,
      materialThickness: 0.75,
      shelfCount: 0,
      includeBack: false,
      drawerCount: 0,
    });

    expect(parts).toEqual([
      { length: 34, width: 24, qty: 2, label: 'Cabinet side' },
      { length: 28.5, width: 24, qty: 2, label: 'Cabinet top/bottom' },
    ]);
  });

  it('includes shelves and back when configured', () => {
    const parts = generateFurnitureParts({
      ...defaultFurnitureDesign,
      width: 36,
      height: 72,
      depth: 18,
      materialThickness: 0.75,
      shelfCount: 3,
      includeBack: true,
      drawerCount: 0,
    });

    expect(parts).toContainEqual({
      length: 34.5,
      width: 18,
      qty: 3,
      label: 'Cabinet shelf',
    });
    expect(parts).toContainEqual({
      length: 36,
      width: 72,
      qty: 1,
      label: 'Cabinet back',
    });
  });

  it('generates drawer boxes with equal-height drawer fronts', () => {
    const parts = generateFurnitureParts({
      ...defaultFurnitureDesign,
      width: 30,
      height: 34.5,
      depth: 23.25,
      materialThickness: 0.75,
      shelfCount: 0,
      includeBack: false,
      drawerCount: 3,
      drawerSideClearance: 1,
      drawerFrontGap: 0.125,
      drawerBoxThickness: 0.5,
    });

    expect(parts).toContainEqual({
      length: 27.5,
      width: 10.875,
      qty: 1,
      label: 'Drawer 1 front',
    });
    expect(parts).toContainEqual({
      length: 22.5,
      width: 10.875,
      qty: 2,
      label: 'Drawer 1 left/right side',
    });
    expect(parts).toContainEqual({
      length: 26.5,
      width: 21.5,
      qty: 1,
      label: 'Drawer 3 bottom',
    });
  });

  it('rejects invalid dimensions', () => {
    expect(() =>
      generateFurnitureParts({
        ...defaultFurnitureDesign,
        width: 1,
        materialThickness: 0.75,
      }),
    ).toThrow(/interior/i);

    expect(() =>
      generateFurnitureParts({
        ...defaultFurnitureDesign,
        drawerCount: 2,
        drawerFrontGap: 20,
      }),
    ).toThrow(/drawer/i);
  });
});
