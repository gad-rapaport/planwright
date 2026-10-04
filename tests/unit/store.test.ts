import { describe, expect, it } from 'vitest';
import { createScenario, deleteScenario } from '../../src/domain/scenario';
import { sampleWorkspace } from '../../src/sample/sample';
import { initialState, MAX_COMPARE, reducer } from '../../src/state/store';

describe('store reducer', () => {
  it('compares the first scenarios by default', () => {
    expect(initialState(sampleWorkspace()).compare).toEqual([
      'base',
      'apprentice',
      'slow-year',
      'bigger-space',
    ]);
  });

  it('selects the parent after deleting the current scenario, and restores on undo', () => {
    let s = initialState(sampleWorkspace());
    s = reducer(s, { type: 'select', id: 'bigger-space' });
    s = reducer(s, {
      type: 'apply',
      label: 'Delete',
      coalesce: null,
      at: 0,
      fn: (w) => deleteScenario(w, 'apprentice'),
      select: 'base',
    });
    expect(s.scenarioId).toBe('base');
    expect(s.compare).toEqual(['base', 'slow-year']);
    s = reducer(s, { type: 'undo' });
    expect(s.history.present.scenarios).toHaveLength(4);
    expect(s.announcement.text).toBe('Undid: Delete');
  });

  it('falls back to the baseline when undo removes the selected scenario', () => {
    let s = initialState(sampleWorkspace());
    s = reducer(s, {
      type: 'apply',
      label: 'Branch',
      coalesce: null,
      at: 0,
      fn: (w) => createScenario(w, 'base', 'new', 'New'),
      select: 'new',
    });
    expect(s.scenarioId).toBe('new');
    s = reducer(s, { type: 'undo' });
    expect(s.scenarioId).toBe('base');
  });

  it(`limits the comparison to ${MAX_COMPARE} and keeps at least one`, () => {
    let s = initialState(sampleWorkspace());
    s = reducer(s, {
      type: 'apply',
      label: 'Branch',
      coalesce: null,
      at: 0,
      fn: (w) => createScenario(w, 'base', 'fifth', 'Fifth'),
    });
    s = reducer(s, { type: 'toggleCompare', id: 'fifth' });
    expect(s.compare).toHaveLength(MAX_COMPARE);
    expect(s.announcement.text).toMatch(/up to 4/);
    for (const id of ['base', 'apprentice', 'slow-year']) s = reducer(s, { type: 'toggleCompare', id });
    s = reducer(s, { type: 'toggleCompare', id: 'bigger-space' });
    expect(s.compare).toEqual(['bigger-space']);
    s = reducer(s, { type: 'toggleCompare', id: 'fifth' });
    expect(s.compare).toEqual(['bigger-space', 'fifth']);
  });

  it('announces when there is nothing to undo', () => {
    const s = reducer(initialState(sampleWorkspace()), { type: 'undo' });
    expect(s.announcement).toEqual({ text: 'Nothing to undo', n: 1 });
  });
});
