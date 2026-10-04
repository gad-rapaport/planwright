import { describe, expect, it } from 'vitest';
import { itemValueAt, project } from '../../src/domain/engine';
import type { LineItem } from '../../src/domain/types';

const item = (over: Partial<LineItem>): LineItem => ({
  id: 'x',
  name: 'X',
  kind: 'expense',
  category: '',
  amount: 100,
  start: 0,
  end: null,
  growth: 0,
  ...over,
});

describe('itemValueAt', () => {
  it('is zero outside the item range, inclusive at both ends', () => {
    const it2 = item({ start: 2, end: 4 });
    expect([0, 1, 2, 3, 4, 5].map((m) => itemValueAt(it2, m))).toEqual([0, 0, 100, 100, 100, 0]);
  });

  it('compounds growth from the first month and rounds per month', () => {
    const grow = item({ amount: 1000, growth: 10, start: 1 });
    expect([1, 2, 3].map((m) => itemValueAt(grow, m))).toEqual([1000, 1100, 1210]);
    expect(itemValueAt(item({ amount: 333, growth: 1.5 }), 1)).toBe(338);
  });

  it('handles shrinking lines', () => {
    expect(itemValueAt(item({ amount: 1000, growth: -50 }), 2)).toBe(250);
  });
});

describe('project', () => {
  it('builds balances month by month and summarises them', () => {
    const p = project(
      [item({ kind: 'income', amount: 500 }), item({ id: 'rent', amount: 800, start: 1, end: 2 })],
      4,
      1000,
    );
    expect(p.rows.map((r) => r.net)).toEqual([500, -300, -300, 500]);
    expect(p.rows.map((r) => r.balance)).toEqual([1500, 1200, 900, 1400]);
    expect(p.summary).toEqual({
      endBalance: 1400,
      lowest: { value: 900, index: 2 },
      firstNegative: null,
      totalIncome: 2000,
      totalExpense: 1600,
      averageNet: 100,
    });
  });

  it('reports the first month the balance goes below zero', () => {
    const p = project([item({ amount: 400 })], 6, 1000);
    expect(p.summary.firstNegative).toBe(2);
    expect(p.summary.lowest).toEqual({ value: -1400, index: 5 });
  });

  it('treats a balance of exactly zero as not run out', () => {
    expect(project([item({ amount: 500 })], 2, 1000).summary.firstNegative).toBeNull();
  });

  it('returns an empty projection for an empty plan', () => {
    const p = project([], 0, 250);
    expect(p.rows).toEqual([]);
    expect(p.summary.endBalance).toBe(250);
    expect(p.summary.lowest).toEqual({ value: 250, index: -1 });
    expect(p.summary.averageNet).toBe(0);
  });
});
