export type FurnitureDesign = {
  width: number;
  height: number;
  depth: number;
  materialThickness: number;
  shelfCount: number;
  includeBack: boolean;
  backThickness: number;
  drawerCount: number;
  drawerBoxThickness: number;
  drawerBottomThickness: number;
  drawerSideClearance: number;
  drawerFrontGap: number;
};

export type FurniturePartDraft = {
  length: number;
  width: number;
  qty: number;
  label: string;
};
