export type Panel = {
  id: string;
  length: number;
  width: number;
  qty: number;
  label?: string;
};

export type StockSheet = {
  id: string;
  length: number;
  width: number;
  qty: number;
  label?: string;
};

export type Options = {
  kerf: number;
  allowRotation: boolean;
  singleSheet: boolean;
  showLabels: boolean;
};

export type Placement = {
  panelId: string;
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
};

export type Cut = {
  sheetIndex: number;
  axis: 'x' | 'y';
  pos: number;
  from: { x: number; y: number; w: number; h: number };
  length: number;
};

export type SheetLayout = {
  sheetId: string;
  sheetLabel?: string;
  sheetIndex: number;
  sheetW: number;
  sheetH: number;
  placements: Placement[];
  cuts: Cut[];
  usedArea: number;
  wastedArea: number;
  cutLength: number;
};

export type Result = {
  sheets: SheetLayout[];
  unplaced: { panelId: string; label?: string; w: number; h: number }[];
  totals: {
    usedArea: number;
    wastedArea: number;
    totalArea: number;
    cuts: number;
    cutLength: number;
    sheetsUsed: number;
  };
};
