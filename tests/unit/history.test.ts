import { describe, expect, it } from 'vitest';
import { COALESCE_MS, commit, createHistory, HISTORY_LIMIT, redo, undo } from '../../src/state/history';

describe('history', () => {
  it('undoes and redoes with labels', () => {
    let h = createHistory(0);
    h = commit(h, 1, 'one', null, 0);
    h = commit(h, 2, 'two', null, 10);
    const u = undo(h);
    expect(u.label).toBe('two');
    expect(u.history.present).toBe(1);
    const r = redo(u.history);
    expect(r.label).toBe('two');
    expect(r.history.present).toBe(2);
  });

  it('coalesces rapid edits with the same key into one step', () => {
    let h = createHistory('');
    h = commit(h, 'a', 'Type', 'name', 0);
    h = commit(h, 'ab', 'Type', 'name', 300);
    h = commit(h, 'abc', 'Type', 'name', 600);
    expect(h.past).toHaveLength(1);
    expect(undo(h).history.present).toBe('');
  });

  it('starts a new step after a pause or a different key', () => {
    let h = createHistory('');
    h = commit(h, 'a', 'Type', 'name', 0);
    h = commit(h, 'ab', 'Type', 'name', COALESCE_MS + 1);
    h = commit(h, 'ab!', 'Other', 'notes', COALESCE_MS + 2);
    expect(h.past).toHaveLength(3);
  });

  it('does not coalesce into a step after undo', () => {
    let h = createHistory(0);
    h = commit(h, 1, 'n', 'k', 0);
    h = undo(h).history;
    h = commit(h, 5, 'n', 'k', 10);
    expect(h.past).toHaveLength(1);
    expect(h.future).toHaveLength(0);
  });

  it('a new edit clears the redo stack', () => {
    let h = commit(createHistory(0), 1, 'one', null, 0);
    h = undo(h).history;
    h = commit(h, 7, 'seven', null, 5);
    expect(redo(h).label).toBeNull();
  });

  it('ignores no-op commits and empty undo/redo', () => {
    const h = createHistory({ a: 1 });
    expect(commit(h, h.present, 'same', null, 0)).toBe(h);
    expect(undo(h)).toEqual({ history: h, label: null });
    expect(redo(h)).toEqual({ history: h, label: null });
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) h = commit(h, i, `step ${i}`, null, i * 10_000);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]?.state).toBe(20);
  });
});
