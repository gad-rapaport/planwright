/**
 * Undo/redo over immutable snapshots. Each snapshot shares unchanged structure with its neighbours, so keeping
 * a hundred of them costs little. Rapid edits to the same field (typing) coalesce into one step.
 */
export interface Entry<T> {
  state: T;
  /** What the step from this state to the next one did, e.g. "Change amount of Rent". */
  label: string;
}

export interface History<T> {
  past: Entry<T>[];
  present: T;
  future: Entry<T>[];
  lastKey: string | null;
  lastAt: number;
}

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 1000;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 };
}

export function commit<T>(
  h: History<T>,
  next: T,
  label: string,
  coalesceKey: string | null,
  now: number,
): History<T> {
  if (next === h.present) return h;
  if (
    coalesceKey !== null &&
    h.lastKey === coalesceKey &&
    now - h.lastAt < COALESCE_MS &&
    h.future.length === 0
  ) {
    return { ...h, present: next, lastAt: now };
  }
  const past = [...h.past, { state: h.present, label }];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    present: next,
    future: [],
    lastKey: coalesceKey,
    lastAt: now,
  };
}

export function undo<T>(h: History<T>): { history: History<T>; label: string | null } {
  const last = h.past.at(-1);
  if (!last) return { history: h, label: null };
  return {
    history: {
      past: h.past.slice(0, -1),
      present: last.state,
      future: [{ state: h.present, label: last.label }, ...h.future],
      lastKey: null,
      lastAt: 0,
    },
    label: last.label,
  };
}

export function redo<T>(h: History<T>): { history: History<T>; label: string | null } {
  const [next, ...rest] = h.future;
  if (!next) return { history: h, label: null };
  return {
    history: {
      past: [...h.past, { state: h.present, label: next.label }],
      present: next.state,
      future: rest,
      lastKey: null,
      lastAt: 0,
    },
    label: next.label,
  };
}
