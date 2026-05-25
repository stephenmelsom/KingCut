import type {
  Options,
  Panel,
  Result,
  StockSheet,
} from '../optimizer/types';
import type { FurnitureDesign } from '../furniture/types';
import type { Unit } from './store';

const KEY = 'kingcut/state/v1';
const PROJECTS_KEY = 'kingcut/projects/v1';
const ACTIVE_PROJECT_KEY = 'kingcut/projects/active/v1';

type Persisted = {
  panels: Panel[];
  stock: StockSheet[];
  options: Options;
  unit: Unit;
  furnitureDesign: FurnitureDesign;
  result: Result | null;
};

export type ProjectMeta = {
  id: string;
  name: string;
  updatedAt: number;
};

export type StoredProject = ProjectMeta & {
  state: Persisted;
};

export function loadState(): Persisted | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.panels || !parsed.stock || !parsed.options) return null;
    return parsed;
  } catch {
    return null;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSave(state: Persisted) {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // quota or serialization error — ignore for MVP
    }
  }, 500);
}

export function loadProjects(): StoredProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredProject[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (project) =>
        typeof project.id === 'string' &&
        typeof project.name === 'string' &&
        typeof project.updatedAt === 'number' &&
        !!project.state?.panels &&
        !!project.state?.stock &&
        !!project.state?.options,
    );
  } catch {
    return [];
  }
}

export function saveProjects(projects: StoredProject[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // quota or serialization error — ignore for MVP
  }
}

export function loadActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function saveActiveProjectId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {
    // storage unavailable — ignore for MVP
  }
}

export function deleteLegacyState() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // storage unavailable — ignore for MVP
  }
}
