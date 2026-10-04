import { Link } from 'react-router';
import { CADENCE_LABEL, money, perCadence } from '../domain/format';
import { monthLabel } from '../domain/months';
import { parentOf, resolve } from '../domain/scenario';
import type { Scenario, Workspace } from '../domain/types';
import { useStore } from '../state/store';
import { BalanceChart } from '../ui/BalanceChart';
import { scenarioIndex } from '../ui/colors';
import { MetricsTable, MonthlyTable, useCompared } from './ComparePage';

/** Plain-language list of what a scenario changes relative to its parent. */
export function describeChanges(ws: Workspace, scenario: Scenario): string[] {
  const parent = parentOf(ws, scenario.id);
  if (!parent) return [];
  const before = resolve(ws, parent.id);
  const name = (id: string) => before.items.find((i) => i.id === id)?.name ?? id;
  const { currency, startMonth } = ws.plan;
  const show = (field: string, v: unknown) =>
    field === 'amount'
      ? money(Number(v), currency)
      : field === 'cadence'
        ? CADENCE_LABEL[v as keyof typeof CADENCE_LABEL].toLowerCase()
        : field === 'growth'
          ? `${String(v)}% a month`
          : field === 'start'
            ? monthLabel(startMonth, Number(v))
            : field === 'end'
              ? v === null
                ? 'the end of the plan'
                : monthLabel(startMonth, Number(v))
              : String(v);
  return scenario.changes.map((c) => {
    switch (c.type) {
      case 'add':
        return `Adds ${c.item.kind === 'income' ? 'income' : 'expense'} ${c.item.name}: ${perCadence(c.item.amount, c.item.cadence, currency)} ${c.item.cadence === 'once' ? 'in' : 'from'} ${monthLabel(startMonth, c.item.start)}`;
      case 'remove':
        return `Removes ${name(c.itemId)}`;
      case 'opening':
        return `Opening balance ${money(c.value, currency)} instead of ${money(before.opening, currency)}`;
      case 'set': {
        const old = before.items.find((i) => i.id === c.itemId)?.[c.field];
        const label = {
          name: 'name',
          kind: 'type',
          category: 'category',
          amount: 'amount',
          cadence: 'frequency',
          start: 'first month',
          end: 'last month',
          growth: 'growth',
        }[c.field];
        return `${name(c.itemId)}: ${label} ${show(c.field, old)} to ${show(c.field, c.value)}`;
      }
    }
  });
}

export function PrintPage() {
  const { ws } = useStore();
  const compared = useCompared();
  const { plan } = ws;
  return (
    <article className="report">
      <div className="report__actions no-print">
        <Link className="btn btn--quiet" to="/compare">
          Back to comparison
        </Link>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
      <header className="report__head">
        <p className="eyebrow">Planwright scenario report</p>
        <h1>{plan.name}</h1>
        <p>
          {monthLabel(plan.startMonth, 0)} to {monthLabel(plan.startMonth, plan.months - 1)} · {plan.months}{' '}
          months · amounts in {plan.currency} · printed{' '}
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>
      <BalanceChart
        title="Closing balance per month"
        startMonth={plan.startMonth}
        currency={plan.currency}
        series={compared.map(({ scenario, projection }) => ({
          id: scenario.id,
          name: scenario.name,
          index: scenarioIndex(ws, scenario.id),
          values: projection.rows.map((r) => r.balance),
        }))}
      />
      <h2>Key figures</h2>
      <MetricsTable compared={compared} />
      <h2>What each scenario assumes</h2>
      {compared.map(({ scenario }) => {
        const parent = parentOf(ws, scenario.id);
        const lines = describeChanges(ws, scenario);
        return (
          <section key={scenario.id} className="report__scenario">
            <h3>{scenario.name}</h3>
            <p className="muted">{parent ? `Branch of ${parent.name}` : 'Baseline'}</p>
            {scenario.notes && <p>{scenario.notes}</p>}
            {lines.length > 0 && (
              <ul>
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <h2 className="page-break">Monthly figures</h2>
      <MonthlyTable compared={compared} />
    </article>
  );
}
