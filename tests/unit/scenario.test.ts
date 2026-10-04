import { describe, expect, it } from 'vitest';
import {
  addItem,
  allItemIds,
  createScenario,
  deleteScenario,
  itemStatus,
  lineage,
  pruneOrphans,
  removedItems,
  removeItem,
  resolve,
  revertItem,
  setItemField,
  setOpening,
} from '../../src/domain/scenario';
import type { LineItem, Workspace } from '../../src/domain/types';
import { sampleWorkspace } from '../../src/sample/sample';

const amountOf = (ws: Workspace, scenario: string, item: string) =>
  resolve(ws, scenario).items.find((i) => i.id === item)?.amount;
const extra = (id: string): LineItem => ({
  id,
  name: id,
  kind: 'income',
  category: '',
  amount: 10,
  start: 0,
  end: null,
  growth: 0,
});

describe('resolve', () => {
  it('applies changes along the whole lineage', () => {
    const ws = sampleWorkspace();
    expect(lineage(ws, 'bigger-space').map((s) => s.id)).toEqual(['base', 'apprentice', 'bigger-space']);
    const r = resolve(ws, 'bigger-space');
    expect(r.opening).toBe(35_000);
    expect(r.items.find((i) => i.id === 'rent')?.amount).toBe(11_500);
    // Inherited from "apprentice" and added here.
    expect(r.items.map((i) => i.id)).toEqual(
      expect.arrayContaining(['apprentice-wage', 'extra-capacity', 'club-rental']),
    );
    expect(resolve(ws, 'slow-year').items.some((i) => i.id === 'school-workshops')).toBe(false);
  });

  it('lets baseline edits flow into branches that do not override them', () => {
    let ws = sampleWorkspace();
    ws = setItemField(ws, 'base', 'wages', 'amount', 22_000);
    expect(amountOf(ws, 'bigger-space', 'wages')).toBe(22_000);
    ws = setItemField(ws, 'base', 'rent', 'amount', 8_000);
    expect(amountOf(ws, 'bigger-space', 'rent')).toBe(11_500);
  });
});

describe('editing a branch', () => {
  it('stores an override and drops it when set back to the parent value', () => {
    let ws = sampleWorkspace();
    ws = setItemField(ws, 'apprentice', 'rent', 'amount', 9_000);
    expect(ws.scenarios.find((s) => s.id === 'apprentice')?.changes).toContainEqual({
      type: 'set',
      itemId: 'rent',
      field: 'amount',
      value: 9_000,
    });
    expect(ws.items.find((i) => i.id === 'rent')?.amount).toBe(7_800);
    ws = setItemField(ws, 'apprentice', 'rent', 'amount', 7_800);
    expect(ws.scenarios.find((s) => s.id === 'apprentice')?.changes.some((c) => c.type === 'set')).toBe(
      false,
    );
  });

  it('edits an item added in the same branch in place', () => {
    const ws = setItemField(sampleWorkspace(), 'apprentice', 'apprentice-wage', 'amount', 8_000);
    const s = ws.scenarios.find((x) => x.id === 'apprentice')!;
    expect(s.changes.filter((c) => c.type === 'set')).toEqual([]);
    expect(amountOf(ws, 'apprentice', 'apprentice-wage')).toBe(8_000);
  });

  it('removes an inherited item with a remove change and can restore it', () => {
    let ws = setItemField(sampleWorkspace(), 'apprentice', 'fees', 'amount', 500);
    ws = removeItem(ws, 'apprentice', 'fees');
    const s = ws.scenarios.find((x) => x.id === 'apprentice')!;
    expect(s.changes.filter((c) => 'itemId' in c && c.itemId === 'fees')).toEqual([
      { type: 'remove', itemId: 'fees' },
    ]);
    expect(removedItems(ws, 'apprentice').map((i) => i.id)).toEqual(['fees']);
    ws = revertItem(ws, 'apprentice', 'fees');
    expect(amountOf(ws, 'apprentice', 'fees')).toBe(450);
  });

  it('opening balance overrides follow the same rule', () => {
    let ws = setOpening(sampleWorkspace(), 'slow-year', 50_000);
    expect(resolve(ws, 'slow-year').opening).toBe(50_000);
    ws = setOpening(ws, 'slow-year', 60_000);
    expect(ws.scenarios.find((s) => s.id === 'slow-year')?.changes.some((c) => c.type === 'opening')).toBe(
      false,
    );
  });

  it('reports status for badges', () => {
    const status = itemStatus(sampleWorkspace(), 'bigger-space');
    expect(status.get('rent')).toEqual({ status: 'changed', fields: new Set(['amount']) });
    expect(status.get('club-rental')?.status).toBe('added');
    expect(status.has('wages')).toBe(false);
  });
});

describe('structural changes', () => {
  it('removing a baseline item prunes branch changes that pointed at it', () => {
    const ws = removeItem(sampleWorkspace(), 'base', 'rent');
    const bigger = ws.scenarios.find((s) => s.id === 'bigger-space')!;
    expect(bigger.changes.some((c) => 'itemId' in c && c.itemId === 'rent')).toBe(false);
  });

  it('removing an item added in a parent prunes descendants that changed it', () => {
    let ws = setItemField(sampleWorkspace(), 'bigger-space', 'apprentice-wage', 'amount', 9_000);
    ws = removeItem(ws, 'apprentice', 'apprentice-wage');
    // In "apprentice" the item was added there, so the add change goes away entirely.
    expect(
      ws.scenarios
        .find((s) => s.id === 'apprentice')!
        .changes.some((c) => c.type === 'add' && c.item.id === 'apprentice-wage'),
    ).toBe(false);
    expect(
      ws.scenarios
        .find((s) => s.id === 'bigger-space')!
        .changes.some((c) => 'itemId' in c && c.itemId === 'apprentice-wage'),
    ).toBe(false);
  });

  it('pruneOrphans leaves a consistent workspace untouched', () => {
    const ws = sampleWorkspace();
    expect(pruneOrphans(ws)).toBe(ws);
  });

  it('adds items to the baseline or as a change', () => {
    let ws = addItem(sampleWorkspace(), 'base', extra('grant'));
    expect(ws.items.at(-1)?.id).toBe('grant');
    ws = addItem(ws, 'slow-year', extra('loan'));
    expect(resolve(ws, 'slow-year').items.some((i) => i.id === 'loan')).toBe(true);
    expect(resolve(ws, 'apprentice').items.some((i) => i.id === 'loan')).toBe(false);
    expect(allItemIds(ws).has('loan')).toBe(true);
  });

  it('deleting a scenario deletes its branches; the baseline stays', () => {
    let ws = createScenario(sampleWorkspace(), 'bigger-space', 'deeper', 'Deeper');
    ws = deleteScenario(ws, 'apprentice');
    expect(ws.scenarios.map((s) => s.id)).toEqual(['base', 'slow-year']);
    expect(deleteScenario(ws, 'base')).toBe(ws);
  });
});
