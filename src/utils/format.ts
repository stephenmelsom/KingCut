import type { Unit } from '../state/store';

/**
 * Format a number for display. Numbers are stored unit-agnostic — the user
 * picks how to interpret/display them. We just trim trailing zeros and cap
 * at a sensible precision per unit.
 */
export function fmt(n: number, unit: Unit): string {
  if (!isFinite(n)) return '–';
  const precision = unit === 'mm' ? 1 : 2;
  const rounded = Number(n.toFixed(precision));
  return String(rounded);
}

export function fmtArea(n: number, unit: Unit): string {
  const precision = unit === 'mm' ? 0 : 1;
  return Number(n.toFixed(precision)).toLocaleString();
}

export function fmtPct(num: number, denom: number): string {
  if (!denom) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}
