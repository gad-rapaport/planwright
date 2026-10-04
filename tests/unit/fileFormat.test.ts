import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolve as resolveScenario } from '../../src/domain/scenario';
import { exportWorkspace, MAX_IMPORT_BYTES, parseImport } from '../../src/io/fileFormat';
import { CURRENT_FORMAT_VERSION } from '../../src/io/schema';
import { sampleWorkspace } from '../../src/sample/sample';

const asDoc = () => JSON.parse(exportWorkspace(sampleWorkspace())) as Record<string, any>;
const errorsOf = (doc: unknown) => {
  const r = parseImport(JSON.stringify(doc));
  if (r.ok) throw new Error('expected errors');
  return r.errors;
};

describe('export and import', () => {
  it('round-trips the sample workspace exactly', () => {
    const ws = sampleWorkspace();
    const text = exportWorkspace(ws, new Date('2027-01-04T09:30:00Z'));
    expect(JSON.parse(text)).toMatchObject({
      format: 'planwright',
      version: CURRENT_FORMAT_VERSION,
      exportedAt: '2027-01-04T09:30:00.000Z',
    });
    const r = parseImport(text);
    expect(r.ok && r.workspace).toEqual(ws);
    expect(r.ok && r.summary).toBe(
      '"Riverside Bike Workshop (sample)": 4 scenarios, 10 baseline items, 9 scenario changes, 24 months',
    );
  });

  it('rejects files that are not Planwright JSON', () => {
    expect(parseImport('not json')).toEqual({ ok: false, errors: ['This is not a JSON file.'] });
    expect(errorsOf({ hello: 1 })).toEqual(['This JSON file was not exported from Planwright.']);
    expect(errorsOf(null)).toEqual(['This JSON file was not exported from Planwright.']);
  });

  it('refuses files from a newer format with an actionable message', () => {
    const doc = asDoc();
    doc.version = CURRENT_FORMAT_VERSION + 1;
    expect(errorsOf(doc)[0]).toMatch(/reads up to format 2\. Reload to update/);
    doc.version = 'one';
    expect(errorsOf(doc)).toEqual(['The file has no valid format version.']);
  });

  it('refuses oversized files before parsing', () => {
    const r = parseImport(' '.repeat(MAX_IMPORT_BYTES + 1));
    expect(r.ok).toBe(false);
  });

  it('reports schema problems with readable paths', () => {
    const doc = asDoc();
    doc.workspace.items[0].amount = -5;
    doc.workspace.items[1].name = '';
    doc.workspace.plan.startMonth = '2027-13';
    const errors = errorsOf(doc);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^workspace\.items\[0\]\.amount: /),
        'workspace.items[1].name: must not be empty',
        'workspace.plan.startMonth: must be YYYY-MM',
      ]),
    );
  });

  it('rejects unknown keys, so typos and injected fields do not slip in', () => {
    const doc = asDoc();
    doc.workspace.items[0].__proto__polluted = true;
    doc.workspace.plan.extra = 1;
    expect(errorsOf(doc).length).toBeGreaterThanOrEqual(2);
  });

  it('checks the scenario tree', () => {
    const doc = asDoc();
    doc.workspace.scenarios[1].parentId = 'nowhere';
    doc.workspace.scenarios[2].id = 'apprentice';
    expect(errorsOf(doc)).toEqual(
      expect.arrayContaining([
        'workspace.scenarios[1].parentId: unknown parent',
        'workspace.scenarios[2].id: duplicate id',
      ]),
    );

    const cyc = asDoc();
    cyc.workspace.scenarios[1].parentId = 'bigger-space';
    expect(errorsOf(cyc)).toEqual(expect.arrayContaining(['workspace.scenarios[1].parentId: parent cycle']));

    const noBase = asDoc();
    noBase.workspace.scenarios[0].id = 'root';
    expect(errorsOf(noBase).join(' ')).toMatch(/exactly one baseline/);
  });

  it('validates set-change values against their field', () => {
    const doc = asDoc();
    doc.workspace.scenarios[2].changes[0].value = 'lots';
    expect(errorsOf(doc)).toEqual(['workspace.scenarios[2].changes[0].value: not a valid amount']);
  });

  it('rejects duplicate item ids across baseline and branches, and inverted ranges', () => {
    const doc = asDoc();
    doc.workspace.scenarios[1].changes[0].item.id = 'rent';
    doc.workspace.items[2].end = 0;
    expect(errorsOf(doc)).toEqual(
      expect.arrayContaining([
        'workspace.scenarios[1].changes[0].item.id: duplicate item id',
        'workspace.items[2].end: ends before it starts',
      ]),
    );
  });

  it('caps the number of reported problems', () => {
    const doc = asDoc();
    for (const item of doc.workspace.items) item.amount = -1;
    const errors = errorsOf(doc);
    expect(errors).toHaveLength(7);
    expect(errors.at(-1)).toMatch(/more problems/);
  });
});

describe('format migrations', () => {
  // Exported from the format-1 release of the app (the commit before cadences existed).
  const v1 = readFileSync(new URL('./fixtures/format-1-sample.json', import.meta.url), 'utf8');

  it('upgrades a format-1 file: every line becomes monthly, nothing else changes', () => {
    const r = parseImport(v1);
    if (!r.ok) throw new Error(r.errors.join('; '));
    expect(r.fromVersion).toBe(1);
    const original = JSON.parse(v1).workspace;
    expect(r.workspace.items).toEqual(original.items.map((i: object) => ({ ...i, cadence: 'monthly' })));
    const added = r.workspace.scenarios.flatMap((s) =>
      s.changes.flatMap((c) => (c.type === 'add' ? [c.item] : [])),
    );
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((i) => i.cadence === 'monthly')).toBe(true);
    expect(r.workspace.plan).toEqual(original.plan);
    // The upgraded plan computes exactly as before: monthly lines are what format 1 meant.
    expect(resolveScenario(r.workspace, 'bigger-space').opening).toBe(35_000);
  });

  it('still reports precise errors for a damaged old file', () => {
    const doc = JSON.parse(v1);
    doc.workspace.items[0].amount = 'lots';
    expect(errorsOf(doc)).toEqual([expect.stringMatching(/^workspace\.items\[0\]\.amount: /)]);
  });

  it('re-exports an upgraded file in the current format', () => {
    const r = parseImport(v1);
    if (!r.ok) throw new Error('expected ok');
    expect(JSON.parse(exportWorkspace(r.workspace)).version).toBe(CURRENT_FORMAT_VERSION);
  });
});
