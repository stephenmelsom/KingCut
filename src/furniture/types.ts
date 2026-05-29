export type FurnitureDesign = {
  width: number;
  height: number;
  depth: number;
  materialThickness: number;
  includeBack: boolean;
  backThickness: number;
  rows: FurnitureRow[];
  columns: FurnitureColumn[];
  cells: FurnitureCell[][];
  drawerBoxThickness: number;
  drawerBottomThickness: number;
  drawerSideClearance: number;
  drawerFrontGap: number;
};

export type FurnitureRow = {
  id: string;
  height: number;
};

export type FurnitureColumn = {
  id: string;
  width: number;
};

export type FurnitureCell = {
  kind: 'shelf' | 'drawer';
  door: 'none' | 'single' | 'pair';
};

export type FurniturePartDraft = {
  length: number;
  width: number;
  qty: number;
  label: string;
};
