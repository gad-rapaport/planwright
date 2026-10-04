import { useState } from 'react';
import { itemValueAt } from '../../domain/engine';
import { CADENCE_LABEL, money } from '../../domain/format';
import { slugId } from '../../domain/ids';
import { addItem, allItemIds, itemStatus, removeItem, revertItem, setItemField } from '../../domain/scenario';
import {
  CADENCES,
  LIMITS,
  type Cadence,
  type EditableField,
  type Kind,
  type LineItem,
} from '../../domain/types';
import { useStore } from '../../state/store';
import { Badge, MonthField, NumberField, SelectField, TextField } from '../../ui/fields';

const FIELD_LABEL: Record<EditableField, string> = {
  name: 'name',
  kind: 'type',
  category: 'category',
  amount: 'amount',
  cadence: 'frequency',
  start: 'start month',
  end: 'end month',
  growth: 'growth',
};

const CADENCE_OPTIONS = CADENCES.map((c) => ({ value: c, label: CADENCE_LABEL[c] }));

function IconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: 'revert' | 'remove';
}) {
  return (
    <button type="button" className="btn btn--quiet btn--icon" title={label} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {icon === 'revert' ? (
          <path
            d="M5 3 L2 6 L5 9 M2 6 H11 a4.5 4.5 0 0 1 0 9 H6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path d="M4 4 L14 14 M14 4 L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
      <span className="visually-hidden">{label}</span>
    </button>
  );
}

export function ItemsTable({ kind, items }: { kind: Kind; items: LineItem[] }) {
  const { ws, scenarioId, edit } = useStore();
  const status = itemStatus(ws, scenarioId);
  const isBase = ws.scenarios.find((s) => s.id === scenarioId)?.parentId === null;
  const { currency, startMonth, months } = ws.plan;
  const title = kind === 'income' ? 'Income' : 'Expenses';
  const headingId = `items-${kind}`;
  const firstMonth = items.reduce((sum, it) => sum + itemValueAt(it, 0), 0);

  const setField = <K extends EditableField>(item: LineItem, field: K, value: LineItem[K]) =>
    edit(
      `Change ${FIELD_LABEL[field]} of ${item.name}`,
      (w) => setItemField(w, scenarioId, item.id, field, value),
      {
        coalesce: `${scenarioId}:${item.id}:${field}`,
      },
    );

  return (
    <section className="sheet" aria-labelledby={headingId}>
      <div className="sheet__head">
        <h2 id={headingId}>{title}</h2>
        <p className="muted">
          {items.length} line{items.length === 1 ? '' : 's'} · {money(firstMonth, currency)} in the first
          month
        </p>
      </div>
      {items.length === 0 ? (
        <p className="empty">No {title.toLowerCase()} lines in this scenario.</p>
      ) : (
        <table className="items">
          <colgroup>
            <col />
            <col className="c-cat" />
            <col className="c-amount" />
            <col className="c-cadence" />
            <col className="c-month" />
            <col className="c-month" />
            <col className="c-growth" />
            <col className="c-actions" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Amount ({currency})
              </th>
              <th scope="col">Every</th>
              <th scope="col">From</th>
              <th scope="col">Until</th>
              <th scope="col" className="num">
                Growth %/mo
              </th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const st = status.get(item.id);
              const changed = (f: EditableField) => st?.status === 'changed' && st.fields.has(f);
              const once = item.cadence === 'once';
              return (
                <tr key={item.id} className={st ? `row--${st.status}` : undefined}>
                  <td data-label="Name">
                    <TextField
                      label={`Name of line ${item.name}`}
                      hideLabel
                      value={item.name}
                      maxLength={LIMITS.name}
                      changed={changed('name')}
                      onCommit={(v) => setField(item, 'name', v)}
                    />
                    {st?.status === 'added' && <Badge tone="added">Added here</Badge>}
                    {st?.status === 'changed' && <Badge tone="changed">Changed here</Badge>}
                  </td>
                  <td data-label="Category">
                    <TextField
                      label={`Category of ${item.name}`}
                      hideLabel
                      required={false}
                      value={item.category}
                      maxLength={40}
                      changed={changed('category')}
                      onCommit={(v) => setField(item, 'category', v)}
                    />
                  </td>
                  <td data-label={`Amount (${currency})`} className="num">
                    <NumberField
                      label={`Amount for ${item.name}`}
                      hideLabel
                      value={item.amount}
                      min={0}
                      max={LIMITS.amount}
                      step={100}
                      changed={changed('amount')}
                      onCommit={(v) => setField(item, 'amount', v)}
                    />
                  </td>
                  <td data-label="Every">
                    <SelectField<Cadence>
                      label={`How often ${item.name} occurs`}
                      hideLabel
                      value={item.cadence}
                      options={CADENCE_OPTIONS}
                      changed={changed('cadence')}
                      onCommit={(v) => setField(item, 'cadence', v)}
                    />
                  </td>
                  <td data-label={once ? 'In' : 'From'}>
                    <MonthField
                      label={once ? `Month of ${item.name}` : `First month of ${item.name}`}
                      hideLabel
                      value={item.start}
                      startMonth={startMonth}
                      months={months}
                      changed={changed('start')}
                      onCommit={(v) => {
                        const start = v ?? 0;
                        edit(`Change start month of ${item.name}`, (w) => {
                          let next = setItemField(w, scenarioId, item.id, 'start', start);
                          // Keep the range valid: an end before the new start moves with it.
                          if (item.end !== null && item.end < start)
                            next = setItemField(next, scenarioId, item.id, 'end', start);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td data-label="Until">
                    {once ? (
                      <span className="muted small">One payment</span>
                    ) : (
                      <MonthField
                        label={`Last month of ${item.name}`}
                        hideLabel
                        value={item.end}
                        startMonth={startMonth}
                        months={months}
                        min={item.start}
                        allowOpen
                        changed={changed('end')}
                        onCommit={(v) => setField(item, 'end', v)}
                      />
                    )}
                  </td>
                  <td data-label="Growth % per month" className="num">
                    <NumberField
                      label={`Monthly growth for ${item.name}, percent`}
                      hideLabel
                      value={item.growth}
                      min={-LIMITS.growth}
                      max={LIMITS.growth}
                      step={0.1}
                      integer={false}
                      suffix="%"
                      changed={changed('growth')}
                      onCommit={(v) => setField(item, 'growth', v)}
                    />
                  </td>
                  <td className="actions">
                    {st?.status === 'changed' && (
                      <IconButton
                        icon="revert"
                        label={`Revert ${item.name}`}
                        onClick={() => edit(`Revert ${item.name}`, (w) => revertItem(w, scenarioId, item.id))}
                      />
                    )}
                    <IconButton
                      icon="remove"
                      label={`Remove ${item.name}`}
                      onClick={() => edit(`Remove ${item.name}`, (w) => removeItem(w, scenarioId, item.id))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <AddItem kind={kind} scenarioLabel={isBase ? 'the baseline' : 'this scenario'} />
    </section>
  );
}

function AddItem({ kind, scenarioLabel }: { kind: Kind; scenarioLabel: string }) {
  const { ws, scenarioId, edit } = useStore();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [error, setError] = useState<string | null>(null);
  const noun = kind === 'income' ? 'income' : 'expense';
  return (
    <form
      className="add-item"
      aria-label={`Add ${noun} line`}
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount.replace(/[,\s]/g, ''));
        if (name.trim() === '') return setError('Give the line a name.');
        if (amount.trim() === '' || !Number.isInteger(n) || n < 0 || n > LIMITS.amount) {
          return setError('Amount must be a whole number of 0 or more.');
        }
        const total = ws.items.length + ws.scenarios.reduce((c, s) => c + s.changes.length, 0);
        if (total >= LIMITS.items) return setError(`A plan holds up to ${LIMITS.items} lines.`);
        const item: LineItem = {
          id: slugId(name, allItemIds(ws)),
          name: name.trim(),
          kind,
          category: '',
          amount: n,
          cadence,
          start: 0,
          end: null,
          growth: 0,
        };
        edit(`Add ${item.name}`, (w) => addItem(w, scenarioId, item));
        setName('');
        setAmount('');
        setError(null);
      }}
    >
      <label>
        <span>New {noun} line</span>
        <input
          value={name}
          maxLength={LIMITS.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
      </label>
      <label>
        <span>Amount</span>
        <input
          value={amount}
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </label>
      <label>
        <span>Every</span>
        <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
          {CADENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn">
        Add to {scenarioLabel}
      </button>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
