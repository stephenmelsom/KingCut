import type {
  FurnitureCell,
  FurnitureColumn,
  FurnitureDesign,
  FurniturePartDraft,
  FurnitureRow,
} from './types';

type LegacyFurnitureDesign = Partial<FurnitureDesign> & {
  shelfCount?: number;
  drawerCount?: number;
};

const EPSILON = 0.001;

export const defaultFurnitureDesign: FurnitureDesign = {
  width: 30,
  height: 34.5,
  depth: 23.25,
  materialThickness: 0.75,
  includeBack: true,
  backThickness: 0.25,
  includeToeKick: false,
  toeKickHeight: 4,
  toeKickDepth: 3,
  rows: [
    { id: 'row-1', height: 15.75 },
    { id: 'row-2', height: 15.75 },
  ],
  columns: [{ id: 'col-1', width: 28.5 }],
  cells: [
    [{ kind: 'shelf', door: 'none' }],
    [{ kind: 'shelf', door: 'none' }],
  ],
  drawerBoxThickness: 0.5,
  drawerBottomThickness: 0.25,
  drawerSideClearance: 1,
  drawerFrontGap: 0.125,
};

export function normalizeFurnitureDesign(
  design?: LegacyFurnitureDesign | null,
): FurnitureDesign {
  const merged = { ...defaultFurnitureDesign, ...design };
  const t = finitePositive(
    merged.materialThickness,
    defaultFurnitureDesign.materialThickness,
  );
  const interiorWidth = Math.max(
    1,
    finitePositive(merged.width, defaultFurnitureDesign.width) - 2 * t,
  );
  const toeKickReserve = merged.includeToeKick
    ? Math.max(
        0,
        Number.isFinite(merged.toeKickHeight)
          ? (merged.toeKickHeight as number)
          : defaultFurnitureDesign.toeKickHeight,
      )
    : 0;
  const interiorHeight = Math.max(
    1,
    finitePositive(merged.height, defaultFurnitureDesign.height) - 2 * t - toeKickReserve,
  );

  const rows = Array.isArray(design?.rows)
    ? normalizeRows(design.rows, interiorHeight, t)
    : legacyRows(design, interiorHeight, t);
  const columns = Array.isArray(design?.columns)
    ? normalizeColumns(design.columns, interiorWidth)
    : [{ id: 'col-1', width: interiorWidth }];

  return {
    width: merged.width,
    height: merged.height,
    depth: merged.depth,
    materialThickness: merged.materialThickness,
    includeBack: merged.includeBack,
    backThickness: merged.backThickness,
    includeToeKick: merged.includeToeKick,
    toeKickHeight: merged.toeKickHeight,
    toeKickDepth: merged.toeKickDepth,
    rows,
    columns,
    cells: normalizeCells(design, rows.length, columns.length),
    drawerBoxThickness: merged.drawerBoxThickness,
    drawerBottomThickness: merged.drawerBottomThickness,
    drawerSideClearance: merged.drawerSideClearance,
    drawerFrontGap: merged.drawerFrontGap,
  };
}

export function generateFurnitureParts(
  design: FurnitureDesign,
): FurniturePartDraft[] {
  validateFurnitureDesign(design);

  const interiorWidth = getInteriorWidth(design);
  const interiorHeight = getInteriorHeight(design);
  const parts: FurniturePartDraft[] = [
    {
      length: design.height,
      width: design.depth,
      qty: 2,
      label: 'Cabinet side',
      thickness: design.materialThickness,
    },
    {
      length: interiorWidth,
      width: design.depth,
      qty: 2,
      label: 'Cabinet top/bottom',
      thickness: design.materialThickness,
    },
  ];

  if (design.includeBack) {
    parts.push({
      length: design.width,
      width: design.height,
      qty: 1,
      label: 'Cabinet back',
      thickness: design.backThickness,
    });
  }

  if (design.includeToeKick) {
    parts.push({
      length: interiorWidth,
      width: design.toeKickHeight,
      qty: 1,
      label: 'Toe kick board',
      thickness: design.materialThickness,
    });
  }

  for (let columnIndex = 1; columnIndex < design.columns.length; columnIndex += 1) {
    parts.push({
      length: interiorHeight,
      width: design.depth,
      qty: 1,
      label: `Vertical divider ${columnIndex}`,
      thickness: design.materialThickness,
    });
  }

  for (const [columnIndex, column] of design.columns.entries()) {
    for (let rowIndex = 1; rowIndex < design.rows.length; rowIndex += 1) {
      parts.push({
        length: column.width,
        width: design.depth,
        qty: 1,
        label: `Column ${columnIndex + 1} horizontal divider ${rowIndex}`,
        thickness: design.materialThickness,
      });
    }
  }

  forEachCell(design, (cell, row, column, rowIndex, columnIndex) => {
    const cellLabel = `R${rowIndex + 1}C${columnIndex + 1}`;
    if (cell.kind === 'drawer') {
      parts.push(...drawerParts(design, row, column, cellLabel));
    } else if (cell.door === 'single') {
      parts.push({
        length: Math.max(column.width - design.drawerFrontGap, EPSILON),
        width: Math.max(row.height - design.drawerFrontGap, EPSILON),
        qty: 1,
        label: `${cellLabel} door`,
        thickness: design.materialThickness,
      });
    } else if (cell.door === 'pair') {
      parts.push({
        length: Math.max((column.width - design.drawerFrontGap) / 2, EPSILON),
        width: Math.max(row.height - design.drawerFrontGap, EPSILON),
        qty: 2,
        label: `${cellLabel} door pair`,
        thickness: design.materialThickness,
      });
    }
  });

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

export function getFurnitureDesignValidationError(
  design: FurnitureDesign,
): string | null {
  try {
    validateFurnitureDesign(design);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid furniture design.';
  }
}

export function getInteriorWidth(design: FurnitureDesign) {
  return design.width - 2 * design.materialThickness;
}

export function getInteriorHeight(design: FurnitureDesign) {
  const toeKick = design.includeToeKick ? Math.max(0, design.toeKickHeight) : 0;
  return design.height - 2 * design.materialThickness - toeKick;
}

export function getGridClearWidth(design: FurnitureDesign) {
  return (
    design.columns.reduce((sum, column) => sum + column.width, 0) +
    Math.max(0, design.columns.length - 1) * design.materialThickness
  );
}

export function getGridClearHeight(design: FurnitureDesign) {
  return (
    design.rows.reduce((sum, row) => sum + row.height, 0) +
    Math.max(0, design.rows.length - 1) * design.materialThickness
  );
}

function validateFurnitureDesign(design: FurnitureDesign) {
  const numericFields: (keyof FurnitureDesign)[] = [
    'width',
    'height',
    'depth',
    'materialThickness',
    'backThickness',
    'drawerBoxThickness',
    'drawerBottomThickness',
    'drawerSideClearance',
    'drawerFrontGap',
    'toeKickHeight',
    'toeKickDepth',
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
  if (design.drawerSideClearance < 0 || design.drawerFrontGap < 0) {
    throw new Error('Drawer clearances and gaps cannot be negative.');
  }
  if (design.toeKickHeight < 0 || design.toeKickDepth < 0) {
    throw new Error('Toe kick dimensions cannot be negative.');
  }
  if (design.includeToeKick && design.toeKickDepth >= design.depth) {
    throw new Error('Toe kick setback must be less than the cabinet depth.');
  }

  const interiorWidth = getInteriorWidth(design);
  const interiorHeight = getInteriorHeight(design);
  if (interiorWidth <= 0 || interiorHeight <= 0) {
    throw new Error('Cabinet interior dimensions must be positive.');
  }
  if (design.rows.length === 0 || design.columns.length === 0) {
    throw new Error('Grid must include at least one row and one column.');
  }
  if (design.cells.length !== design.rows.length) {
    throw new Error('Cell grid must match row count.');
  }
  for (const [index, row] of design.rows.entries()) {
    if (!Number.isFinite(row.height) || row.height <= 0) {
      throw new Error(`Row ${index + 1} height must be positive.`);
    }
  }
  for (const [index, column] of design.columns.entries()) {
    if (!Number.isFinite(column.width) || column.width <= 0) {
      throw new Error(`Column ${index + 1} width must be positive.`);
    }
  }
  for (const [rowIndex, row] of design.cells.entries()) {
    if (row.length !== design.columns.length) {
      throw new Error('Cell grid must match column count.');
    }
    for (const [columnIndex, cell] of row.entries()) {
      if (cell.kind !== 'shelf' && cell.kind !== 'drawer') {
        throw new Error(`Cell R${rowIndex + 1}C${columnIndex + 1} has an invalid type.`);
      }
      if (!['none', 'single', 'pair'].includes(cell.door)) {
        throw new Error(`Cell R${rowIndex + 1}C${columnIndex + 1} has an invalid door.`);
      }
      if (cell.kind === 'drawer' && cell.door !== 'none') {
        throw new Error('Doors are only available on shelf cells.');
      }
    }
  }

  if (!nearlyEqual(getGridClearWidth(design), interiorWidth)) {
    throw new Error('Column widths plus dividers must equal the cabinet interior width.');
  }
  if (!nearlyEqual(getGridClearHeight(design), interiorHeight)) {
    throw new Error('Row heights plus dividers must equal the cabinet interior height.');
  }

  forEachCell(design, (cell, row, column, rowIndex, columnIndex) => {
    if (cell.kind !== 'drawer') return;
    const drawerOutsideWidth = column.width - design.drawerSideClearance;
    const drawerOutsideDepth = design.depth - design.materialThickness;
    const drawerHeight = row.height - design.drawerFrontGap;
    const boxCrossWidth = drawerOutsideWidth - 2 * design.drawerBoxThickness;
    const bottomDepth = drawerOutsideDepth - 2 * design.drawerBoxThickness;
    if (
      drawerOutsideWidth <= 0 ||
      drawerOutsideDepth <= 0 ||
      drawerHeight <= 0 ||
      boxCrossWidth <= 0 ||
      bottomDepth <= 0
    ) {
      throw new Error(`Drawer R${rowIndex + 1}C${columnIndex + 1} dimensions must be positive.`);
    }
  });
}

function drawerParts(
  design: FurnitureDesign,
  row: FurnitureRow,
  column: FurnitureColumn,
  label: string,
): FurniturePartDraft[] {
  const drawerOutsideWidth = column.width - design.drawerSideClearance;
  const drawerOutsideDepth = design.depth - design.materialThickness;
  const drawerHeight = row.height - design.drawerFrontGap;
  const boxCrossWidth = drawerOutsideWidth - 2 * design.drawerBoxThickness;
  const bottomDepth = drawerOutsideDepth - 2 * design.drawerBoxThickness;

  return [
    {
      length: Math.max(column.width - design.drawerFrontGap, EPSILON),
      width: drawerHeight,
      qty: 1,
      label: `${label} drawer front`,
      thickness: design.materialThickness,
    },
    {
      length: drawerOutsideDepth,
      width: drawerHeight,
      qty: 2,
      label: `${label} drawer left/right side`,
      thickness: design.drawerBoxThickness,
    },
    {
      length: boxCrossWidth,
      width: drawerHeight,
      qty: 2,
      label: `${label} drawer box front/back`,
      thickness: design.drawerBoxThickness,
    },
    {
      length: boxCrossWidth,
      width: bottomDepth,
      qty: 1,
      label: `${label} drawer bottom`,
      thickness: design.drawerBottomThickness,
    },
  ];
}

function normalizeRows(rows: FurnitureRow[], interiorHeight: number, t: number) {
  const normalized = rows
    .map((row, index) => ({
      id: row.id || `row-${index + 1}`,
      height: Number(row.height),
    }))
    .filter((row) => Number.isFinite(row.height) && row.height > 0);

  return normalized.length > 0 ? normalized : legacyRows(null, interiorHeight, t);
}

function normalizeColumns(columns: FurnitureColumn[], interiorWidth: number) {
  const normalized = columns
    .map((column, index) => ({
      id: column.id || `col-${index + 1}`,
      width: Number(column.width),
    }))
    .filter((column) => Number.isFinite(column.width) && column.width > 0);

  return normalized.length > 0 ? normalized : [{ id: 'col-1', width: interiorWidth }];
}

function normalizeCells(
  design: LegacyFurnitureDesign | null | undefined,
  rowCount: number,
  columnCount: number,
): FurnitureCell[][] {
  if (Array.isArray(design?.cells)) {
    return Array.from({ length: rowCount }, (_, rowIndex) =>
      Array.from({ length: columnCount }, (_, columnIndex) => {
        const cell = design.cells?.[rowIndex]?.[columnIndex];
        return normalizeCell(cell);
      }),
    );
  }

  const legacyDrawerCount = Math.max(0, Math.floor(design?.drawerCount ?? 0));
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, () =>
      rowIndex < legacyDrawerCount
        ? { kind: 'drawer', door: 'none' }
        : { kind: 'shelf', door: 'none' },
    ),
  );
}

function normalizeCell(cell?: Partial<FurnitureCell>): FurnitureCell {
  const kind = cell?.kind === 'drawer' ? 'drawer' : 'shelf';
  const door =
    kind === 'drawer'
      ? 'none'
      : cell?.door === 'single' || cell?.door === 'pair'
        ? cell.door
        : 'none';
  return { kind, door };
}

function legacyRows(
  design: LegacyFurnitureDesign | null | undefined,
  interiorHeight: number,
  t: number,
): FurnitureRow[] {
  const drawerCount = Math.max(0, Math.floor(design?.drawerCount ?? 0));
  const shelfCount = Math.max(0, Math.floor(design?.shelfCount ?? 1));
  const rowCount = Math.max(1, drawerCount + (shelfCount > 0 ? shelfCount + 1 : 0));
  const clearHeight = (interiorHeight - (rowCount - 1) * t) / rowCount;

  return Array.from({ length: rowCount }, (_, index) => ({
    id: `row-${index + 1}`,
    height: clearHeight,
  }));
}

function finitePositive(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) <= EPSILON;
}

function forEachCell(
  design: FurnitureDesign,
  callback: (
    cell: FurnitureCell,
    row: FurnitureRow,
    column: FurnitureColumn,
    rowIndex: number,
    columnIndex: number,
  ) => void,
) {
  design.rows.forEach((row, rowIndex) => {
    design.columns.forEach((column, columnIndex) => {
      callback(design.cells[rowIndex][columnIndex], row, column, rowIndex, columnIndex);
    });
  });
}
