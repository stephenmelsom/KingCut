import { useStore } from '../state/store';

type Props = {
  activeTab: 'cutlist' | 'furniture';
  onTabChange: (tab: 'cutlist' | 'furniture') => void;
};

export function Toolbar({ activeTab, onTabChange }: Props) {
  const calculate = useStore((s) => s.calculate);
  const clearAll = useStore((s) => s.clearAll);
  const loadSeed = useStore((s) => s.loadSeed);
  const result = useStore((s) => s.result);
  const hasResult = !!result && result.sheets.length > 0;

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="logo">▦</span>
        <span>KingCut</span>
        <span className="tag">Free cutlist optimizer</span>
      </div>
      <nav className="top-tabs" aria-label="Workspace">
        <button
          className={activeTab === 'cutlist' ? 'active' : ''}
          onClick={() => onTabChange('cutlist')}
        >
          Cutlist
        </button>
        <button
          className={activeTab === 'furniture' ? 'active' : ''}
          onClick={() => onTabChange('furniture')}
        >
          Furniture
        </button>
      </nav>
      <div className="toolbar-actions">
        <button className="btn-ghost" onClick={loadSeed} title="Load example">
          Example
        </button>
        <button className="btn-ghost" onClick={clearAll} title="Clear all">
          Clear
        </button>
        <button
          className="btn-ghost"
          onClick={() => window.print()}
          disabled={!hasResult}
          title={
            hasResult
              ? 'Open the print dialog (choose Save as PDF)'
              : 'Calculate a layout first'
          }
        >
          ↓ PDF
        </button>
        <button className="btn-primary" onClick={calculate}>
          ▶ Calculate
        </button>
      </div>
    </header>
  );
}
