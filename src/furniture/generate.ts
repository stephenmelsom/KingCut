import type { FurnitureDesign, FurniturePartDraft } from './types';

export const defaultFurnitureDesign: FurnitureDesign = {
  width: 30,
  height: 34.5,
  depth: 23.25,
  materialThickness: 0.75,
  shelfCount: 1,
  includeBack: true,
  backThickness: 0.25,
  drawerCount: 0,
  drawerBoxThickness: 0.5,
  drawerBottomThickness: 0.25,
  drawerSideClearance: 1,
  drawerFrontGap: 0.125,
};

export function normalizeFurnitureDesign(
  design?: Partial<FurnitureDesign> | null,
): FurnitureDesign {
  return { ...defaultFurnitureDesign, ...design };
}

export function generateFurnitureParts(
  design: FurnitureDesign,
): FurniturePartDraft[] {
  validateFurnitureDesign(design);

  const interiorWidth = design.width - 2 * design.materialThickness;
  const parts: FurniturePartDraft[] = [
    {
      length: design.height,
      width: design.depth,
      qty: 2,
      label: 'Cabinet side',
    },
    {
      length: interiorWidth,
      width: design.depth,
      qty: 2,
      label: 'Cabinet top/bottom',
    },
  ];

  if (design.shelfCount > 0) {
    parts.push({
      length: interiorWidth,
      width: design.depth,
      qty: design.shelfCount,
      label: 'Cabinet shelf',
    });
  }

  if (design.includeBack) {
    parts.push({
      length: design.width,
      width: design.height,
      qty: 1,
      label: 'Cabinet back',
    });
  }

  if (design.drawerCount > 0) {
    const drawerOutsideWidth =
      design.width - 2 * design.materialThickness - design.drawerSideClearance;
    const drawerOutsideDepth = design.depth - design.materialThickness;
    const drawerHeight =
      (design.height - 2 * design.materialThickness) / design.drawerCount -
      design.drawerFrontGap;
    const drawerBoxWidth = drawerOutsideWidth;
    const drawerBoxDepth = drawerOutsideDepth;
    const boxCrossWidth = drawerBoxWidth - 2 * design.drawerBoxThickness;
    const bottomDepth = drawerBoxDepth - 2 * design.drawerBoxThickness;

    for (let index = 1; index <= design.drawerCount; index += 1) {
      parts.push(
        {
          length: drawerOutsideWidth,
          width: drawerHeight,
          qty: 1,
          label: `Drawer ${index} front`,
        },
        {
          length: drawerBoxDepth,
          width: drawerHeight,
          qty: 2,
          label: `Drawer ${index} left/right side`,
        },
        {
          length: boxCrossWidth,
          width: drawerHeight,
          qty: 2,
          label: `Drawer ${index} box front/back`,
        },
        {
          length: boxCrossWidth,
          width: bottomDepth,
          qty: 1,
          label: `Drawer ${index} bottom`,
        },
      );
    }
  }

  return parts;
}

export function countFurnitureParts(design: FurnitureDesign): number {
  return generateFurnitureParts(design).reduce((sum, part) => sum + part.qty, 0);
}

export function isFurnitureDesignValid(design: FurnitureDesign): boolean {
  try {
    validateFurnitureDesign(design);
    return true;
  } catch {
    return false;
  }
}

function validateFurnitureDesign(design: FurnitureDesign) {
  const numericFields: (keyof FurnitureDesign)[] = [
    'width',
    'height',
    'depth',
    'materialThickness',
    'shelfCount',
    'backThickness',
    'drawerCount',
    'drawerBoxThickness',
    'drawerBottomThickness',
    'drawerSideClearance',
    'drawerFrontGap',
  ];

  for (const field of numericFields) {
    if (!Number.isFinite(design[field] as number)) {
      throw new Error(`Furniture design field ${field} must be finite.`);
    }
  }

  if (design.width <= 0 || design.height <= 0 || design.depth <= 0) {
    throw new Error('Cabinet outside dimensions must be positive.');
  }
  if (
    design.materialThickness <= 0 ||
    design.drawerBoxThickness <= 0 ||
    design.drawerBottomThickness <= 0
  ) {
    throw new Error('Material and drawer box thicknesses must be positive.');
  }
  if (design.backThickness <= 0) {
    throw new Error('Back thickness must be positive.');
  }
  if (design.shelfCount < 0 || !Number.isInteger(design.shelfCount)) {
    throw new Error('Shelf count must be a non-negative integer.');
  }
  if (design.drawerCount < 0 || !Number.isInteger(design.drawerCount)) {
    throw new Error('Drawer count must be a non-negative integer.');
  }
  if (design.drawerSideClearance < 0 || design.drawerFrontGap < 0) {
    throw new Error('Drawer clearances and gaps cannot be negative.');
  }

  const interiorWidth = design.width - 2 * design.materialThickness;
  const interiorHeight = design.height - 2 * design.materialThickness;
  if (interiorWidth <= 0 || interiorHeight <= 0) {
    throw new Error('Cabinet interior dimensions must be positive.');
  }

  if (design.drawerCount > 0) {
    const drawerOutsideWidth = interiorWidth - design.drawerSideClearance;
    const drawerOutsideDepth = design.depth - design.materialThickness;
    const drawerHeight = interiorHeight / design.drawerCount - design.drawerFrontGap;
    const boxCrossWidth = drawerOutsideWidth - 2 * design.drawerBoxThickness;
    const bottomDepth = drawerOutsideDepth - 2 * design.drawerBoxThickness;

    if (
      drawerOutsideWidth <= 0 ||
      drawerOutsideDepth <= 0 ||
      drawerHeight <= 0 ||
      boxCrossWidth <= 0 ||
      bottomDepth <= 0
    ) {
      throw new Error('Drawer dimensions must be positive.');
    }
  }
}
