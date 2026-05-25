import { useStore } from '../state/store';
import { EditableNumber } from './EditableNumber';

export function PanelsTable() {
  const panels = useStore((s) => s.panels);
  const updatePanel = useStore((s) => s.updatePanel);
  const removePanel = useStore((s) => s.removePanel);
  const addPanel = useStore((s) => s.addPanel);

  return (
    <section className="card">
      <header className="card-header">
        <h2>Panels</h2>
        <button className="btn-sm" onClick={addPanel}>
          + Add
        </button>
      </header>
      <table className="data-table">
        <thead>
          <tr>
            <th>Length</th>
            <th>Width</th>
            <th>Qty</th>
            <th>Label</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {panels.map((p) => (
            <tr key={p.id}>
              <td>
                <EditableNumber
                  value={p.length}
                  step={0.1}
                  min={0}
                  ariaLabel="Length"
                  onChange={(v) => updatePanel(p.id, { length: v })}
                />
              </td>
              <td>
                <EditableNumber
                  value={p.width}
                  step={0.1}
                  min={0}
                  ariaLabel="Width"
                  onChange={(v) => updatePanel(p.id, { width: v })}
                />
              </td>
              <td>
                <EditableNumber
                  value={p.qty}
                  step={1}
                  min={0}
                  ariaLabel="Qty"
                  onChange={(v) => updatePanel(p.id, { qty: v })}
                />
              </td>
              <td>
                <input
                  type="text"
                  aria-label="Label"
                  value={p.label ?? ''}
                  onChange={(e) =>
                    updatePanel(p.id, { label: e.target.value })
                  }
                />
              </td>
              <td>
                <button
                  className="btn-icon"
                  onClick={() => removePanel(p.id)}
                  aria-label="Remove panel"
                  title="Remove"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          {panels.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                No panels yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
