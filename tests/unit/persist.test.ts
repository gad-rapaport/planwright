import { describe, expect, it } from 'vitest';
import { exportWorkspace } from '../../src/io/fileFormat';
import { sampleWorkspace } from '../../src/sample/sample';
import { loadWorkspace, saveWorkspace, STORAGE_KEY, type KeyValueStore } from '../../src/state/persist';

function memory(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe('persistence', () => {
  it('starts from the sample when nothing is saved', () => {
    expect(loadWorkspace(memory()).source).toBe('sample');
  });

  it('saves and loads the same workspace', () => {
    const store = memory();
    const ws = sampleWorkspace();
    ws.plan.name = 'Edited';
    expect(saveWorkspace(store, ws, 1000)).toEqual({ ok: true, at: 1000 });
    const loaded = loadWorkspace(store);
    expect(loaded.source).toBe('saved');
    expect(loaded.workspace.plan.name).toBe('Edited');
  });

  it('keeps an unreadable saved copy instead of discarding it', () => {
    const store = memory({ [STORAGE_KEY]: '{"format":"planwright","version":1,"broken":' });
    const r = loadWorkspace(store, 42);
    expect(r.source).toBe('recovered');
    expect(store.data['planwright:unreadable:42']).toBe('{"format":"planwright","version":1,"broken":');
    expect(r.source === 'recovered' && r.message).toMatch(/could not be read/);
  });

  it('explains when storage is missing or throws', () => {
    expect(loadWorkspace(null).source).toBe('recovered');
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadWorkspace(throwing).source).toBe('recovered');
  });

  it('reports a full quota as a readable reason', () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(saveWorkspace(full, sampleWorkspace())).toEqual({ ok: false, reason: 'Browser storage is full.' });
    expect(saveWorkspace(null, sampleWorkspace()).ok).toBe(false);
  });

  it('stores the same format as the export file', () => {
    const store = memory();
    saveWorkspace(store, sampleWorkspace(), Date.parse('2027-01-01T00:00:00Z'));
    expect(store.data[STORAGE_KEY]).toBe(
      exportWorkspace(sampleWorkspace(), new Date('2027-01-01T00:00:00Z')),
    );
  });
});
