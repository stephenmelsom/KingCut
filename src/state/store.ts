import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  generateFurnitureParts,
  normalizeFurnitureDesign,
} from '../furniture/generate';
import type { FurnitureDesign } from '../furniture/types';
import { deriveCuts, optimize } from '../optimizer/optimize';
import type {
  Options,
  Panel,
  Result,
  StockSheet,
} from '../optimizer/types';
import {
  deleteLegacyState,
  loadActiveProjectId,
  loadProjects,
  loadState,
  saveActiveProjectId,
  saveProjects,
  scheduleSave,
  type ProjectMeta,
  type StoredProject,
} from './persistence';
import { decodeShareHash, type InputSnapshot } from './sharing';

export type Unit = 'in' | 'mm';

type State = {
  activeProjectId: string;
  projectName: string;
  projects: ProjectMeta[];
  panels: Panel[];
  stock: StockSheet[];
  options: Options;
  unit: Unit;
  furnitureDesign: FurnitureDesign;
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
  updateFurnitureDesign: (patch: Partial<FurnitureDesign>) => void;
  appendFurnitureParts: () => void;
  importInputs: (snapshot: Partial<InputSnapshot>) => void;
  newProject: (name: string) => void;
  switchProject: (id: string) => void;
  renameProject: (name: string) => void;
  deleteProject: (id: string) => void;
  movePlacement: (
    sheetIndex: number,
    placementIndex: number,
    x: number,
    y: number,
  ) => void;
  calculate: () => void;
  clearAll: () => void;
  loadSeed: () => void;
};

const defaultOptions: Options = {
  kerf: 0.13,
  allowRotation: true,
  singleSheet: false,
  showLabels: true,
  priority: 'waste',
  thorough: false,
  respectGrain: false,
};

function blankPanel(): Panel {
  return {
    id: nanoid(8),
    length: 0,
    width: 0,
    qty: 1,
    label: '',
    grain: false,
  };
}
function blankSheet(): StockSheet {
  return {
    id: nanoid(8),
    length: 96,
    width: 48,
    qty: 1,
    label: '',
    grain: false,
  };
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

function blankState(): Pick<
  State,
  'panels' | 'stock' | 'options' | 'unit' | 'furnitureDesign' | 'result'
> {
  return {
    panels: [blankPanel()],
    stock: [blankSheet()],
    options: defaultOptions,
    unit: 'in',
    furnitureDesign: normalizeFurnitureDesign(),
    result: null,
  };
}

function normalizeState(
  state: Pick<State, 'panels' | 'stock' | 'options' | 'unit' | 'result'> &
    Partial<Pick<State, 'furnitureDesign'>>,
): Pick<
  State,
  'panels' | 'stock' | 'options' | 'unit' | 'furnitureDesign' | 'result'
> {
  return {
    ...state,
    options: { ...defaultOptions, ...state.options },
    furnitureDesign: normalizeFurnitureDesign(state.furnitureDesign),
    result: state.result ?? null,
  };
}

const initial: State = (() => {
  const shareSnapshot =
    typeof window === 'undefined' ? null : decodeShareHash(window.location.hash);
  const storedProjects = loadProjects();
  const legacy = loadState();

  let projects: StoredProject[] = storedProjects;
  if (projects.length === 0 && legacy) {
    projects = [
      {
        id: nanoid(8),
        name: 'Untitled project',
        updatedAt: Date.now(),
        state: normalizeState(legacy),
      },
    ];
    saveProjects(projects);
    saveActiveProjectId(projects[0].id);
    deleteLegacyState();
  }

  if (projects.length === 0) {
    const seed = referenceSeed();
    projects = [
      {
        id: nanoid(8),
        name: 'Untitled project',
        updatedAt: Date.now(),
        state: {
          panels: seed.panels,
          stock: seed.stock,
          options: defaultOptions,
          unit: 'in',
          furnitureDesign: normalizeFurnitureDesign(),
          result: null,
        },
      },
    ];
    saveProjects(projects);
    saveActiveProjectId(projects[0].id);
  }

  const activeId = loadActiveProjectId();
  const activeProject =
    projects.find((project) => project.id === activeId) ?? projects[0];
  const activeState = shareSnapshot
    ? normalizeState({ ...shareSnapshot, result: null })
    : normalizeState(activeProject.state);

  if (shareSnapshot) {
    const importedProject: StoredProject = {
      id: nanoid(8),
      name: 'Shared project',
      updatedAt: Date.now(),
      state: activeState,
    };
    projects = [importedProject, ...projects];
    saveProjects(projects);
    saveActiveProjectId(importedProject.id);
    return {
      activeProjectId: importedProject.id,
      projectName: importedProject.name,
      projects: projects.map(projectMeta),
      ...activeState,
    };
  }

  return {
    activeProjectId: activeProject.id,
    projectName: activeProject.name,
    projects: projects.map(projectMeta),
    ...activeState,
  };
})();

function projectMeta(project: StoredProject): ProjectMeta {
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
  };
}

export const useStore = create<State & Actions>((set, get) => {
  const currentPersistedState = () => {
    const s = get();
    return {
      panels: s.panels,
      stock: s.stock,
      options: s.options,
      unit: s.unit,
      furnitureDesign: s.furnitureDesign,
      result: s.result,
    };
  };

  const saveProjectNow = () => {
    const s = get();
    const now = Date.now();
    const project: StoredProject = {
      id: s.activeProjectId,
      name: s.projectName,
      updatedAt: now,
      state: currentPersistedState(),
    };
    const projects = loadProjects();
    const next = [project, ...projects.filter((p) => p.id !== project.id)]
      .sort((a, b) => b.updatedAt - a.updatedAt);
    saveProjects(next);
    saveActiveProjectId(project.id);
    set({ projects: next.map(projectMeta) });
  };

  const persistSoon = () => {
    scheduleSave(currentPersistedState());
    saveProjectNow();
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

    updateFurnitureDesign: (patch) => {
      set((s) => ({
        furnitureDesign: normalizeFurnitureDesign({
          ...s.furnitureDesign,
          ...patch,
        }),
      }));
      persistSoon();
    },

    appendFurnitureParts: () => {
      const parts = generateFurnitureParts(get().furnitureDesign);
      set((s) => ({
        panels: [
          ...s.panels,
          ...parts.map((part) => ({
            id: nanoid(8),
            length: part.length,
            width: part.width,
            qty: part.qty,
            label: part.label,
            grain: false,
          })),
        ],
      }));
      persistSoon();
    },

    importInputs: (snapshot) => {
      set((s) => ({
        panels: snapshot.panels ?? s.panels,
        stock: snapshot.stock ?? s.stock,
        options: snapshot.options
          ? { ...defaultOptions, ...snapshot.options }
          : s.options,
        unit: snapshot.unit ?? s.unit,
        furnitureDesign: normalizeFurnitureDesign(
          snapshot.furnitureDesign ?? s.furnitureDesign,
        ),
        result: null,
      }));
      persistSoon();
    },

    newProject: (name) => {
      const state = blankState();
      set({
        activeProjectId: nanoid(8),
        projectName: name.trim() || 'Untitled project',
        ...state,
      });
      persistSoon();
    },

    switchProject: (id) => {
      const project = loadProjects().find((p) => p.id === id);
      if (!project) return;
      const state = normalizeState(project.state);
      set({
        activeProjectId: project.id,
        projectName: project.name,
        ...state,
      });
      saveActiveProjectId(project.id);
    },

    renameProject: (name) => {
      set({ projectName: name.trim() || 'Untitled project' });
      persistSoon();
    },

    deleteProject: (id) => {
      const current = get();
      let projects = loadProjects().filter((p) => p.id !== id);
      if (projects.length === 0) {
        projects = [
          {
            id: nanoid(8),
            name: 'Untitled project',
            updatedAt: Date.now(),
            state: blankState(),
          },
        ];
      }
      saveProjects(projects);
      const nextProject =
        id === current.activeProjectId
          ? projects[0]
          : projects.find((p) => p.id === current.activeProjectId) ?? projects[0];
      saveActiveProjectId(nextProject.id);
      set({
        activeProjectId: nextProject.id,
        projectName: nextProject.name,
        projects: projects.map(projectMeta),
        ...normalizeState(nextProject.state),
      });
    },

    movePlacement: (sheetIndex, placementIndex, x, y) => {
      set((s) => {
        if (!s.result) return s;
        const sheets = s.result.sheets.map((sheet) => {
          if (sheet.sheetIndex !== sheetIndex) return sheet;
          const placements = sheet.placements.map((placement, index) =>
            index === placementIndex
              ? {
                  ...placement,
                  x: Math.max(0, Math.min(x, sheet.sheetW - placement.w)),
                  y: Math.max(0, Math.min(y, sheet.sheetH - placement.h)),
                }
              : placement,
          );
          const cuts = deriveCuts(placements, sheet.sheetW, sheet.sheetH, sheet.sheetIndex);
          const cutLength = cuts.reduce((sum, cut) => sum + cut.length, 0);
          const usedArea = placements.reduce(
            (sum, placement) => sum + placement.w * placement.h,
            0,
          );
          return {
            ...sheet,
            placements,
            cuts,
            usedArea,
            wastedArea: sheet.sheetW * sheet.sheetH - usedArea,
            cutLength,
          };
        });
        const result: Result = {
          ...s.result,
          sheets,
          totals: {
            usedArea: sheets.reduce((sum, sheet) => sum + sheet.usedArea, 0),
            wastedArea: sheets.reduce((sum, sheet) => sum + sheet.wastedArea, 0),
            totalArea: sheets.reduce(
              (sum, sheet) => sum + sheet.sheetW * sheet.sheetH,
              0,
            ),
            cuts: sheets.reduce((sum, sheet) => sum + sheet.cuts.length, 0),
            cutLength: sheets.reduce((sum, sheet) => sum + sheet.cutLength, 0),
            sheetsUsed: sheets.length,
          },
        };
        return { result };
      });
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
