import { nanoid } from 'nanoid';
import type { Options, Panel, StockSheet } from '../optimizer/types';
import type { Unit } from './store';

export type InputSnapshot = {
  panels: Panel[];
  stock: StockSheet[];
  options: Options;
  unit: Unit;
};

const HASH_PREFIX = '#project=';
const CSV_COLUMNS = ['type', 'length', 'width', 'qty', 'label', 'grain'];

export function exportCsv(snapshot: Pick<InputSnapshot, 'panels' | 'stock'>) {
  const rows = [
    CSV_COLUMNS,
    ...snapshot.panels.map((panel) => rowFor('panel', panel)),
    ...snapshot.stock.map((sheet) => rowFor('stock', sheet)),
  ];
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function importCsv(csv: string): Pick<InputSnapshot, 'panels' | 'stock'> {
  const rows = parseCsv(csv).filter((row) =>
    row.some((cell) => cell.trim() !== ''),
  );
  if (rows.length === 0) throw new Error('CSV is empty.');

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const hasHeader =
    header.includes('type') &&
    header.includes('length') &&
    header.includes('width');
  const columns = hasHeader ? header : CSV_COLUMNS;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const index = (name: string) => columns.indexOf(name);
  const typeIndex = index('type');
  const lengthIndex = index('length');
  const widthIndex = index('width');
  const qtyIndex = index('qty');
  const labelIndex = index('label');
  const grainIndex = index('grain');

  if (typeIndex === -1 || lengthIndex === -1 || widthIndex === -1) {
    throw new Error('CSV must include type, length, and width columns.');
  }

  const panels: Panel[] = [];
  const stock: StockSheet[] = [];
  for (const row of dataRows) {
    const type = cell(row, typeIndex).trim().toLowerCase();
    const length = numberCell(row, lengthIndex);
    const width = numberCell(row, widthIndex);
    const qty = qtyIndex === -1 ? 1 : Math.max(0, Math.floor(numberCell(row, qtyIndex) || 1));
    const label = labelIndex === -1 ? '' : cell(row, labelIndex).trim();
    const grain = grainIndex !== -1 && booleanCell(row, grainIndex);

    if (type !== 'panel' && type !== 'stock') continue;
    if (!Number.isFinite(length) || !Number.isFinite(width)) continue;

    const base = {
      id: nanoid(8),
      length,
      width,
      qty,
      label,
      grain,
    };
    if (type === 'panel') panels.push(base);
    else stock.push(base);
  }

  if (panels.length === 0 && stock.length === 0) {
    throw new Error('CSV did not contain any panel or stock rows.');
  }
  return { panels, stock };
}

export function encodeShareHash(snapshot: InputSnapshot): string {
  const json = JSON.stringify({ v: 1, ...snapshot });
  return `${HASH_PREFIX}${base64UrlEncode(json)}`;
}

export function decodeShareHash(hash: string): InputSnapshot | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const decoded = JSON.parse(base64UrlDecode(hash.slice(HASH_PREFIX.length))) as {
      panels?: Panel[];
      stock?: StockSheet[];
      options?: Options;
      unit?: Unit;
    };
    if (!decoded.panels || !decoded.stock || !decoded.options || !decoded.unit) {
      return null;
    }
    return {
      panels: decoded.panels,
      stock: decoded.stock,
      options: decoded.options,
      unit: decoded.unit,
    };
  } catch {
    return null;
  }
}

function rowFor(type: 'panel' | 'stock', item: Panel | StockSheet): string[] {
  return [
    type,
    String(item.length),
    String(item.width),
    String(item.qty),
    item.label ?? '',
    item.grain ? 'true' : 'false',
  ];
}

function cell(row: string[], index: number) {
  return index === -1 ? '' : row[index] ?? '';
}

function numberCell(row: string[], index: number) {
  const value = Number(cell(row, index).trim());
  return Number.isFinite(value) ? value : 0;
}

function booleanCell(row: string[], index: number) {
  const value = cell(row, index).trim().toLowerCase();
  return value === 'true' || value === 'yes' || value === '1' || value === 'y';
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cellValue = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cellValue += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cellValue += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cellValue);
      cellValue = '';
    } else if (char === '\n') {
      row.push(cellValue);
      rows.push(row);
      row = [];
      cellValue = '';
    } else if (char !== '\r') {
      cellValue += char;
    }
  }

  row.push(cellValue);
  rows.push(row);
  return rows;
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
