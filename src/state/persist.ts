import type { Workspace } from '../domain/types';
import { exportWorkspace, parseImport } from '../io/fileFormat';
import { sampleWorkspace } from '../sample/sample';

export const STORAGE_KEY = 'planwright:workspace';
const RECOVERY_PREFIX = 'planwright:unreadable:';

/** The subset of Web Storage used here, so tests can pass an in-memory or failing fake. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type LoadResult =
  | { source: 'saved'; workspace: Workspace }
  | { source: 'sample'; workspace: Workspace }
  | { source: 'recovered'; workspace: Workspace; message: string };

/**
 * Loads the autosaved workspace. A saved copy that no longer validates is kept under a separate key (never
 * silently discarded) and the sample plan is loaded instead.
 */
export function loadWorkspace(store: KeyValueStore | null, now = Date.now()): LoadResult {
  const unavailable: LoadResult = {
    source: 'recovered',
    workspace: sampleWorkspace(),
    message:
      'Browser storage is unavailable, so changes will not be kept after you close this tab. Export to keep your work.',
  };
  if (!store) return unavailable;
  let text: string | null;
  try {
    text = store.getItem(STORAGE_KEY);
  } catch {
    return unavailable;
  }
  if (text === null) return { source: 'sample', workspace: sampleWorkspace() };
  const result = parseImport(text);
  if (result.ok) return { source: 'saved', workspace: result.workspace };
  const backupKey = `${RECOVERY_PREFIX}${now}`;
  try {
    store?.setItem(backupKey, text);
  } catch {
    // Nothing more we can do; the message below still tells the person what happened.
  }
  return {
    source: 'recovered',
    workspace: sampleWorkspace(),
    message: `The saved plan could not be read (${result.errors[0] ?? 'unknown problem'}). It was kept in browser storage as "${backupKey}" and the sample plan was loaded.`,
  };
}

export type SaveResult = { ok: true; at: number } | { ok: false; reason: string };

export function saveWorkspace(store: KeyValueStore | null, ws: Workspace, now = Date.now()): SaveResult {
  if (!store) return { ok: false, reason: 'Browser storage is unavailable.' };
  try {
    store.setItem(STORAGE_KEY, exportWorkspace(ws, new Date(now)));
    return { ok: true, at: now };
  } catch (err) {
    const quota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    return { ok: false, reason: quota ? 'Browser storage is full.' : 'Browser storage refused the save.' };
  }
}

/** localStorage access itself can throw (blocked site data); treat that as "no storage". */
export function browserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = 'planwright:probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
