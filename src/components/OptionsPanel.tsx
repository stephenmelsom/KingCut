import { useStore } from '../state/store';
import type { OptimizationPriority } from '../optimizer/types';
import { CollapsibleCard } from './CollapsibleCard';
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
  const unit = useStore((s) => s.unit);
  const setUnit = useStore((s) => s.setUnit);

  return (
    <CollapsibleCard title="Options">
      <div className="options-grid">
        <div className="option-row">
          <span>Display unit</span>
          <div className="unit-toggle pane-toggle" role="group" aria-label="Display unit">
            <button
              className={unit === 'in' ? 'active' : ''}
              onClick={() => setUnit('in')}
            >
              in
            </button>
            <button
              className={unit === 'mm' ? 'active' : ''}
              onClick={() => setUnit('mm')}
            >
              mm
            </button>
          </div>
        </div>
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
        <label className="option-row">
          <span>Thorough search</span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Thorough search"
            title="Try extra deterministic panel orderings. Slower, but can find lower-waste layouts on harder cutlists."
            checked={options.thorough}
            onChange={(e) => setOptions({ thorough: e.target.checked })}
          />
        </label>
        <label className="option-row">
          <span>Consider grain direction</span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Consider grain direction"
            title="When enabled, checked panels keep grain along their length, cannot rotate, and must be placed on checked stock sheets."
            checked={options.respectGrain}
            onChange={(e) => setOptions({ respectGrain: e.target.checked })}
          />
        </label>
      </div>
    </CollapsibleCard>
  );
}
