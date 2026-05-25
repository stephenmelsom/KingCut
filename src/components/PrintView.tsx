import { useStore } from '../state/store';
import { fmt, fmtArea, fmtPct } from '../utils/format';
import type { Placement, SheetLayout } from '../optimizer/types';

const PRINT_MAX_W = 640;
const PRINT_MAX_H = 800;
const PAD = 32;

export function PrintView() {
  const result = useStore((s) => s.result);
  const showLabels = useStore((s) => s.options.showLabels);
  const kerf = useStore((s) => s.options.kerf);
  const unit = useStore((s) => s.unit);

  if (!result || result.sheets.length === 0) return null;

  const now = new Date();
  const stamp = now.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="print-view" aria-hidden="true">
      <header className="print-header">
        <div>
          <h1>KingCut — Cut Plan</h1>
          <p className="print-meta">{stamp}</p>
        </div>
        <dl className="print-summary">
          <dt>Sheets used</dt>
          <dd>{result.totals.sheetsUsed}</dd>
          <dt>Used area</dt>
          <dd>
            {fmtArea(result.totals.usedArea, unit)}{' '}
            ({fmtPct(result.totals.usedArea, result.totals.totalArea)})
          </dd>
          <dt>Wasted area</dt>
          <dd>
            {fmtArea(result.totals.wastedArea, unit)}{' '}
            ({fmtPct(result.totals.wastedArea, result.totals.totalArea)})
          </dd>
          <dt>Cuts</dt>
          <dd>{result.totals.cuts}</dd>
          <dt>Cut length</dt>
          <dd>{fmt(result.totals.cutLength, unit)}</dd>
          <dt>Kerf</dt>
          <dd>{fmt(kerf, unit)}</dd>
        </dl>
      </header>

      {result.sheets.map((sheet) => (
        <PrintSheet
          key={`print-${sheet.sheetIndex}-${sheet.sheetId}`}
          sheet={sheet}
          showLabels={showLabels}
          unit={unit}
        />
      ))}

      {result.unplaced.length > 0 && (
        <section className="print-sheet-page">
          <h2>Unplaced panels ({result.unplaced.length})</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Length</th>
                <th>Width</th>
              </tr>
            </thead>
            <tbody>
              {result.unplaced.map((u, i) => (
                <tr key={i}>
                  <td>{u.label ?? '—'}</td>
                  <td>{fmt(u.w, unit)}</td>
                  <td>{fmt(u.h, unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function PrintSheet({
  sheet,
  showLabels,
  unit,
}: {
  sheet: SheetLayout;
  showLabels: boolean;
  unit: 'in' | 'mm';
}) {
  const { sheetW, sheetH, placements } = sheet;
  const scale = Math.min(PRINT_MAX_W / sheetW, PRINT_MAX_H / sheetH);
  const w = sheetW * scale;
  const h = sheetH * scale;
  const totalW = w + PAD * 2;
  const totalH = h + PAD * 2;

  // Aggregate placements by label for the cut summary table.
  const byLabel = new Map<
    string,
    { label: string; w: number; h: number; count: number }
  >();
  for (const p of placements) {
    const key = `${p.label ?? '—'}|${p.w}x${p.h}`;
    const cur = byLabel.get(key);
    if (cur) cur.count++;
    else
      byLabel.set(key, {
        label: p.label ?? '—',
        w: p.w,
        h: p.h,
        count: 1,
      });
  }

  return (
    <section className="print-sheet-page">
      <header className="print-sheet-header">
        <h2>
          Sheet {sheet.sheetIndex + 1}
          <span className="muted">
            {' '}— {fmt(sheetW, unit)} × {fmt(sheetH, unit)} {unit}
          </span>
        </h2>
        <p className="print-meta">
          {placements.length} panels · used{' '}
          {fmtPct(sheet.usedArea, sheetW * sheetH)} ·{' '}
          {sheet.cuts.length} cuts
        </p>
      </header>

      <div className="print-svg-wrap">
        <svg
          className="print-svg"
          viewBox={`0 0 ${totalW} ${totalH}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={PAD}
            y={PAD}
            width={w}
            height={h}
            fill="#ffffff"
            stroke="#111"
            strokeWidth={1.5}
          />
          {placements.map((p, i) => (
            <PrintPlacement
              key={i}
              p={p}
              scale={scale}
              showLabels={showLabels}
              unit={unit}
            />
          ))}
          <DimAxis
            orientation="horizontal"
            x={PAD}
            y={PAD + h + 18}
            length={w}
            value={`${fmt(sheetW, unit)} ${unit}`}
          />
          <DimAxis
            orientation="vertical"
            x={PAD + w + 18}
            y={PAD}
            length={h}
            value={`${fmt(sheetH, unit)} ${unit}`}
          />
        </svg>
      </div>

      <h3>Pieces on this sheet</h3>
      <table className="print-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Size</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {[...byLabel.values()].map((row, i) => (
            <tr key={i}>
              <td>{row.label}</td>
              <td>
                {fmt(row.w, unit)} × {fmt(row.h, unit)}
              </td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PrintPlacement({
  p,
  scale,
  showLabels,
  unit,
}: {
  p: Placement;
  scale: number;
  showLabels: boolean;
  unit: 'in' | 'mm';
}) {
  const x = PAD + p.x * scale;
  const y = PAD + p.y * scale;
  const w = p.w * scale;
  const h = p.h * scale;
  const minDim = Math.min(w, h);
  const labelFont = Math.max(8, Math.min(12, minDim * 0.16));
  const dimFont = Math.max(7, Math.min(10, minDim * 0.11));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="#f4f4f4"
        stroke="#333"
        strokeWidth={0.8}
      />
      {p.grain && <PrintGrainLines x={x} y={y} w={w} h={h} rotated={p.rotated} />}
      <text
        x={x + w / 2}
        y={y + dimFont + 2}
        textAnchor="middle"
        fontSize={dimFont}
        fill="#555"
      >
        {fmt(p.w, unit)}
      </text>
      <text
        x={x + dimFont + 2}
        y={y + h / 2}
        textAnchor="middle"
        fontSize={dimFont}
        fill="#555"
        transform={`rotate(-90 ${x + dimFont + 2} ${y + h / 2})`}
      >
        {fmt(p.h, unit)}
      </text>
      {showLabels && p.label && (
        <text
          x={x + w / 2}
          y={y + h / 2 + labelFont * 0.35}
          textAnchor="middle"
          fontSize={labelFont}
          fill="#111"
          fontWeight={500}
        >
          {p.label}
        </text>
      )}
    </g>
  );
}

function PrintGrainLines({
  x,
  y,
  w,
  h,
  rotated,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}) {
  const horizontal = !rotated;
  const spacing = 7;
  const lines: number[] = [];
  if (horizontal) {
    for (let yy = spacing; yy < h; yy += spacing) lines.push(yy);
  } else {
    for (let xx = spacing; xx < w; xx += spacing) lines.push(xx);
  }
  return (
    <g stroke="#888" strokeWidth={0.4}>
      {lines.map((p, i) =>
        horizontal ? (
          <line key={i} x1={x} y1={y + p} x2={x + w} y2={y + p} />
        ) : (
          <line key={i} x1={x + p} y1={y} x2={x + p} y2={y + h} />
        ),
      )}
    </g>
  );
}

function DimAxis({
  orientation,
  x,
  y,
  length,
  value,
}: {
  orientation: 'horizontal' | 'vertical';
  x: number;
  y: number;
  length: number;
  value: string;
}) {
  const color = '#111';
  const tick = 4;
  if (orientation === 'horizontal') {
    return (
      <g>
        <line x1={x} y1={y} x2={x + length} y2={y} stroke={color} />
        <line x1={x} y1={y - tick} x2={x} y2={y + tick} stroke={color} />
        <line
          x1={x + length}
          y1={y - tick}
          x2={x + length}
          y2={y + tick}
          stroke={color}
        />
        <text
          x={x + length / 2}
          y={y + 12}
          textAnchor="middle"
          fontSize={10}
          fill={color}
        >
          {value}
        </text>
      </g>
    );
  }
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + length} stroke={color} />
      <line x1={x - tick} y1={y} x2={x + tick} y2={y} stroke={color} />
      <line
        x1={x - tick}
        y1={y + length}
        x2={x + tick}
        y2={y + length}
        stroke={color}
      />
      <text
        x={x + 12}
        y={y + length / 2}
        textAnchor="middle"
        fontSize={10}
        fill={color}
        transform={`rotate(90 ${x + 12} ${y + length / 2})`}
      >
        {value}
      </text>
    </g>
  );
}
