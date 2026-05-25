import { LayoutCanvas } from './components/LayoutCanvas';
import { OptionsPanel } from './components/OptionsPanel';
import { PanelsTable } from './components/PanelsTable';
import { PrintView } from './components/PrintView';
import { Stats } from './components/Stats';
import { StockSheetsTable } from './components/StockSheetsTable';
import { Toolbar } from './components/Toolbar';

export default function App() {
  return (
    <div className="app">
      <Toolbar />
      <main className="layout">
        <aside className="col-left">
          <PanelsTable />
          <StockSheetsTable />
          <OptionsPanel />
        </aside>
        <section className="col-center">
          <LayoutCanvas />
        </section>
        <aside className="col-right">
          <Stats />
        </aside>
      </main>
      <PrintView />
    </div>
  );
}
