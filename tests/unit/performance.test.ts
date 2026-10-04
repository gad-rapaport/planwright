import { describe, expect, it } from 'vitest';
import { project } from '../../src/domain/engine';
import { createScenario, resolve, setItemField } from '../../src/domain/scenario';
import { LIMITS, type LineItem, type Workspace } from '../../src/domain/types';
import { niceTicks, spreadLabels } from '../../src/ui/BalanceChart';

/** The largest plan the limits allow: every edit recomputes all of this, so it must stay well under a frame. */
function largest(): Workspace {
  const items: LineItem[] = Array.from({ length: LIMITS.items }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    kind: i % 3 === 0 ? 'income' : 'expense',
    category: '',
    amount: 1000 + i,
    start: i % 12,
    end: null,
    growth: (i % 5) / 10,
  }));
  let ws: Workspace = {
    plan: { name: 'Large', currency: 'EUR', startMonth: '2027-01', months: LIMITS.months, openingBalance: 0 },
    items,
    scenarios: [{ id: 'base', name: 'Baseline', parentId: null, notes: '', changes: [] }],
  };
  for (let s = 1; s < LIMITS.scenarios; s++) {
    ws = createScenario(ws, s === 1 ? 'base' : `s${s - 1}`, `s${s}`, `S${s}`);
    for (let k = 0; k < 20; k++)
      ws = setItemField(ws, `s${s}`, `item-${(s * 37 + k) % LIMITS.items}`, 'amount', 500 + k);
  }
  return ws;
}

describe('performance budget', () => {
  it('resolves and projects every scenario of the largest plan quickly', () => {
    const ws = largest();
    // Warm up the JIT, then measure the best of several runs to keep the test stable on busy CI machines.
    const run = () => ws.scenarios.map((s) => project(resolve(ws, s.id).items, ws.plan.months, 0));
    run();
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      run();
      best = Math.min(best, performance.now() - t0);
    }
    expect(best).toBeLessThan(50);
  });
});

describe('chart helpers', () => {
  it('makes round ticks that include zero and cover the range', () => {
    expect(niceTicks(-140_000, 90_000, 6)).toEqual([-150_000, -100_000, -50_000, 0, 50_000, 100_000]);
    expect(niceTicks(0, 0)).toEqual([-1, -0.5, 0, 0.5, 1]);
  });

  it('spreads labels apart without changing their order', () => {
    expect(spreadLabels([100, 102, 300], 18, 0, 400)).toEqual([100, 118, 300]);
    expect(spreadLabels([395, 398], 18, 0, 400)).toEqual([382, 400]);
  });
});
