import { Link } from 'react-router';
import type { Projection } from '../domain/engine';
import { money, signedMoney } from '../domain/format';
import { monthLabel } from '../domain/months';
import type { Scenario, Workspace } from '../domain/types';
import { toCsv } from '../io/csv';
import { MAX_COMPARE, useStore } from '../state/store';
import { BalanceChart } from '../ui/BalanceChart';
import { dash, scenarioIndex, seriesVar } from '../ui/colors';
import { downloadText, fileStamp } from '../ui/download';

export interface Compared {
  scenario: Scenario;
  projection: Projection;
}

export function useCompared(): Compared[] {
  const { ws, compare, projection } = useStore();
  return compare.flatMap((id) => {
    const scenario = ws.scenarios.find((s) => s.id === id);
    return scenario ? [{ scenario, projection: projection(id) }] : [];
  });
}

export function comparisonCsv(ws: Workspace, compared: Compared[]): string {
  const header = [
    'Month',
    ...compared.flatMap(({ scenario }) => [`${scenario.name}: net`, `${scenario.name}: balance`]),
  ];
  const rows = Array.from({ length: ws.plan.months }, (_, m) => [
    monthLabel(ws.plan.startMonth, m),
    ...compared.flatMap(({ projection }) => [
      projection.rows[m]?.net ?? null,
      projection.rows[m]?.balance ?? null,
    ]),
  ]);
  return toCsv([header, ...rows]);
}

export function ComparePage() {
  const { ws, compare, toggleCompare, say } = useStore();
  const compared = useCompared();
  const { currency, startMonth, months } = ws.plan;
  const reference = compared[0];

  return (
    <div className="compare">
      <section className="sheet" aria-labelledby="compare-heading">
        <div className="sheet__head">
          <h1 id="compare-heading">Compare scenarios</h1>
          <div className="toolbar">
            <button
              type="button"
              className="btn"
              onClick={() => {
                downloadText(
                  `planwright-comparison-${fileStamp()}.csv`,
                  comparisonCsv(ws, compared),
                  'text/csv;charset=utf-8',
                );
                say('Comparison exported as CSV');
              }}
            >
              Export CSV
            </button>
            <Link className="btn" to="/print">
              Print view
            </Link>
          </div>
        </div>
        <fieldset className="picker">
          <legend>
            Scenarios to compare <span className="muted">(up to {MAX_COMPARE})</span>
          </legend>
          {ws.scenarios.map((s) => {
            const i = scenarioIndex(ws, s.id);
            const on = compare.includes(s.id);
            return (
              <label key={s.id} className={`chip${on ? ' chip--on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleCompare(s.id)} />
                <svg width="26" height="10" aria-hidden="true">
                  <line
                    x1="1"
                    x2="25"
                    y1="5"
                    y2="5"
                    stroke={seriesVar(i)}
                    strokeWidth="2.5"
                    strokeDasharray={dash(i)}
                  />
                </svg>
                {s.name}
              </label>
            );
          })}
        </fieldset>
        <BalanceChart
          title={`Closing balance, ${monthLabel(startMonth, 0)} to ${monthLabel(startMonth, months - 1)}`}
          startMonth={startMonth}
          currency={currency}
          series={compared.map(({ scenario, projection }) => ({
            id: scenario.id,
            name: scenario.name,
            index: scenarioIndex(ws, scenario.id),
            values: projection.rows.map((r) => r.balance),
          }))}
        />
      </section>

      <section className="sheet" aria-labelledby="metrics-heading">
        <h2 id="metrics-heading">Key figures</h2>
        {reference && compared.length > 1 && (
          <p className="muted">Differences are against {reference.scenario.name}.</p>
        )}
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Key figures table">
          <MetricsTable compared={compared} />
        </div>
      </section>

      <details className="sheet monthly">
        <summary>
          <h2>Monthly figures</h2>
          <span className="muted">Net result and closing balance per month</span>
        </summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Monthly figures table">
          <MonthlyTable compared={compared} />
        </div>
      </details>
    </div>
  );
}

export function MetricsTable({ compared }: { compared: Compared[] }) {
  const { ws } = useStore();
  const { currency, startMonth } = ws.plan;
  const ref = compared[0]?.projection.summary;
  const rows: {
    label: string;
    value: (p: Projection) => number | null;
    show: (v: number | null) => string;
    better?: 'up';
  }[] = [
    {
      label: 'Balance at the end',
      value: (p) => p.summary.endBalance,
      show: (v) => money(v ?? 0, currency),
      better: 'up',
    },
    {
      label: 'Lowest balance',
      value: (p) => p.summary.lowest.value,
      show: (v) => money(v ?? 0, currency),
      better: 'up',
    },
    {
      label: 'Cash runs out',
      value: (p) => p.summary.firstNegative,
      show: (v) => (v === null ? 'Never' : monthLabel(startMonth, v)),
    },
    { label: 'Total income', value: (p) => p.summary.totalIncome, show: (v) => money(v ?? 0, currency) },
    { label: 'Total expenses', value: (p) => p.summary.totalExpense, show: (v) => money(v ?? 0, currency) },
    {
      label: 'Average month',
      value: (p) => p.summary.averageNet,
      show: (v) => signedMoney(v ?? 0, currency),
      better: 'up',
    },
  ];
  return (
    <table className="metrics">
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">Figure</span>
          </th>
          {compared.map(({ scenario }) => (
            <th
              key={scenario.id}
              scope="col"
              style={{ borderTopColor: seriesVar(scenarioIndex(ws, scenario.id)) }}
            >
              {scenario.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {compared.map(({ scenario, projection }, k) => {
              const v = row.value(projection);
              const r = ref ? row.value(compared[0]!.projection) : null;
              const diff = k > 0 && row.better && v !== null && r !== null && v !== r ? v - r : null;
              return (
                <td key={scenario.id} className="num">
                  {row.show(v)}
                  {diff !== null && (
                    <span className={`delta ${diff > 0 ? 'delta--up' : 'delta--down'}`}>
                      {signedMoney(diff, currency)}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MonthlyTable({ compared }: { compared: Compared[] }) {
  const { ws } = useStore();
  const { currency, startMonth, months } = ws.plan;
  return (
    <table className="monthly-table">
      <thead>
        <tr>
          <th scope="col" rowSpan={2}>
            Month
          </th>
          {compared.map(({ scenario }) => (
            <th key={scenario.id} scope="colgroup" colSpan={2}>
              {scenario.name}
            </th>
          ))}
        </tr>
        <tr>
          {compared.map(({ scenario }) => [
            <th key={`${scenario.id}-n`} scope="col" className="num">
              Net
            </th>,
            <th key={`${scenario.id}-b`} scope="col" className="num">
              Balance
            </th>,
          ])}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: months }, (_, m) => (
          <tr key={m}>
            <th scope="row">{monthLabel(startMonth, m)}</th>
            {compared.map(({ scenario, projection }) => {
              const row = projection.rows[m]!;
              return [
                <td key={`${scenario.id}-n`} className="num">
                  {signedMoney(row.net, currency)}
                </td>,
                <td key={`${scenario.id}-b`} className={`num${row.balance < 0 ? ' negative' : ''}`}>
                  {money(row.balance, currency)}
                </td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
