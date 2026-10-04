import type { Workspace } from '../domain/types';
import { CURRENT_FORMAT_VERSION, fileSchema } from './schema';

export const MAX_IMPORT_BYTES = 1_000_000;

type Doc = Record<string, unknown>;

const isObject = (v: unknown): v is Doc => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Adds `cadence: 'monthly'` to an item that has none (format 1 only had monthly lines). */
function withMonthly(item: unknown): unknown {
  return isObject(item) && !('cadence' in item) ? { ...item, cadence: 'monthly' } : item;
}

/**
 * Upgrades older files step by step: MIGRATIONS[n] turns a version-n document into version n+1. Each step
 * only reshapes what it knows about and leaves validation to the schema, so a damaged old file still gets
 * precise error messages. tests/unit/fixtures holds a real file of every older format.
 */
export const MIGRATIONS: Record<number, (doc: Doc) => Doc> = {
  // 1 -> 2: lines gained a cadence (monthly, quarterly, yearly, once). Every format-1 line was monthly.
  1: (doc) => {
    const ws = doc.workspace;
    if (!isObject(ws)) return doc;
    const items = Array.isArray(ws.items) ? ws.items.map(withMonthly) : ws.items;
    const scenarios = Array.isArray(ws.scenarios)
      ? ws.scenarios.map((s) =>
          isObject(s) && Array.isArray(s.changes)
            ? {
                ...s,
                changes: s.changes.map((c) =>
                  isObject(c) && c.type === 'add' ? { ...c, item: withMonthly(c.item) } : c,
                ),
              }
            : s,
        )
      : ws.scenarios;
    return { ...doc, workspace: { ...ws, items, scenarios } };
  },
};

export type ImportResult =
  { ok: true; workspace: Workspace; fromVersion: number; summary: string } | { ok: false; errors: string[] };

export function exportWorkspace(ws: Workspace, now = new Date()): string {
  const file = {
    format: 'planwright',
    version: CURRENT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    workspace: ws,
  };
  return JSON.stringify(file, null, 2) + '\n';
}

export function summarize(ws: Workspace): string {
  const changes = ws.scenarios.reduce((n, s) => n + s.changes.length, 0);
  return `"${ws.plan.name}": ${ws.scenarios.length} scenario${ws.scenarios.length === 1 ? '' : 's'}, ${ws.items.length} baseline item${ws.items.length === 1 ? '' : 's'}, ${changes} scenario change${changes === 1 ? '' : 's'}, ${ws.plan.months} months`;
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (acc, p) => (typeof p === 'number' ? `${acc}[${p}]` : acc ? `${acc}.${String(p)}` : String(p)),
    '',
  );
}

/** Parses, migrates and validates an imported file. Never throws; errors are written for people. */
export function parseImport(text: string): ImportResult {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
    return { ok: false, errors: ['The file is larger than 1 MB, which is far more than any plan needs.'] };
  }
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This is not a JSON file.'] };
  }
  if (typeof doc !== 'object' || doc === null || (doc as { format?: unknown }).format !== 'planwright') {
    return { ok: false, errors: ['This JSON file was not exported from Planwright.'] };
  }
  const version = (doc as { version?: unknown }).version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, errors: ['The file has no valid format version.'] };
  }
  if (version > CURRENT_FORMAT_VERSION) {
    return {
      ok: false,
      errors: [
        `The file uses format ${version}; this Planwright reads up to format ${CURRENT_FORMAT_VERSION}. Reload to update the app.`,
      ],
    };
  }
  let current = doc as Record<string, unknown>;
  for (let v = version; v < CURRENT_FORMAT_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, errors: [`No upgrade path from format ${v}.`] };
    current = { ...migrate(current), version: v + 1 };
  }
  const parsed = fileSchema.safeParse(current);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .slice(0, 6)
      .map((i) => `${formatPath(i.path) || 'file'}: ${i.message}`);
    if (parsed.error.issues.length > 6)
      errors.push(`...and ${parsed.error.issues.length - 6} more problems.`);
    return { ok: false, errors };
  }
  const workspace = parsed.data.workspace as Workspace;
  return { ok: true, workspace, fromVersion: version, summary: summarize(workspace) };
}
