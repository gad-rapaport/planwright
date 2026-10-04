export const CURRENCIES = ['ILS', 'EUR', 'USD', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Kind = 'income' | 'expense';

export const CADENCES = ['monthly', 'quarterly', 'yearly', 'once'] as const;
export type Cadence = (typeof CADENCES)[number];

/**
 * One line of the plan. `amount` is whole currency units per occurrence; `cadence` says how often it occurs,
 * counted from `start`. `start` and `end` are month offsets from the plan start (inclusive), `end: null` runs
 * to the end of the plan. `growth` is percent per month, compounded from the item's first month.
 */
export interface LineItem {
  id: string;
  name: string;
  kind: Kind;
  category: string;
  amount: number;
  cadence: Cadence;
  start: number;
  end: number | null;
  growth: number;
}

export type EditableField = Exclude<keyof LineItem, 'id'>;

export interface Plan {
  name: string;
  currency: Currency;
  /** First month of the plan, 'YYYY-MM'. */
  startMonth: string;
  /** Number of months projected (1-60). */
  months: number;
  openingBalance: number;
}

/** A scenario stores only its differences from its parent, so edits to the parent flow into every branch. */
export type Change =
  | { [K in EditableField]: { type: 'set'; itemId: string; field: K; value: LineItem[K] } }[EditableField]
  | { type: 'add'; item: LineItem }
  | { type: 'remove'; itemId: string }
  | { type: 'opening'; value: number };

export interface Scenario {
  id: string;
  name: string;
  /** null only for the baseline, which always has id `base` and no changes. */
  parentId: string | null;
  notes: string;
  changes: Change[];
}

export interface Workspace {
  plan: Plan;
  /** Baseline items. */
  items: LineItem[];
  scenarios: Scenario[];
}

export const BASE_ID = 'base';

export const LIMITS = {
  scenarios: 8,
  items: 400,
  months: 60,
  name: 80,
  notes: 500,
  amount: 1_000_000_000,
  growth: 50,
} as const;
