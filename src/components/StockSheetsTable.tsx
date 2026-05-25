import { useStore } from '../state/store';
import { CollapsibleCard } from './CollapsibleCard';
import { EditableNumber } from './EditableNumber';

export function StockSheetsTable() {
  const stock = useStore((s) => s.stock);
  const updateSheet = useStore((s) => s.updateSheet);
  const removeSheet = useStore((s) => s.removeSheet);
  const addSheet = useStore((s) => s.addSheet);

  return (
    <CollapsibleCard
      title="Stock sheets"
      actions={
        <button className="btn-sm" onClick={addSheet}>
          + Add
        </button>
      }
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>Length</th>
            <th>Width</th>
            <th>Qty</th>
            <th>Label</th>
            <th title="Stock grain runs along sheet length">G</th>
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
              <td className="cell-check">
                <input
                  type="checkbox"
                  aria-label="Stock grain runs along length"
                  title="Check if this sheet has grain running along its length. Grained panels can only use this stock when grain direction is considered."
                  checked={!!s.grain}
                  onChange={(e) =>
                    updateSheet(s.id, { grain: e.target.checked })
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
              <td colSpan={6} className="empty">
                No stock sheets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </CollapsibleCard>
  );
}
