import type { LineItem } from './types';

export interface MonthRow {
  index: number;
  income: number;
  expense: number;
  net: number;
  balance: number;
}

export interface Summary {
  endBalance: number;
  /** Lowest closing balance and its month (index -1 only for an empty plan). */
  lowest: { value: number; index: number };
  /** First month whose closing balance is below zero, or null if the plan never runs out. */
  firstNegative: number | null;
  totalIncome: number;
  totalExpense: number;
  averageNet: number;
}

export interface Projection {
  rows: MonthRow[];
  summary: Summary;
}

/** Value of an item in month `m` (whole units, rounded per month so rows add up exactly). */
export function itemValueAt(item: LineItem, m: number): number {
  if (m < item.start || (item.end !== null && m > item.end)) return 0;
  if (item.growth === 0) return item.amount;
  return Math.round(item.amount * Math.pow(1 + item.growth / 100, m - item.start));
}

/** Month-by-month projection. Pure and allocation-light: called for every scenario on every edit. */
export function project(items: readonly LineItem[], months: number, opening: number): Projection {
  const rows: MonthRow[] = new Array(months);
  let balance = opening;
  let totalIncome = 0;
  let totalExpense = 0;
  let lowest = { value: Number.POSITIVE_INFINITY, index: -1 };
  let firstNegative: number | null = null;
  for (let m = 0; m < months; m++) {
    let income = 0;
    let expense = 0;
    for (const item of items) {
      const v = itemValueAt(item, m);
      if (item.kind === 'income') income += v;
      else expense += v;
    }
    const net = income - expense;
    balance += net;
    totalIncome += income;
    totalExpense += expense;
    if (balance < lowest.value) lowest = { value: balance, index: m };
    if (firstNegative === null && balance < 0) firstNegative = m;
    rows[m] = { index: m, income, expense, net, balance };
  }
  if (lowest.index === -1) lowest = { value: opening, index: -1 };
  return {
    rows,
    summary: {
      endBalance: balance,
      lowest,
      firstNegative,
      totalIncome,
      totalExpense,
      averageNet: months > 0 ? Math.round((totalIncome - totalExpense) / months) : 0,
    },
  };
}
