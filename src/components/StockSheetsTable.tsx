import { useStore } from '../state/store';
import { EditableNumber } from './EditableNumber';

export function StockSheetsTable() {
  const stock = useStore((s) => s.stock);
  const updateSheet = useStore((s) => s.updateSheet);
  const removeSheet = useStore((s) => s.removeSheet);
  const addSheet = useStore((s) => s.addSheet);

  return (
    <section className="card">
      <header className="card-header">
        <h2>Stock sheets</h2>
        <button className="btn-sm" onClick={addSheet}>
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
          {stock.map((s) => (
            <tr key={s.id}>
              <td>
                <EditableNumber
                  value={s.length}
                  step={0.1}
                  min={0}
                  ariaLabel="Length"
                  onChange={(v) => updateSheet(s.id, { length: v })}
                />
              </td>
              <td>
                <EditableNumber
                  value={s.width}
                  step={0.1}
                  min={0}
                  ariaLabel="Width"
                  onChange={(v) => updateSheet(s.id, { width: v })}
                />
              </td>
              <td>
                <EditableNumber
                  value={s.qty}
                  step={1}
                  min={0}
                  ariaLabel="Qty"
                  onChange={(v) => updateSheet(s.id, { qty: v })}
                />
              </td>
              <td>
                <input
                  type="text"
                  aria-label="Label"
                  value={s.label ?? ''}
                  onChange={(e) =>
                    updateSheet(s.id, { label: e.target.value })
                  }
                />
              </td>
              <td>
                <button
                  className="btn-icon"
                  onClick={() => removeSheet(s.id)}
                  aria-label="Remove sheet"
                  title="Remove"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          {stock.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                No stock sheets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
