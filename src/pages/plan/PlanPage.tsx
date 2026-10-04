import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { money, signedMoney } from '../../domain/format';
import { monthLabel } from '../../domain/months';
import {
  createScenario,
  deleteScenario,
  descendants,
  findScenario,
  parentOf,
  removedItems,
  renameScenario,
  revertItem,
  setNotes,
  setOpening,
} from '../../domain/scenario';
import { slugId } from '../../domain/ids';
import { BASE_ID, CURRENCIES, LIMITS, type Currency } from '../../domain/types';
import { useStore } from '../../state/store';
import { NumberField, SelectField, TextField } from '../../ui/fields';
import { scenarioIndex, seriesVar } from '../../ui/colors';
import { ItemsTable } from './ItemsTable';
import type { Summary } from '../../domain/engine';

export function PlanPage() {
  const { ws, scenarioId, resolved, projection, edit } = useStore();
  const scenario = findScenario(ws, scenarioId) ?? ws.scenarios[0]!;
  const parent = parentOf(ws, scenario.id);
  const { items, opening } = resolved(scenario.id);
  const summary = projection(scenario.id).summary;
  const parentSummary = parent ? projection(parent.id).summary : null;
  const removed = removedItems(ws, scenario.id);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Moving to another scenario moves focus to its heading, so keyboard and screen reader users land in context.
  const previous = useRef(scenario.id);
  useEffect(() => {
    if (previous.current !== scenario.id) headingRef.current?.focus();
    previous.current = scenario.id;
  }, [scenario.id]);

  return (
    <div className="plan">
      <section
        className="sheet sheet--scenario"
        aria-labelledby="scenario-heading"
        style={{ '--tab': seriesVar(scenarioIndex(ws, scenario.id)) } as CSSProperties}
      >
        <div className="scenario-head">
          <div>
            <p className="eyebrow">{parent ? `Branch of ${parent.name}` : 'Baseline'}</p>
            <h1 id="scenario-heading" ref={headingRef} tabIndex={-1}>
              {scenario.name}
            </h1>
          </div>
          <ScenarioActions />
        </div>
        <div className="scenario-fields">
          <TextField
            label="Scenario name"
            value={scenario.name}
            maxLength={LIMITS.name}
            onCommit={(v) =>
              edit(`Rename scenario to ${v}`, (w) => renameScenario(w, scenario.id, v), {
                coalesce: `rename:${scenario.id}`,
              })
            }
          />
          <TextField
            label="Notes"
            value={scenario.notes}
            maxLength={LIMITS.notes}
            multiline
            required={false}
            onCommit={(v) =>
              edit(`Edit notes of ${scenario.name}`, (w) => setNotes(w, scenario.id, v), {
                coalesce: `notes:${scenario.id}`,
              })
            }
          />
          <NumberField
            label={`Opening balance (${ws.plan.currency})`}
            value={opening}
            min={-LIMITS.amount}
            max={LIMITS.amount}
            step={1000}
            changed={scenario.changes.some((c) => c.type === 'opening')}
            onCommit={(v) =>
              edit(`Change opening balance of ${scenario.name}`, (w) => setOpening(w, scenario.id, v), {
                coalesce: `opening:${scenario.id}`,
              })
            }
          />
        </div>
        <SummaryStrip summary={summary} parentSummary={parentSummary} parentName={parent?.name ?? null} />
      </section>

      {scenario.id === BASE_ID && <PlanSettings />}

      <ItemsTable kind="income" items={items.filter((i) => i.kind === 'income')} />
      <ItemsTable kind="expense" items={items.filter((i) => i.kind === 'expense')} />

      {removed.length > 0 && (
        <section className="sheet" aria-labelledby="removed-heading">
          <h2 id="removed-heading">Removed in this scenario</h2>
          <ul className="removed">
            {removed.map((item) => (
              <li key={item.id}>
                <span>
                  {item.name}{' '}
                  <span className="muted">({money(item.amount, ws.plan.currency)} per month)</span>
                </span>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => edit(`Restore ${item.name}`, (w) => revertItem(w, scenario.id, item.id))}
                >
                  Restore<span className="visually-hidden"> {item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SummaryStrip({
  summary,
  parentSummary,
  parentName,
}: {
  summary: Summary;
  parentSummary: Summary | null;
  parentName: string | null;
}) {
  const { ws } = useStore();
  const { currency, startMonth, months } = ws.plan;
  const delta = (a: number, b: number | undefined) =>
    parentSummary && b !== undefined && a !== b ? (
      <span className={`delta ${a > b ? 'delta--up' : 'delta--down'}`}>
        {signedMoney(a - b, currency)} vs {parentName}
      </span>
    ) : null;
  return (
    <dl className="summary">
      <div>
        <dt>Balance at the end</dt>
        <dd>
          <strong>{money(summary.endBalance, currency)}</strong>
          <span className="muted"> in {monthLabel(startMonth, months - 1)}</span>
          {delta(summary.endBalance, parentSummary?.endBalance)}
        </dd>
      </div>
      <div>
        <dt>Lowest balance</dt>
        <dd>
          <strong>{money(summary.lowest.value, currency)}</strong>
          {summary.lowest.index >= 0 && (
            <span className="muted"> in {monthLabel(startMonth, summary.lowest.index)}</span>
          )}
          {delta(summary.lowest.value, parentSummary?.lowest.value)}
        </dd>
      </div>
      <div>
        <dt>Cash lasts</dt>
        <dd>
          {summary.firstNegative === null ? (
            <strong>The whole plan</strong>
          ) : (
            <strong className="warn">
              <span aria-hidden="true">! </span>Runs out in {monthLabel(startMonth, summary.firstNegative)}
            </strong>
          )}
        </dd>
      </div>
      <div>
        <dt>Average month</dt>
        <dd>
          <strong>{signedMoney(summary.averageNet, currency)}</strong>
          {delta(summary.averageNet, parentSummary?.averageNet)}
        </dd>
      </div>
    </dl>
  );
}

function ScenarioActions() {
  const { ws, scenarioId, edit, say } = useStore();
  const scenario = findScenario(ws, scenarioId)!;
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (naming) inputRef.current?.focus();
  }, [naming]);
  const full = ws.scenarios.length >= LIMITS.scenarios;
  const below = descendants(ws, scenario.id).length;

  return (
    <div className="scenario-actions">
      {naming ? (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = name.trim().replace(/\s+/g, ' ');
            if (!clean) return;
            const id = slugId(clean, new Set(ws.scenarios.map((s) => s.id)), 'scenario');
            edit(`Branch ${clean} from ${scenario.name}`, (w) => createScenario(w, scenario.id, id, clean), {
              select: id,
            });
            setNaming(false);
            setName('');
          }}
        >
          <label>
            <span className="visually-hidden">Name of the new branch</span>
            <input
              ref={inputRef}
              value={name}
              maxLength={LIMITS.name}
              placeholder="Name of the new branch"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setNaming(false)}
            />
          </label>
          <button type="submit" className="btn">
            Create
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setNaming(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn"
          disabled={full}
          onClick={() => setNaming(true)}
          aria-describedby={full ? 'branch-limit' : undefined}
        >
          Branch from here
        </button>
      )}
      {full && (
        <span id="branch-limit" className="muted small">
          Up to {LIMITS.scenarios} scenarios
        </span>
      )}
      {scenario.id !== BASE_ID && (
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            edit(`Delete ${scenario.name}`, (w) => deleteScenario(w, scenario.id), {
              select: scenario.parentId ?? BASE_ID,
            });
            say(
              `Deleted ${scenario.name}${below ? ` and ${below} branch${below === 1 ? '' : 'es'} under it` : ''}.`,
            );
          }}
        >
          Delete scenario
        </button>
      )}
    </div>
  );
}

function PlanSettings() {
  const { ws, edit } = useStore();
  const { plan } = ws;
  return (
    <details className="sheet settings">
      <summary>
        <h2>Plan settings</h2>
        <span className="muted">
          {plan.name} · {monthLabel(plan.startMonth, 0)} to {monthLabel(plan.startMonth, plan.months - 1)} ·{' '}
          {plan.currency}
        </span>
      </summary>
      <div className="settings__grid">
        <TextField
          label="Plan name"
          value={plan.name}
          maxLength={LIMITS.name}
          onCommit={(v) =>
            edit('Rename plan', (w) => ({ ...w, plan: { ...w.plan, name: v } }), { coalesce: 'plan:name' })
          }
        />
        <SelectField<Currency>
          label="Currency"
          value={plan.currency}
          options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          onCommit={(v) =>
            edit(`Change currency to ${v}`, (w) => ({ ...w, plan: { ...w.plan, currency: v } }))
          }
        />
        <StartMonthField />
        <NumberField
          label="Months in the plan"
          value={plan.months}
          min={1}
          max={LIMITS.months}
          onCommit={(v) =>
            edit(`Change plan length to ${v} months`, (w) => ({ ...w, plan: { ...w.plan, months: v } }), {
              coalesce: 'plan:months',
            })
          }
        />
      </div>
    </details>
  );
}

function StartMonthField() {
  const { ws, edit } = useStore();
  const [year, month] = ws.plan.startMonth.split('-').map(Number) as [number, number];
  const set = (y: number, m: number) => {
    const value = `${y}-${String(m).padStart(2, '0')}`;
    edit('Change start month', (w) => ({ ...w, plan: { ...w.plan, startMonth: value } }));
  };
  return (
    <fieldset className="field field--group">
      <legend>First month</legend>
      <MonthPicker year={year} month={month} onChange={set} />
    </fieldset>
  );
}

function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (y: number, m: number) => void;
}) {
  const names = Array.from({ length: 12 }, (_, i) =>
    monthLabel(`2000-${String(i + 1).padStart(2, '0')}`, 0).slice(0, 3),
  );
  return (
    <span className="month-picker">
      <SelectField
        label="Month"
        value={String(month)}
        options={names.map((n, i) => ({ value: String(i + 1), label: n }))}
        onCommit={(v) => onChange(year, Number(v))}
      />
      <NumberField label="Year" value={year} min={2000} max={2100} onCommit={(v) => onChange(v, month)} />
    </span>
  );
}
