import { useMemo, useState } from 'react';
import {
  countFurnitureParts,
  getFurnitureDesignValidationError,
  getGridClearHeight,
  getGridClearWidth,
  getInteriorHeight,
  getInteriorWidth,
} from '../furniture/generate';
import type {
  FurnitureCell,
  FurnitureColumn,
  FurnitureDesign,
  FurnitureRow,
} from '../furniture/types';
import { useStore } from '../state/store';
import { EditableNumber } from './EditableNumber';
import { FurniturePreview } from './FurniturePreview';

type NumberField = {
  key: keyof FurnitureDesign;
  label: string;
  step: number;
  min: number;
};

const DIMENSION_FIELDS: NumberField[] = [
  { key: 'width', label: 'Width', step: 0.125, min: 0 },
  { key: 'height', label: 'Height', step: 0.125, min: 0 },
  { key: 'depth', label: 'Depth', step: 0.125, min: 0 },
  { key: 'materialThickness', label: 'Material thickness', step: 0.0625, min: 0 },
];

const DRAWER_FIELDS: NumberField[] = [
  { key: 'drawerBoxThickness', label: 'Box thickness', step: 0.0625, min: 0 },
  { key: 'drawerBottomThickness', label: 'Bottom thickness', step: 0.0625, min: 0 },
  { key: 'drawerSideClearance', label: 'Side clearance', step: 0.0625, min: 0 },
  { key: 'drawerFrontGap', label: 'Front gap', step: 0.0625, min: 0 },
];

export function FurniturePage() {
  const [notice, setNotice] = useState('');
  const design = useStore((s) => s.furnitureDesign);
  const updateFurnitureDesign = useStore((s) => s.updateFurnitureDesign);
  const replacePanelsWithFurnitureParts = useStore(
    (s) => s.replacePanelsWithFurnitureParts,
  );
  const validationError = getFurnitureDesignValidationError(design);
  const partCount = useMemo(() => {
    if (validationError) return 0;
    return countFurnitureParts(design);
  }, [design, validationError]);

  const updateNumber = (key: keyof FurnitureDesign, value: number) => {
    updateFurnitureDesign({ [key]: value });
  };

  const replaceRows = (rows: FurnitureRow[]) => {
    updateFurnitureDesign({ rows, cells: resizeCells(rows.length, design.columns.length, design.cells) });
  };

  const replaceColumns = (columns: FurnitureColumn[]) => {
    updateFurnitureDesign({ columns, cells: resizeCells(design.rows.length, columns.length, design.cells) });
  };

  const updateCell = (
    rowIndex: number,
    columnIndex: number,
    patch: Partial<FurnitureCell>,
  ) => {
    const cells = design.cells.map((row, currentRowIndex) =>
      row.map((cell, currentColumnIndex) => {
        if (currentRowIndex !== rowIndex || currentColumnIndex !== columnIndex) {
          return cell;
        }
        const kind = patch.kind ?? cell.kind;
        return {
          kind,
          door: kind === 'drawer' ? 'none' : patch.door ?? cell.door,
        };
      }),
    );
    updateFurnitureDesign({ cells });
  };

  const setToeKick = (includeToeKick: boolean) => {
    const rows = distributeRows({ ...design, includeToeKick }, design.rows.length);
    updateFurnitureDesign({ includeToeKick, rows });
  };

  const updateCutlist = () => {
    if (validationError) return;
    replacePanelsWithFurnitureParts();
    setNotice(`${partCount} furniture parts replaced the cutlist panels.`);
    window.setTimeout(() => setNotice(''), 2400);
  };

  return (
    <main className="furniture-page">
      <section className="furniture-controls">
        <div className="furniture-section">
          <div className="section-heading">
            <h2>Cabinet</h2>
            <span className="muted">
              Interior {formatNumber(getInteriorWidth(design))} x{' '}
              {formatNumber(getInteriorHeight(design))}
            </span>
          </div>
          <div className="furniture-grid">
            {DIMENSION_FIELDS.map((field) => (
              <FurnitureNumberField
                key={field.key}
                field={field}
                design={design}
                onChange={updateNumber}
              />
            ))}
          </div>
        </div>

        <div className="furniture-section">
          <div className="section-heading">
            <h2>Back</h2>
          </div>
          <div className="furniture-grid">
            <label className="option-row furniture-switch">
              <span>Include back</span>
              <input
                type="checkbox"
                role="switch"
                checked={design.includeBack}
                onChange={(event) =>
                  updateFurnitureDesign({ includeBack: event.target.checked })
                }
              />
            </label>
            <FurnitureNumberField
              field={{
                key: 'backThickness',
                label: 'Back thickness',
                step: 0.0625,
                min: 0,
              }}
              design={design}
              onChange={updateNumber}
            />
          </div>
        </div>

        <div className="furniture-section">
          <div className="section-heading">
            <h2>Toe kick</h2>
            <span className="muted">Recessed front, raises the deck</span>
          </div>
          <div className="furniture-grid">
            <label className="option-row furniture-switch">
              <span>Include toe kick</span>
              <input
                type="checkbox"
                role="switch"
                checked={design.includeToeKick}
                onChange={(event) => setToeKick(event.target.checked)}
              />
            </label>
            <FurnitureNumberField
              field={{ key: 'toeKickHeight', label: 'Height', step: 0.125, min: 0 }}
              design={design}
              onChange={updateNumber}
            />
            <FurnitureNumberField
              field={{ key: 'toeKickDepth', label: 'Setback', step: 0.125, min: 0 }}
              design={design}
              onChange={updateNumber}
            />
          </div>
        </div>

        <div className="furniture-section">
          <div className="section-heading">
            <h2>Columns</h2>
            <span className={columnFits(design) ? 'muted' : 'warn-text'}>
              {formatNumber(getGridClearWidth(design))} /{' '}
              {formatNumber(getInteriorWidth(design))}
            </span>
          </div>
          <div className="size-list">
            {design.columns.map((column, index) => (
              <label className="size-row" key={column.id}>
                <span>Column {index + 1}</span>
                <EditableNumber
                  value={column.width}
                  step={0.125}
                  min={0}
                  ariaLabel={`Column ${index + 1} width`}
                  onChange={(width) =>
                    replaceColumns(
                      design.columns.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, width } : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="button-row">
            <button className="btn-sm" onClick={() => replaceColumns(distributeColumns(design, design.columns.length + 1))}>
              Add column
            </button>
            <button
              className="btn-sm"
              disabled={design.columns.length <= 1}
              onClick={() => replaceColumns(distributeColumns(design, design.columns.length - 1))}
            >
              Remove column
            </button>
          </div>
        </div>

        <div className="furniture-section">
          <div className="section-heading">
            <h2>Rows</h2>
            <span className={rowFits(design) ? 'muted' : 'warn-text'}>
              {formatNumber(getGridClearHeight(design))} /{' '}
              {formatNumber(getInteriorHeight(design))}
            </span>
          </div>
          <div className="size-list">
            {design.rows.map((row, index) => (
              <label className="size-row" key={row.id}>
                <span>Row {index + 1}</span>
                <EditableNumber
                  value={row.height}
                  step={0.125}
                  min={0}
                  ariaLabel={`Row ${index + 1} height`}
                  onChange={(height) =>
                    replaceRows(
                      design.rows.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, height } : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="button-row">
            <button className="btn-sm" onClick={() => replaceRows(distributeRows(design, design.rows.length + 1))}>
              Add row
            </button>
            <button
              className="btn-sm"
              disabled={design.rows.length <= 1}
              onClick={() => replaceRows(distributeRows(design, design.rows.length - 1))}
            >
              Remove row
            </button>
          </div>
        </div>

        <div className="furniture-section">
          <div className="section-heading">
            <h2>Cells</h2>
          </div>
          <div className="cell-config-grid">
            {design.rows.map((row, rowIndex) =>
              design.columns.map((column, columnIndex) => {
                const cell = design.cells[rowIndex][columnIndex];
                return (
                  <div className="cell-config" key={`${row.id}-${column.id}`}>
                    <span>
                      R{rowIndex + 1} C{columnIndex + 1}
                    </span>
                    <select
                      className="option-select"
                      value={cell.kind}
                      aria-label={`Cell R${rowIndex + 1} C${columnIndex + 1} type`}
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, {
                          kind: event.target.value as FurnitureCell['kind'],
                        })
                      }
                    >
                      <option value="shelf">Shelf</option>
                      <option value="drawer">Drawer</option>
                    </select>
                    <select
                      className="option-select"
                      value={cell.door}
                      disabled={cell.kind === 'drawer'}
                      aria-label={`Cell R${rowIndex + 1} C${columnIndex + 1} door`}
                      onChange={(event) =>
                        updateCell(rowIndex, columnIndex, {
                          door: event.target.value as FurnitureCell['door'],
                        })
                      }
                    >
                      <option value="none">No door</option>
                      <option value="single">Single door</option>
                      <option value="pair">Pair doors</option>
                    </select>
                  </div>
                );
              }),
            )}
          </div>
        </div>

        <div className="furniture-section">
          <div className="section-heading">
            <h2>Drawers</h2>
          </div>
          <div className="furniture-grid">
            {DRAWER_FIELDS.map((field) => (
              <FurnitureNumberField
                key={field.key}
                field={field}
                design={design}
                onChange={updateNumber}
              />
            ))}
          </div>
        </div>

        <div className="furniture-update">
          <span className={validationError ? 'warn-text' : 'muted'}>
            {validationError ?? `${partCount} generated parts`}
          </span>
          <button
            className="btn-primary"
            disabled={!!validationError}
            onClick={updateCutlist}
          >
            Update cutlist
          </button>
          {notice && <span className="success-text">{notice}</span>}
        </div>
      </section>
      <section className="furniture-preview-pane" aria-label="Furniture preview">
        <FurniturePreview design={design} />
      </section>
    </main>
  );
}

function FurnitureNumberField({
  field,
  design,
  onChange,
}: {
  field: NumberField;
  design: FurnitureDesign;
  onChange: (key: keyof FurnitureDesign, value: number) => void;
}) {
  const value = design[field.key];
  if (typeof value !== 'number') return null;

  return (
    <label className="field-row">
      <span>{field.label}</span>
      <EditableNumber
        value={value}
        step={field.step}
        min={field.min}
        ariaLabel={field.label}
        onChange={(next) => onChange(field.key, next)}
      />
    </label>
  );
}

function resizeCells(
  rowCount: number,
  columnCount: number,
  current: FurnitureCell[][],
) {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) => ({
      ...(current[rowIndex]?.[columnIndex] ?? { kind: 'shelf', door: 'none' }),
    })),
  );
}

function distributeRows(design: FurnitureDesign, count: number) {
  const height =
    (getInteriorHeight(design) - Math.max(0, count - 1) * design.materialThickness) /
    count;
  return Array.from({ length: count }, (_, index) => ({
    id: design.rows[index]?.id ?? `row-${Date.now()}-${index}`,
    height,
  }));
}

function distributeColumns(design: FurnitureDesign, count: number) {
  const width =
    (getInteriorWidth(design) - Math.max(0, count - 1) * design.materialThickness) /
    count;
  return Array.from({ length: count }, (_, index) => ({
    id: design.columns[index]?.id ?? `col-${Date.now()}-${index}`,
    width,
  }));
}

function rowFits(design: FurnitureDesign) {
  return Math.abs(getGridClearHeight(design) - getInteriorHeight(design)) <= 0.001;
}

function columnFits(design: FurnitureDesign) {
  return Math.abs(getGridClearWidth(design) - getInteriorWidth(design)) <= 0.001;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, '') : '0';
}
