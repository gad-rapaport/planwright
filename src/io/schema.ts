import { z } from 'zod';
import { isMonth } from '../domain/months';
import { BASE_ID, CADENCES, CURRENCIES, LIMITS } from '../domain/types';

const id = z.string().regex(/^[a-z0-9-]{1,40}$/, 'must be 1-40 lowercase letters, digits or dashes');
const name = z.string().trim().min(1, 'must not be empty').max(LIMITS.name);
const amount = z.number().int('must be a whole number').min(0).max(LIMITS.amount);
const offset = z
  .number()
  .int()
  .min(0)
  .max(LIMITS.months - 1);
const growth = z.number().min(-LIMITS.growth).max(LIMITS.growth);

export const lineItemSchema = z.strictObject({
  id,
  name,
  kind: z.enum(['income', 'expense']),
  category: z.string().trim().max(40),
  amount,
  cadence: z.enum(CADENCES),
  start: offset,
  end: offset.nullable(),
  growth,
});

const fieldValue = {
  name,
  kind: z.enum(['income', 'expense']),
  category: z.string().trim().max(40),
  amount,
  cadence: z.enum(CADENCES),
  start: offset,
  end: offset.nullable(),
  growth,
} as const;

const changeSchema = z
  .discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('set'),
      itemId: id,
      field: z.enum(['name', 'kind', 'category', 'amount', 'cadence', 'start', 'end', 'growth']),
      value: z.union([z.string(), z.number(), z.null()]),
    }),
    z.strictObject({ type: z.literal('add'), item: lineItemSchema }),
    z.strictObject({ type: z.literal('remove'), itemId: id }),
    z.strictObject({
      type: z.literal('opening'),
      value: z.number().int().min(-LIMITS.amount).max(LIMITS.amount),
    }),
  ])
  .superRefine((change, ctx) => {
    if (change.type !== 'set') return;
    const result = fieldValue[change.field].safeParse(change.value);
    if (!result.success) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: `not a valid ${change.field}` });
    }
  });

const scenarioSchema = z.strictObject({
  id,
  name,
  parentId: id.nullable(),
  notes: z.string().max(LIMITS.notes),
  changes: z.array(changeSchema).max(LIMITS.items * 4),
});

export const planSchema = z.strictObject({
  name,
  currency: z.enum(CURRENCIES),
  startMonth: z.string().refine(isMonth, 'must be YYYY-MM'),
  months: z.number().int().min(1).max(LIMITS.months),
  openingBalance: z.number().int().min(-LIMITS.amount).max(LIMITS.amount),
});

export const workspaceSchema = z
  .strictObject({
    plan: planSchema,
    items: z.array(lineItemSchema).max(LIMITS.items),
    scenarios: z.array(scenarioSchema).min(1).max(LIMITS.scenarios),
  })
  .superRefine((ws, ctx) => {
    const ids = new Set<string>();
    ws.scenarios.forEach((s, i) => {
      if (ids.has(s.id))
        ctx.addIssue({ code: 'custom', path: ['scenarios', i, 'id'], message: 'duplicate id' });
      ids.add(s.id);
    });
    const roots = ws.scenarios.filter((s) => s.parentId === null);
    if (roots.length !== 1 || roots[0]?.id !== BASE_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['scenarios'],
        message: `exactly one baseline with id "${BASE_ID}"`,
      });
    }
    const byId = new Map(ws.scenarios.map((s) => [s.id, s]));
    ws.scenarios.forEach((s, i) => {
      if (s.id === BASE_ID && s.changes.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenarios', i, 'changes'],
          message: 'the baseline has no changes',
        });
      }
      if (s.parentId !== null && !byId.has(s.parentId)) {
        ctx.addIssue({ code: 'custom', path: ['scenarios', i, 'parentId'], message: 'unknown parent' });
      }
      // Walk up; a cycle never reaches the baseline.
      const seen = new Set<string>();
      let cur: string | null = s.id;
      while (cur !== null && !seen.has(cur)) {
        seen.add(cur);
        cur = byId.get(cur)?.parentId ?? null;
      }
      if (cur !== null)
        ctx.addIssue({ code: 'custom', path: ['scenarios', i, 'parentId'], message: 'parent cycle' });
    });
    const itemIds = new Set<string>();
    const noteItem = (itemId: string, path: (string | number)[]) => {
      if (itemIds.has(itemId)) ctx.addIssue({ code: 'custom', path, message: 'duplicate item id' });
      itemIds.add(itemId);
    };
    ws.items.forEach((it, i) => noteItem(it.id, ['items', i, 'id']));
    ws.scenarios.forEach((s, si) =>
      s.changes.forEach((c, ci) => {
        if (c.type === 'add') noteItem(c.item.id, ['scenarios', si, 'changes', ci, 'item', 'id']);
      }),
    );
    const checkRange = (it: { start: number; end: number | null }, path: (string | number)[]) => {
      if (it.end !== null && it.end < it.start)
        ctx.addIssue({ code: 'custom', path: [...path, 'end'], message: 'ends before it starts' });
    };
    ws.items.forEach((it, i) => checkRange(it, ['items', i]));
  });

export const CURRENT_FORMAT_VERSION = 2;

export const fileSchema = z.strictObject({
  format: z.literal('planwright'),
  version: z.literal(CURRENT_FORMAT_VERSION),
  exportedAt: z.string().max(40),
  workspace: workspaceSchema,
});

export type PlanwrightFile = z.infer<typeof fileSchema>;
