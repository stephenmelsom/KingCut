import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { LayoutCanvas } from './components/LayoutCanvas';
import { FurniturePage } from './components/FurniturePage';
import { OptionsPanel } from './components/OptionsPanel';
import { PanelsTable } from './components/PanelsTable';
import { PrintView } from './components/PrintView';
import { ProjectPanel } from './components/ProjectPanel';
import { SharingPanel } from './components/SharingPanel';
import { Stats } from './components/Stats';
import { StockSheetsTable } from './components/StockSheetsTable';
import { Toolbar } from './components/Toolbar';

const LEFT_PANEL_STORAGE_KEY = 'kingcut:left-panel-width';
const MIN_LEFT_PANEL_WIDTH = 320;
const MAX_LEFT_PANEL_WIDTH = 640;
const DEFAULT_LEFT_PANEL_WIDTH = 420;

function clampLeftPanelWidth(width: number) {
  return Math.min(MAX_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, width));
}

function initialLeftPanelWidth() {
  const saved = window.localStorage.getItem(LEFT_PANEL_STORAGE_KEY);
  const parsed = saved ? Number(saved) : DEFAULT_LEFT_PANEL_WIDTH;

  return Number.isFinite(parsed)
    ? clampLeftPanelWidth(parsed)
    : DEFAULT_LEFT_PANEL_WIDTH;
}

export default function App() {
  const [leftPanelWidth, setLeftPanelWidth] = useState(initialLeftPanelWidth);
  const [activeTab, setActiveTab] = useState<'cutlist' | 'furniture'>('cutlist');
  const dragStartRef = useRef<{ pointerX: number; width: number } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(
      LEFT_PANEL_STORAGE_KEY,
      String(leftPanelWidth),
    );
  }, [leftPanelWidth]);

  const startResize = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStartRef.current = {
        pointerX: event.clientX,
        width: leftPanelWidth,
      };
    },
    [leftPanelWidth],
  );

  const resize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    const delta = event.clientX - dragStartRef.current.pointerX;
    setLeftPanelWidth(clampLeftPanelWidth(dragStartRef.current.width + delta));
  }, []);

  const stopResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
  }, []);

  const resizeWithKeyboard = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const largeStep = event.shiftKey ? 50 : 10;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setLeftPanelWidth((width) => clampLeftPanelWidth(width - largeStep));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setLeftPanelWidth((width) => clampLeftPanelWidth(width + largeStep));
      }
      if (event.key === 'Home') {
        event.preventDefault();
        setLeftPanelWidth(MIN_LEFT_PANEL_WIDTH);
      }
      if (event.key === 'End') {
        event.preventDefault();
        setLeftPanelWidth(MAX_LEFT_PANEL_WIDTH);
      }
    },
    [],
  );

  return (
    <div className="app">
      <Toolbar activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'cutlist' ? (
        <main
          className="layout"
          style={
            {
              '--left-panel-width': `${leftPanelWidth}px`,
            } as CSSProperties
          }
        >
          <aside className="col-left">
            <ProjectPanel />
            <PanelsTable />
            <StockSheetsTable />
            <OptionsPanel />
            <SharingPanel />
          </aside>
          <div
            className="col-resizer"
            role="separator"
            aria-label="Resize left panel"
            aria-orientation="vertical"
            aria-valuemin={MIN_LEFT_PANEL_WIDTH}
            aria-valuemax={MAX_LEFT_PANEL_WIDTH}
            aria-valuenow={leftPanelWidth}
            tabIndex={0}
            onPointerDown={startResize}
            onPointerMove={resize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            onKeyDown={resizeWithKeyboard}
          />
          <section className="col-center">
            <LayoutCanvas />
          </section>
          <aside className="col-right">
            <Stats />
          </aside>
        </main>
      ) : (
        <FurniturePage />
      )}
      <PrintView />
    </div>
  );
}
