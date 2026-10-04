import {
  BASE_ID,
  type Change,
  type EditableField,
  type LineItem,
  type Scenario,
  type Workspace,
} from './types';

export interface Resolved {
  items: LineItem[];
  opening: number;
}

export function findScenario(ws: Workspace, id: string): Scenario | undefined {
  return ws.scenarios.find((s) => s.id === id);
}

/** Root-first chain of scenarios ending with `id`. */
export function lineage(ws: Workspace, id: string): Scenario[] {
  const chain: Scenario[] = [];
  const seen = new Set<string>();
  let current = findScenario(ws, id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId === null ? undefined : findScenario(ws, current.parentId);
  }
  return chain;
}

function applyChanges(base: Resolved, changes: readonly Change[]): Resolved {
  let items = base.items;
  let opening = base.opening;
  for (const change of changes) {
    switch (change.type) {
      case 'add':
        items = [...items, change.item];
        break;
      case 'remove':
        items = items.filter((i) => i.id !== change.itemId);
        break;
      case 'set':
        // A change for an item that no longer exists upstream is ignored rather than failing the plan.
        items = items.map((i) => (i.id === change.itemId ? { ...i, [change.field]: change.value } : i));
        break;
      case 'opening':
        opening = change.value;
        break;
    }
  }
  return { items, opening };
}

/** The full item list and opening balance a scenario sees: baseline plus every change along its lineage. */
export function resolve(ws: Workspace, id: string): Resolved {
  let result: Resolved = { items: ws.items, opening: ws.plan.openingBalance };
  for (const s of lineage(ws, id)) result = applyChanges(result, s.changes);
  return result;
}

function parentResolved(ws: Workspace, scenario: Scenario): Resolved {
  return scenario.parentId === null
    ? { items: ws.items, opening: ws.plan.openingBalance }
    : resolve(ws, scenario.parentId);
}

function updateScenario(ws: Workspace, id: string, fn: (s: Scenario) => Scenario): Workspace {
  return { ...ws, scenarios: ws.scenarios.map((s) => (s.id === id ? fn(s) : s)) };
}

/** Drops changes that point at items their parent no longer has, top-down so removals cascade. */
export function pruneOrphans(ws: Workspace): Workspace {
  let next = ws;
  const ordered = [...ws.scenarios].sort((a, b) => lineage(ws, a.id).length - lineage(ws, b.id).length);
  for (const s of ordered) {
    if (s.parentId === null) continue;
    const current = findScenario(next, s.id);
    if (!current) continue;
    const available = new Set(parentResolved(next, current).items.map((i) => i.id));
    for (const c of current.changes) if (c.type === 'add') available.add(c.item.id);
    const kept = current.changes.filter((c) =>
      c.type === 'set' || c.type === 'remove' ? available.has(c.itemId) : true,
    );
    if (kept.length !== current.changes.length)
      next = updateScenario(next, s.id, (x) => ({ ...x, changes: kept }));
  }
  return next;
}

function addedHere(scenario: Scenario, itemId: string): boolean {
  return scenario.changes.some((c) => c.type === 'add' && c.item.id === itemId);
}

export function setItemField<K extends EditableField>(
  ws: Workspace,
  scenarioId: string,
  itemId: string,
  field: K,
  value: LineItem[K],
): Workspace {
  const scenario = findScenario(ws, scenarioId);
  if (!scenario) return ws;
  if (scenario.parentId === null) {
    return { ...ws, items: ws.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) };
  }
  if (addedHere(scenario, itemId)) {
    return updateScenario(ws, scenarioId, (s) => ({
      ...s,
      changes: s.changes.map((c) =>
        c.type === 'add' && c.item.id === itemId ? { ...c, item: { ...c.item, [field]: value } } : c,
      ),
    }));
  }
  const inherited = parentResolved(ws, scenario).items.find((i) => i.id === itemId);
  if (!inherited) return ws;
  const others = scenario.changes.filter(
    (c) => !(c.type === 'set' && c.itemId === itemId && c.field === field),
  );
  // Setting a value back to the parent's value removes the override instead of storing a no-op.
  const changes =
    inherited[field] === value ? others : [...others, { type: 'set', itemId, field, value } as Change];
  return updateScenario(ws, scenarioId, (s) => ({ ...s, changes }));
}

export function addItem(ws: Workspace, scenarioId: string, item: LineItem): Workspace {
  const scenario = findScenario(ws, scenarioId);
  if (!scenario) return ws;
  if (scenario.parentId === null) return { ...ws, items: [...ws.items, item] };
  return updateScenario(ws, scenarioId, (s) => ({ ...s, changes: [...s.changes, { type: 'add', item }] }));
}

export function removeItem(ws: Workspace, scenarioId: string, itemId: string): Workspace {
  const scenario = findScenario(ws, scenarioId);
  if (!scenario) return ws;
  if (scenario.parentId === null)
    return pruneOrphans({ ...ws, items: ws.items.filter((i) => i.id !== itemId) });
  if (addedHere(scenario, itemId)) {
    const next = updateScenario(ws, scenarioId, (s) => ({
      ...s,
      changes: s.changes.filter((c) => !(c.type === 'add' && c.item.id === itemId)),
    }));
    return pruneOrphans(next);
  }
  const next = updateScenario(ws, scenarioId, (s) => ({
    ...s,
    changes: [
      ...s.changes.filter((c) => !((c.type === 'set' || c.type === 'remove') && c.itemId === itemId)),
      { type: 'remove', itemId },
    ],
  }));
  return pruneOrphans(next);
}

/** Removes this scenario's overrides of an inherited item (set and remove changes). */
export function revertItem(ws: Workspace, scenarioId: string, itemId: string): Workspace {
  const next = updateScenario(ws, scenarioId, (s) => ({
    ...s,
    changes: s.changes.filter((c) => !((c.type === 'set' || c.type === 'remove') && c.itemId === itemId)),
  }));
  return pruneOrphans(next);
}

export function setOpening(ws: Workspace, scenarioId: string, value: number): Workspace {
  const scenario = findScenario(ws, scenarioId);
  if (!scenario) return ws;
  if (scenario.parentId === null) return { ...ws, plan: { ...ws.plan, openingBalance: value } };
  const others = scenario.changes.filter((c) => c.type !== 'opening');
  const changes =
    parentResolved(ws, scenario).opening === value
      ? others
      : [...others, { type: 'opening', value } as Change];
  return updateScenario(ws, scenarioId, (s) => ({ ...s, changes }));
}

export function createScenario(ws: Workspace, parentId: string, id: string, name: string): Workspace {
  if (!findScenario(ws, parentId)) return ws;
  return { ...ws, scenarios: [...ws.scenarios, { id, name, parentId, notes: '', changes: [] }] };
}

export function descendants(ws: Workspace, id: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    for (const s of ws.scenarios) {
      if (s.parentId === pid) {
        out.push(s.id);
        walk(s.id);
      }
    }
  };
  walk(id);
  return out;
}

/** Deletes a branch and everything branched from it. The baseline cannot be deleted. */
export function deleteScenario(ws: Workspace, id: string): Workspace {
  if (id === BASE_ID) return ws;
  const gone = new Set([id, ...descendants(ws, id)]);
  return { ...ws, scenarios: ws.scenarios.filter((s) => !gone.has(s.id)) };
}

export function renameScenario(ws: Workspace, id: string, name: string): Workspace {
  return updateScenario(ws, id, (s) => ({ ...s, name }));
}

export function setNotes(ws: Workspace, id: string, notes: string): Workspace {
  return updateScenario(ws, id, (s) => ({ ...s, notes }));
}

export type ItemStatus = 'inherited' | 'changed' | 'added';

/** How each item in a scenario relates to its parent, for badges in the editor. */
export function itemStatus(
  ws: Workspace,
  scenarioId: string,
): Map<string, { status: ItemStatus; fields: Set<EditableField> }> {
  const out = new Map<string, { status: ItemStatus; fields: Set<EditableField> }>();
  const scenario = findScenario(ws, scenarioId);
  if (!scenario || scenario.parentId === null) return out;
  for (const c of scenario.changes) {
    if (c.type === 'add') out.set(c.item.id, { status: 'added', fields: new Set() });
    if (c.type === 'set' && !out.has(c.itemId))
      out.set(c.itemId, { status: 'changed', fields: new Set([c.field]) });
    else if (c.type === 'set') out.get(c.itemId)?.fields.add(c.field);
  }
  return out;
}

/** Items the parent has and this scenario removed. */
export function removedItems(ws: Workspace, scenarioId: string): LineItem[] {
  const scenario = findScenario(ws, scenarioId);
  if (!scenario || scenario.parentId === null) return [];
  const removed = new Set(scenario.changes.flatMap((c) => (c.type === 'remove' ? [c.itemId] : [])));
  return parentResolved(ws, scenario).items.filter((i) => removed.has(i.id));
}

export function parentOf(ws: Workspace, scenarioId: string): Scenario | undefined {
  const s = findScenario(ws, scenarioId);
  return s?.parentId ? findScenario(ws, s.parentId) : undefined;
}

/** Every item id used anywhere in the workspace, so new ids never collide across branches. */
export function allItemIds(ws: Workspace): Set<string> {
  const ids = new Set(ws.items.map((i) => i.id));
  for (const s of ws.scenarios) for (const c of s.changes) if (c.type === 'add') ids.add(c.item.id);
  return ids;
}
