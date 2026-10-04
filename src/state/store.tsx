import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { project, type Projection } from '../domain/engine';
import { findScenario, resolve, type Resolved } from '../domain/scenario';
import { BASE_ID, type Workspace } from '../domain/types';
import { commit, createHistory, redo, undo, type History } from './history';
import { browserStore, loadWorkspace, saveWorkspace, type KeyValueStore } from './persist';

export const MAX_COMPARE = 4;

interface State {
  history: History<Workspace>;
  scenarioId: string;
  compare: string[];
  /** Polite announcement for screen readers; `n` makes repeated identical messages re-announce. */
  announcement: { text: string; n: number };
}

type Action =
  | {
      type: 'apply';
      label: string;
      coalesce: string | null;
      at: number;
      fn: (ws: Workspace) => Workspace;
      select?: string;
    }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; id: string }
  | { type: 'toggleCompare'; id: string }
  | { type: 'announce'; text: string };

function announce(state: State, text: string): State['announcement'] {
  return { text, n: state.announcement.n + 1 };
}

/** Keeps selections pointing at scenarios that exist after undo, redo or a delete. */
function reconcile(state: State): State {
  const ws = state.history.present;
  const scenarioId = findScenario(ws, state.scenarioId) ? state.scenarioId : BASE_ID;
  let compare = state.compare.filter((id) => findScenario(ws, id));
  if (compare.length === 0) compare = ws.scenarios.slice(0, MAX_COMPARE).map((s) => s.id);
  return scenarioId === state.scenarioId && compare.length === state.compare.length
    ? state
    : { ...state, scenarioId, compare };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'apply': {
      const next = action.fn(state.history.present);
      const history = commit(state.history, next, action.label, action.coalesce, action.at);
      if (history === state.history) return state;
      return reconcile({ ...state, history, scenarioId: action.select ?? state.scenarioId });
    }
    case 'undo': {
      const r = undo(state.history);
      if (!r.label) return { ...state, announcement: announce(state, 'Nothing to undo') };
      return reconcile({ ...state, history: r.history, announcement: announce(state, `Undid: ${r.label}`) });
    }
    case 'redo': {
      const r = redo(state.history);
      if (!r.label) return { ...state, announcement: announce(state, 'Nothing to redo') };
      return reconcile({ ...state, history: r.history, announcement: announce(state, `Redid: ${r.label}`) });
    }
    case 'select':
      return findScenario(state.history.present, action.id) ? { ...state, scenarioId: action.id } : state;
    case 'toggleCompare': {
      const on = state.compare.includes(action.id);
      if (on) {
        if (state.compare.length === 1)
          return { ...state, announcement: announce(state, 'Keep at least one scenario') };
        return { ...state, compare: state.compare.filter((id) => id !== action.id) };
      }
      if (state.compare.length >= MAX_COMPARE) {
        return {
          ...state,
          announcement: announce(state, `Compare up to ${MAX_COMPARE} scenarios at a time`),
        };
      }
      // Keep workspace order so colours and columns stay stable.
      const order = state.history.present.scenarios.map((s) => s.id);
      const compare = [...state.compare, action.id].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      return { ...state, compare };
    }
    case 'announce':
      return { ...state, announcement: announce(state, action.text) };
  }
}

export function initialState(ws: Workspace): State {
  return reconcile({
    history: createHistory(ws),
    scenarioId: BASE_ID,
    compare: [],
    announcement: { text: '', n: 0 },
  });
}

export type SaveStatus = { kind: 'idle' } | { kind: 'saved'; at: number } | { kind: 'error'; reason: string };

interface StoreValue {
  ws: Workspace;
  scenarioId: string;
  compare: string[];
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  announcement: State['announcement'];
  save: SaveStatus;
  loadMessage: string | null;
  dismissLoadMessage: () => void;
  edit: (
    label: string,
    fn: (ws: Workspace) => Workspace,
    opts?: { coalesce?: string; select?: string },
  ) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string) => void;
  toggleCompare: (id: string) => void;
  say: (text: string) => void;
  resolved: (id: string) => Resolved;
  projection: (id: string) => Projection;
}

const StoreContext = createContext<StoreValue | null>(null);

const SAVE_DELAY_MS = 400;

export function StoreProvider({
  children,
  store: injected,
}: {
  children: ReactNode;
  store?: KeyValueStore | null;
}) {
  const storage = useMemo(() => (injected === undefined ? browserStore() : injected), [injected]);
  const [boot] = useState(() => loadWorkspace(storage));
  const [state, dispatch] = useReducer(reducer, boot.workspace, initialState);
  const [save, setSave] = useState<SaveStatus>({ kind: 'idle' });
  const [loadMessage, setLoadMessage] = useState<string | null>(
    boot.source === 'recovered' ? boot.message : null,
  );
  const ws = state.history.present;

  // Autosave after a short pause; the first render is the loaded state and needs no save.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const r = saveWorkspace(storage, ws);
      setSave(r.ok ? { kind: 'saved', at: r.at } : { kind: 'error', reason: r.reason });
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ws, storage]);

  // Projections are cached per workspace snapshot: an edit invalidates them, switching views does not.
  const cache = useMemo(
    () => ({ for: ws, entries: new Map<string, { resolved: Resolved; projection?: Projection }>() }),
    [ws],
  ).entries;
  const resolvedFor = useCallback(
    (id: string) => {
      let entry = cache.get(id);
      if (!entry) {
        entry = { resolved: resolve(ws, id) };
        cache.set(id, entry);
      }
      return entry.resolved;
    },
    [cache, ws],
  );
  const projectionFor = useCallback(
    (id: string) => {
      resolvedFor(id);
      const entry = cache.get(id)!;
      entry.projection ??= project(entry.resolved.items, ws.plan.months, entry.resolved.opening);
      return entry.projection;
    },
    [cache, resolvedFor, ws.plan.months],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ws,
      scenarioId: state.scenarioId,
      compare: state.compare,
      canUndo: state.history.past.length > 0,
      canRedo: state.history.future.length > 0,
      undoLabel: state.history.past.at(-1)?.label ?? null,
      redoLabel: state.history.future[0]?.label ?? null,
      announcement: state.announcement,
      save,
      loadMessage,
      dismissLoadMessage: () => setLoadMessage(null),
      edit: (label, fn, opts) =>
        dispatch({
          type: 'apply',
          label,
          fn,
          coalesce: opts?.coalesce ?? null,
          at: Date.now(),
          select: opts?.select,
        }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      select: (id) => dispatch({ type: 'select', id }),
      toggleCompare: (id) => dispatch({ type: 'toggleCompare', id }),
      say: (text) => dispatch({ type: 'announce', text }),
      resolved: resolvedFor,
      projection: projectionFor,
    }),
    [ws, state, save, loadMessage, resolvedFor, projectionFor],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore outside StoreProvider');
  return value;
}
