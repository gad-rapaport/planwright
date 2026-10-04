import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { lineage } from './domain/scenario';
import { PlanPage } from './pages/plan/PlanPage';

// The editor loads first; comparison, data and print views are separate chunks (all precached for offline use).
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })));
const PrintPage = lazy(() => import('./pages/PrintPage').then((m) => ({ default: m.PrintPage })));
import { useStore } from './state/store';
import { scenarioIndex, seriesVar } from './ui/colors';
import { useOnline, useServiceWorker } from './ui/useAppShell';

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function useUndoShortcuts() {
  const { undo, redo } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = (key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey);
      if (!isUndo && !isRedo) return;
      // Inside a text field the plan-level undo still applies: fields commit as you type, so the browser's
      // own field undo would fight the plan state.
      if (isEditable(e.target)) (e.target as HTMLElement).blur();
      e.preventDefault();
      if (isUndo) undo();
      else redo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
}

function SaveIndicator() {
  const { save } = useStore();
  if (save.kind === 'error') return <span className="save save--error">Not saved: {save.reason}</span>;
  if (save.kind === 'saved')
    return (
      <span className="save">
        Saved in this browser{' '}
        {new Date(save.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  return <span className="save">Saved in this browser</span>;
}

function Header() {
  const { ws, canUndo, canRedo, undoLabel, redoLabel, undo, redo } = useStore();
  const online = useOnline();
  const sw = useServiceWorker();
  return (
    <header className="topbar no-print">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="brand">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect
            x="2"
            y="7"
            width="18"
            height="18"
            rx="3"
            fill="var(--paper-3)"
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
          <rect
            x="8"
            y="3"
            width="18"
            height="18"
            rx="3"
            fill="var(--accent)"
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
          <path
            d="M12 15 L16 11 L20 13 L23 8"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="brand__name">Planwright</span>
        <span className="brand__plan" title={ws.plan.name}>
          {ws.plan.name}
        </span>
      </div>
      <nav aria-label="Main">
        <NavLink to="/" end>
          Plan
        </NavLink>
        <NavLink to="/compare">Compare</NavLink>
        <NavLink to="/data">Data</NavLink>
      </nav>
      <div className="topbar__tools">
        <button
          type="button"
          className="btn btn--icon"
          onClick={undo}
          disabled={!canUndo}
          aria-keyshortcuts="Control+Z"
          title={undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : 'Nothing to undo'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M6 4 L2 8 L6 12 M2 8 H11 a5 5 0 0 1 0 10 H8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="visually-hidden">Undo{undoLabel ? `: ${undoLabel}` : ''}</span>
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={redo}
          disabled={!canRedo}
          aria-keyshortcuts="Control+Shift+Z Control+Y"
          title={redoLabel ? `Redo: ${redoLabel} (Ctrl+Shift+Z)` : 'Nothing to redo'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M12 4 L16 8 L12 12 M16 8 H7 a5 5 0 0 0 0 10 H10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="visually-hidden">Redo{redoLabel ? `: ${redoLabel}` : ''}</span>
        </button>
        <span className="status-line" aria-live="polite">
          <SaveIndicator />
          {!online && (
            <span className="pill">
              Offline{sw.state === 'ready' || sw.state === 'update' ? ', still working' : ''}
            </span>
          )}
          {online && sw.state === 'ready' && <span className="pill pill--quiet">Works offline</span>}
        </span>
        {sw.state === 'update' && (
          <button type="button" className="btn btn--primary" onClick={sw.applyUpdate}>
            New version: reload
          </button>
        )}
      </div>
    </header>
  );
}

function ScenarioRail() {
  const { ws, scenarioId, select } = useStore();
  const location = useLocation();
  const onPlan = location.pathname === '/';
  return (
    <aside className="rail no-print" aria-labelledby="rail-heading">
      <h2 id="rail-heading" className="rail__heading">
        Scenarios
      </h2>
      <ul className="tabs">
        {ws.scenarios.map((s) => {
          const depth = lineage(ws, s.id).length - 1;
          const current = s.id === scenarioId;
          return (
            <li
              key={s.id}
              style={{ '--depth': depth, '--tab': seriesVar(scenarioIndex(ws, s.id)) } as React.CSSProperties}
            >
              <NavLink
                to="/"
                className={`tab${current ? ' tab--current' : ''}`}
                aria-current={current && onPlan ? 'page' : current ? 'true' : undefined}
                onClick={() => select(s.id)}
              >
                <span className="tab__edge" aria-hidden="true" />
                <span className="tab__name">{s.name}</span>
                <span className="tab__meta">
                  {s.parentId === null
                    ? 'Baseline'
                    : `${s.changes.length} change${s.changes.length === 1 ? '' : 's'}`}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
      <label className="rail__select">
        <span>Scenario</span>
        <select value={scenarioId} onChange={(e) => select(e.target.value)}>
          {ws.scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {' '.repeat((lineage(ws, s.id).length - 1) * 2)}
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}

function Toast() {
  const { announcement, canUndo, undo, loadMessage, dismissLoadMessage } = useStore();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!announcement.text) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [announcement]);
  const offerUndo = canUndo && !/^(Undid|Redid|Nothing|Keep|Compare up)/.test(announcement.text);
  return (
    <>
      <div className="toast-region no-print" role="status" aria-live="polite">
        {visible && (
          <div className="toast" key={announcement.n}>
            <span>{announcement.text}</span>
            {offerUndo && (
              <button type="button" className="btn btn--quiet" onClick={undo}>
                Undo
              </button>
            )}
          </div>
        )}
      </div>
      {loadMessage && (
        <div className="notice notice--error banner no-print" role="alert">
          <p>{loadMessage}</p>
          <button type="button" className="btn btn--quiet" onClick={dismissLoadMessage}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

const TITLES: Record<string, string> = {
  '/': 'Plan',
  '/compare': 'Compare',
  '/data': 'Data',
  '/print': 'Report',
};

export function App() {
  useUndoShortcuts();
  const location = useLocation();
  const print = location.pathname === '/print';
  useEffect(() => {
    document.title = `${TITLES[location.pathname] ?? 'Not found'} · Planwright`;
  }, [location.pathname]);
  return (
    <div className={`shell${print ? ' shell--print' : ''}`}>
      <Header />
      <Toast />
      <div className="layout">
        {!print && <ScenarioRail />}
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<p className="muted">Loading…</p>}>
            <Routes>
              <Route path="/" element={<PlanPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/data" element={<DataPage />} />
              <Route path="/print" element={<PrintPage />} />
              <Route
                path="*"
                element={
                  <section className="sheet">
                    <h1>Page not found</h1>
                    <p>
                      <NavLink to="/">Back to the plan</NavLink>
                    </p>
                  </section>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
