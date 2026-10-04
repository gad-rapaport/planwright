import type { LineItem, Workspace } from '../domain/types';

/**
 * Sample plan for a fictional community bike workshop. Every name and figure is invented for the demo.
 * Built by a function so each load gets fresh objects.
 */
export function sampleWorkspace(): Workspace {
  const item = (
    id: string,
    name: string,
    kind: LineItem['kind'],
    category: string,
    amount: number,
    extra: Partial<Pick<LineItem, 'start' | 'end' | 'growth'>> = {},
  ): LineItem => ({ id, name, kind, category, amount, start: 0, end: null, growth: 0, ...extra });

  return {
    plan: {
      name: 'Riverside Bike Workshop (sample)',
      currency: 'ILS',
      startMonth: '2027-01',
      months: 24,
      openingBalance: 60_000,
    },
    items: [
      item('repairs', 'Repairs and servicing', 'income', 'Sales', 26_000, { growth: 1 }),
      item('memberships', 'Memberships', 'income', 'Sales', 3_600, { growth: 2 }),
      item('school-workshops', 'Workshops for schools', 'income', 'Programmes', 4_500, { start: 2 }),
      item('rent', 'Workshop rent', 'expense', 'Premises', 7_800),
      item('wages', "Mechanics' wages", 'expense', 'People', 21_000),
      item('parts', 'Parts and stock', 'expense', 'Stock', 4_200, { growth: 1 }),
      item('utilities', 'Utilities', 'expense', 'Premises', 1_100),
      item('insurance', 'Insurance and accounting', 'expense', 'Admin', 1_600),
      item('fees', 'Software and card fees', 'expense', 'Admin', 450),
    ],
    scenarios: [
      {
        id: 'base',
        name: 'Baseline',
        parentId: null,
        notes: 'Current setup: two mechanics, existing space.',
        changes: [],
      },
      {
        id: 'apprentice',
        name: 'Hire an apprentice',
        parentId: 'base',
        notes: 'An apprentice from April adds repair capacity from May.',
        changes: [
          {
            type: 'add',
            item: item('apprentice-wage', 'Apprentice wage', 'expense', 'People', 7_500, { start: 3 }),
          },
          {
            type: 'add',
            item: item('extra-capacity', 'Extra repair capacity', 'income', 'Sales', 6_500, {
              start: 4,
              growth: 1.5,
            }),
          },
        ],
      },
      {
        id: 'slow-year',
        name: 'Slow first year',
        parentId: 'base',
        notes: 'Fewer repairs, slower growth, no school programme.',
        changes: [
          { type: 'set', itemId: 'repairs', field: 'amount', value: 23_000 },
          { type: 'set', itemId: 'repairs', field: 'growth', value: 0.3 },
          { type: 'remove', itemId: 'school-workshops' },
        ],
      },
      {
        id: 'bigger-space',
        name: 'Apprentice + bigger space',
        parentId: 'apprentice',
        notes: 'Move to a larger unit; moving costs come out of the opening balance.',
        changes: [
          { type: 'set', itemId: 'rent', field: 'amount', value: 11_500 },
          { type: 'opening', value: 35_000 },
          {
            type: 'add',
            item: item('club-rental', 'Space rental to clubs', 'income', 'Programmes', 1_800, { start: 6 }),
          },
        ],
      },
    ],
  };
}
