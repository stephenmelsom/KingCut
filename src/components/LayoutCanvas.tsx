import { useMemo } from 'react';
import { useStore } from '../state/store';
import { fmt } from '../utils/format';
import type { Placement, SheetLayout } from '../optimizer/types';

const MAX_W = 720;
const MAX_H = 720;
const PAD = 36;

export function LayoutCanvas() {
  const result = useStore((s) => s.result);
  const showLabels = useStore((s) => s.options.showLabels);
  const unit = useStore((s) => s.unit);

  if (!result) {
    return (
      <div className="canvas-empty">
        <p>
          Add panels and stock sheets, then press <strong>Calculate</strong>.
        </p>
      </div>
    );
  }

  if (result.sheets.length === 0) {
    return (
      <div className="canvas-empty">
        <p>No layout yet. Check your inputs and try Calculate.</p>
      </div>
    );
  }

  return (
    <div className="layouts">
      {result.sheets.map((sheet) => (
        <SheetView
          key={`${sheet.sheetIndex}-${sheet.sheetId}`}
          sheet={sheet}
          showLabels={showLabels}
          unit={unit}
        />
      ))}
      {result.unplaced.length > 0 && (
        <div className="warn">
          {result.unplaced.length} panel(s) could not be placed on the
          available stock. Add more stock sheets or larger ones.
        </div>
      )}
    </div>
  );
}

function SheetView({
  sheet,
  showLabels,
  unit,
}: {
  sheet: SheetLayout;
  showLabels: boolean;
  unit: 'in' | 'mm';
}) {
  const { sheetW, sheetH, placements } = sheet;
  const scale = useMemo(() => {
    const sw = MAX_W / sheetW;
    const sh = MAX_H / sheetH;
    return Math.min(sw, sh);
  }, [sheetW, sheetH]);

  const w = sheetW * scale;
  const h = sheetH * scale;
  const totalW = w + PAD * 2;
  const totalH = h + PAD * 2;

  return (
    <figure className="sheet">
      <figcaption>
        Sheet {sheet.sheetIndex + 1}{' '}
        <span className="muted">
          {fmt(sheetW, unit)} × {fmt(sheetH, unit)}
        </span>
      </figcaption>
      <svg
        className="sheet-svg"
        viewBox={`0 0 ${totalW} ${totalH}`}
        width={totalW}
        height={totalH}
      >
        {/* Sheet background */}
        <rect
          x={PAD}
          y={PAD}
          width={w}
          height={h}
          fill="#ffffff"
          stroke="#222"
          strokeWidth={1.5}
        />
        {/* Placements */}
        {placements.map((p, i) => (
          <PlacementRect
            key={i}
            p={p}
            scale={scale}
            showLabels={showLabels}
            unit={unit}
          />
        ))}
        {/* Outer dimensions */}
        <DimensionAxis
          orientation="horizontal"
          x={PAD}
          y={PAD + h + 16}
          length={w}
          value={fmt(sheetW, unit)}
        />
        <DimensionAxis
          orientation="vertical"
          x={PAD + w + 16}
          y={PAD}
          length={h}
          value={fmt(sheetH, unit)}
        />
      </svg>
    </figure>
  );
}

function PlacementRect({
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
  const color = colorFor(p.label ?? p.panelId);
  const minDim = Math.min(w, h);
  const labelFont = Math.max(9, Math.min(14, minDim * 0.18));
  const dimFont = Math.max(7, Math.min(11, minDim * 0.12));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={color}
        stroke="#3a3a3a"
        strokeWidth={1}
      />
      {/* Top edge: width label */}
      <text
        x={x + w / 2}
        y={y + dimFont + 2}
        textAnchor="middle"
        fontSize={dimFont}
        fill="#555"
      >
        {fmt(p.w, unit)}
      </text>
      {/* Left edge: height label, rotated */}
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
      {/* Center: label */}
      {showLabels && p.label && (
        <text
          x={x + w / 2}
          y={y + h / 2 + labelFont * 0.35}
          textAnchor="middle"
          fontSize={labelFont}
          fill="#222"
          fontWeight={500}
        >
          {p.label}
        </text>
      )}
    </g>
  );
}

function DimensionAxis({
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
  const color = '#c0392b';
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
          fontSize={11}
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
        fontSize={11}
        fill={color}
        transform={`rotate(90 ${x + 12} ${y + length / 2})`}
      >
        {value}
      </text>
    </g>
  );
}

/**
 * Deterministic pastel color from a string. Pure visual aid, no semantics.
 */
function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 55%, 86%)`;
}
