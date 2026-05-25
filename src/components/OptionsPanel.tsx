import { useStore } from '../state/store';
import type { OptimizationPriority } from '../optimizer/types';
import { EditableNumber } from './EditableNumber';

const PRIORITY_OPTIONS: { value: OptimizationPriority; label: string }[] = [
  { value: 'waste', label: 'Least wasted area' },
  { value: 'sheets', label: 'Fewest sheets used' },
  { value: 'cuts', label: 'Fewest cuts' },
  { value: 'cut-length', label: 'Shortest cut length' },
];

export function OptionsPanel() {
  const options = useStore((s) => s.options);
  const setOptions = useStore((s) => s.setOptions);

  return (
    <section className="card">
      <header className="card-header">
        <h2>Options</h2>
      </header>
      <div className="options-grid">
        <label className="option-row">
          <span>Optimization priority</span>
          <select
            className="option-select"
            value={options.priority}
            onChange={(e) =>
              setOptions({
                priority: e.target.value as OptimizationPriority,
              })
            }
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="option-row">
          <span>Cut / blade / kerf thickness</span>
          <EditableNumber
            value={options.kerf}
            step={0.01}
            min={0}
            ariaLabel="Kerf"
            onChange={(v) => setOptions({ kerf: v })}
          />
        </label>
        <label className="option-row">
          <span>Labels on panels</span>
          <input
            type="checkbox"
            role="switch"
            checked={options.showLabels}
            onChange={(e) => setOptions({ showLabels: e.target.checked })}
          />
        </label>
        <label className="option-row">
          <span>Allow rotation</span>
          <input
            type="checkbox"
            role="switch"
            checked={options.allowRotation}
            onChange={(e) => setOptions({ allowRotation: e.target.checked })}
          />
        </label>
        <label className="option-row">
          <span>Use only one sheet from stock</span>
          <input
            type="checkbox"
            role="switch"
            checked={options.singleSheet}
            onChange={(e) => setOptions({ singleSheet: e.target.checked })}
          />
        </label>
      </div>
    </section>
  );
}
