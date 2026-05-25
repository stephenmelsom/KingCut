import { useStore } from '../state/store';
import type { OptimizationPriority } from '../optimizer/types';
import { fmt, fmtArea, fmtPct } from '../utils/format';
import { CollapsibleCard } from './CollapsibleCard';

const PRIORITY_LABEL: Record<OptimizationPriority, string> = {
  waste: 'Least wasted area',
  sheets: 'Fewest sheets used',
  cuts: 'Fewest cuts',
  'cut-length': 'Shortest cut length',
};

export function Stats() {
  const result = useStore((s) => s.result);
  const kerf = useStore((s) => s.options.kerf);
  const priority = useStore((s) => s.options.priority);
  const unit = useStore((s) => s.unit);

  if (!result || result.sheets.length === 0) return null;

  const { totals } = result;

  return (
    <div className="stats-stack">
      <CollapsibleCard title="Global statistics">
        <dl className="stats">
          <dt>Sheets used</dt>
          <dd>{totals.sheetsUsed}</dd>
          <dt>Total used area</dt>
          <dd>
            {fmtArea(totals.usedArea, unit)}{' '}
            <span className="muted">
              {fmtPct(totals.usedArea, totals.totalArea)}
            </span>
          </dd>
          <dt>Total wasted area</dt>
          <dd>
            {fmtArea(totals.wastedArea, unit)}{' '}
            <span className="muted">
              {fmtPct(totals.wastedArea, totals.totalArea)}
            </span>
          </dd>
          <dt>Total cuts</dt>
          <dd>{totals.cuts}</dd>
          <dt>Total cut length</dt>
          <dd>{fmt(totals.cutLength, unit)}</dd>
          <dt>Kerf thickness</dt>
          <dd>{fmt(kerf, unit)}</dd>
          <dt>Optimization priority</dt>
          <dd>{PRIORITY_LABEL[priority]}</dd>
        </dl>
      </CollapsibleCard>

      {result.sheets.map((s) => (
        <CollapsibleCard
          key={`stat-${s.sheetIndex}-${s.sheetId}`}
          title={`Sheet ${s.sheetIndex + 1} statistics`}
        >
          <dl className="stats">
            <dt>Stock sheet</dt>
            <dd>
              {fmt(s.sheetW, unit)}×{fmt(s.sheetH, unit)}
            </dd>
            <dt>Used area</dt>
            <dd>
              {fmtArea(s.usedArea, unit)}{' '}
              <span className="muted">
                {fmtPct(s.usedArea, s.sheetW * s.sheetH)}
              </span>
            </dd>
            <dt>Wasted area</dt>
            <dd>
              {fmtArea(s.wastedArea, unit)}{' '}
              <span className="muted">
                {fmtPct(s.wastedArea, s.sheetW * s.sheetH)}
              </span>
            </dd>
            <dt>Panels</dt>
            <dd>{s.placements.length}</dd>
            <dt>Cuts</dt>
            <dd>{s.cuts.length}</dd>
            <dt>Cut length</dt>
            <dd>{fmt(s.cutLength, unit)}</dd>
          </dl>
        </CollapsibleCard>
      ))}

      <CollapsibleCard title="Cuts">
        <table className="data-table cuts-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Sheet</th>
              <th>Axis</th>
              <th>Position</th>
              <th>Length</th>
            </tr>
          </thead>
          <tbody>
            {result.sheets.flatMap((s, sheetI) =>
              s.cuts.map((c, i) => (
                <tr key={`${sheetI}-${i}`}>
                  <td>{i + 1}</td>
                  <td>{sheetI + 1}</td>
                  <td>{c.axis}</td>
                  <td>{fmt(c.pos, unit)}</td>
                  <td>{fmt(c.length, unit)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </CollapsibleCard>
    </div>
  );
}
