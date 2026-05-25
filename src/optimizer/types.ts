export type Panel = {
  id: string;
  length: number;
  width: number;
  qty: number;
  label?: string;
  /** True if this panel has grain that must align with the stock's grain. */
  grain?: boolean;
};

export type StockSheet = {
  id: string;
  length: number;
  width: number;
  qty: number;
  label?: string;
  /** True if this stock sheet has grain (running along its length axis). */
  grain?: boolean;
};

export type OptimizationPriority =
  | 'waste'
  | 'sheets'
  | 'cuts'
  | 'cut-length';

export type Options = {
  kerf: number;
  allowRotation: boolean;
  singleSheet: boolean;
  showLabels: boolean;
  priority: OptimizationPriority;
  /** When true, try extra deterministic shuffled panel orders within each
   * heuristic bucket. Slower, but can reduce waste on harder inputs. */
  thorough: boolean;
  /** When true, grained panels keep their length aligned to the stock's
   * length axis and may only be placed on grained stock. */
  respectGrain: boolean;
};

export type Placement = {
  panelId: string;
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  grain?: boolean;
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
