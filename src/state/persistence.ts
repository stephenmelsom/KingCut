import type {
  Options,
  Panel,
  Result,
  StockSheet,
} from '../optimizer/types';
import type { Unit } from './store';

const KEY = 'kingcut/state/v1';

type Persisted = {
  panels: Panel[];
  stock: StockSheet[];
  options: Options;
  unit: Unit;
  result: Result | null;
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
