import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { optimize } from '../optimizer/optimize';
import type {
  Options,
  Panel,
  Result,
  StockSheet,
} from '../optimizer/types';
import { loadState, scheduleSave } from './persistence';

export type Unit = 'in' | 'mm';

type State = {
  panels: Panel[];
  stock: StockSheet[];
  options: Options;
  unit: Unit;
  result: Result | null;
};

type Actions = {
  addPanel: () => void;
  updatePanel: (id: string, patch: Partial<Panel>) => void;
  removePanel: (id: string) => void;
  addSheet: () => void;
  updateSheet: (id: string, patch: Partial<StockSheet>) => void;
  removeSheet: (id: string) => void;
  setOptions: (patch: Partial<Options>) => void;
  setUnit: (unit: Unit) => void;
  calculate: () => void;
  clearAll: () => void;
  loadSeed: () => void;
};

const defaultOptions: Options = {
  kerf: 0.13,
  allowRotation: true,
  singleSheet: false,
  showLabels: true,
};

function blankPanel(): Panel {
  return { id: nanoid(8), length: 0, width: 0, qty: 1, label: '' };
}
function blankSheet(): StockSheet {
  return { id: nanoid(8), length: 0, width: 0, qty: 1, label: '' };
}

function referenceSeed(): Pick<State, 'panels' | 'stock'> {
  return {
    panels: [
      { id: nanoid(8), length: 17, width: 19, qty: 1, label: 'Top' },
      { id: nanoid(8), length: 15.5, width: 19, qty: 4, label: 'Shelf' },
      { id: nanoid(8), length: 52, width: 19, qty: 2, label: 'Side' },
    ],
    stock: [{ id: nanoid(8), length: 96, width: 48, qty: 1, label: '' }],
  };
}

const initial: State = (() => {
  const persisted = loadState();
  if (persisted) return persisted;
  const seed = referenceSeed();
  return {
    panels: seed.panels,
    stock: seed.stock,
    options: defaultOptions,
    unit: 'in',
    result: null,
  };
})();

export const useStore = create<State & Actions>((set, get) => {
  const persistSoon = () => {
    const s = get();
    scheduleSave({
      panels: s.panels,
      stock: s.stock,
      options: s.options,
      unit: s.unit,
      result: s.result,
    });
  };

  return {
    ...initial,

    addPanel: () => {
      set((s) => ({ panels: [...s.panels, blankPanel()] }));
      persistSoon();
    },
    updatePanel: (id, patch) => {
      set((s) => ({
        panels: s.panels.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      persistSoon();
    },
    removePanel: (id) => {
      set((s) => ({ panels: s.panels.filter((p) => p.id !== id) }));
      persistSoon();
    },

    addSheet: () => {
      set((s) => ({ stock: [...s.stock, blankSheet()] }));
      persistSoon();
    },
    updateSheet: (id, patch) => {
      set((s) => ({
        stock: s.stock.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      persistSoon();
    },
    removeSheet: (id) => {
      set((s) => ({ stock: s.stock.filter((p) => p.id !== id) }));
      persistSoon();
    },

    setOptions: (patch) => {
      set((s) => ({ options: { ...s.options, ...patch } }));
      persistSoon();
    },
    setUnit: (unit) => {
      set({ unit });
      persistSoon();
    },

    calculate: () => {
      const { panels, stock, options } = get();
      const result = optimize(panels, stock, options);
      set({ result });
      persistSoon();
    },

    clearAll: () => {
      set({
        panels: [blankPanel()],
        stock: [blankSheet()],
        result: null,
      });
      persistSoon();
    },

    loadSeed: () => {
      const seed = referenceSeed();
      set({ panels: seed.panels, stock: seed.stock, result: null });
      persistSoon();
    },
  };
});
