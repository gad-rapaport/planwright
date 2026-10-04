import { useRef, useState } from 'react';
import { findScenario } from '../domain/scenario';
import type { Workspace } from '../domain/types';
import { CADENCE_LABEL } from '../domain/format';
import { toCsv } from '../io/csv';
import { exportWorkspace, MAX_IMPORT_BYTES, parseImport, summarize } from '../io/fileFormat';
import { CURRENT_FORMAT_VERSION } from '../io/schema';
import { monthLabel } from '../domain/months';
import { sampleWorkspace } from '../sample/sample';
import { BASE_ID } from '../domain/types';
import { useStore } from '../state/store';
import { downloadText, fileStamp } from '../ui/download';

export function itemsCsv(ws: Workspace, scenarioName: string, items: Workspace['items']): string {
  const rows = items.map((i) => [
    scenarioName,
    i.name,
    i.kind === 'income' ? 'Income' : 'Expense',
    i.category,
    i.amount,
    CADENCE_LABEL[i.cadence],
    monthLabel(ws.plan.startMonth, i.start),
    i.end === null ? '' : monthLabel(ws.plan.startMonth, i.end),
    i.growth,
  ]);
  return toCsv([
    [
      'Scenario',
      'Line',
      'Type',
      'Category',
      `Amount (${ws.plan.currency})`,
      'Every',
      'From',
      'Until',
      'Growth % per month',
    ],
    ...rows,
  ]);
}

type Pending = { name: string; workspace: Workspace; summary: string; fromVersion: number };

export function DataPage() {
  const { ws, scenarioId, resolved, edit, say, save } = useStore();
  const [pending, setPending] = useState<Pending | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scenario = findScenario(ws, scenarioId)!;

  const onFile = async (file: File) => {
    setPending(null);
    setErrors(null);
    if (file.size > MAX_IMPORT_BYTES)
      return setErrors(['The file is larger than 1 MB, which is far more than any plan needs.']);
    const result = parseImport(await file.text());
    if (!result.ok) return setErrors(result.errors);
    setPending({
      name: file.name,
      workspace: result.workspace,
      summary: result.summary,
      fromVersion: result.fromVersion,
    });
  };

  return (
    <div className="data">
      <section className="sheet" aria-labelledby="data-heading">
        <h1 id="data-heading">Your data</h1>
        <p>
          Plans live only in this browser and are saved automatically.{' '}
          {save.kind === 'error' ? (
            <strong className="warn">{save.reason} Export a copy to keep your work.</strong>
          ) : (
            'Nothing is sent to a server.'
          )}{' '}
          Export a file to move a plan to another device or keep a backup.
        </p>
      </section>

      <section className="sheet" aria-labelledby="export-heading">
        <h2 id="export-heading">Export</h2>
        <div className="toolbar">
          <button
            type="button"
            className="btn"
            onClick={() => {
              downloadText(`planwright-${fileStamp()}.json`, exportWorkspace(ws), 'application/json');
              say('Plan exported as JSON');
            }}
          >
            Plan file (JSON)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              downloadText(
                `planwright-lines-${scenario.id}-${fileStamp()}.csv`,
                itemsCsv(ws, scenario.name, resolved(scenario.id).items),
                'text/csv;charset=utf-8',
              );
              say(`Lines of ${scenario.name} exported as CSV`);
            }}
          >
            Lines of {scenario.name} (CSV)
          </button>
        </div>
        <p className="muted small">
          The plan file contains every scenario and can be imported again (format version{' '}
          {CURRENT_FORMAT_VERSION}). CSV files open in spreadsheet apps; text that a spreadsheet would run as
          a formula is written as plain text.
        </p>
      </section>

      <section className="sheet" aria-labelledby="import-heading">
        <h2 id="import-heading">Import</h2>
        <label className="file-drop">
          <span>Choose a Planwright plan file (.json, up to 1 MB)</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        {errors && (
          <div className="notice notice--error" role="alert">
            <p>
              <strong>This file cannot be imported.</strong>
            </p>
            <ul>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        {pending && (
          <div className="notice" role="status">
            <p>
              <strong>{pending.name}</strong>: {pending.summary}.
              {pending.fromVersion < CURRENT_FORMAT_VERSION &&
                ` Upgraded from format ${pending.fromVersion}.`}
            </p>
            <p>Importing replaces the current plan ({summarize(ws)}). You can undo it.</p>
            <div className="toolbar">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const next = pending.workspace;
                  edit(`Import ${pending.name}`, () => next, { select: BASE_ID });
                  say(`Imported ${pending.name}`);
                  setPending(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Replace current plan
              </button>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => {
                  setPending(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="sheet" aria-labelledby="reset-heading">
        <h2 id="reset-heading">Start again</h2>
        <p>Load the sample plan in place of the current one. You can undo it.</p>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            edit('Load the sample plan', () => sampleWorkspace(), { select: BASE_ID });
            say('Sample plan loaded');
          }}
        >
          Load sample plan
        </button>
      </section>
    </div>
  );
}
