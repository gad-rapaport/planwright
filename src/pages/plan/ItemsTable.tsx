import { useState } from 'react';
import { itemValueAt } from '../../domain/engine';
import { money } from '../../domain/format';
import { addItem, allItemIds, itemStatus, removeItem, revertItem, setItemField } from '../../domain/scenario';
import { LIMITS, type EditableField, type Kind, type LineItem } from '../../domain/types';
import { useStore } from '../../state/store';
import { Badge, MonthField, NumberField, TextField } from '../../ui/fields';
import { slugId } from '../../domain/ids';

const FIELD_LABEL: Record<EditableField, string> = {
  name: 'name',
  kind: 'type',
  category: 'category',
  amount: 'amount',
  start: 'start month',
  end: 'end month',
  growth: 'growth',
};

export function ItemsTable({ kind, items }: { kind: Kind; items: LineItem[] }) {
  const { ws, scenarioId, edit } = useStore();
  const status = itemStatus(ws, scenarioId);
  const isBase = ws.scenarios.find((s) => s.id === scenarioId)?.parentId === null;
  const { currency, startMonth, months } = ws.plan;
  const title = kind === 'income' ? 'Income' : 'Expenses';
  const headingId = `items-${kind}`;
  const monthlyTotal = items.reduce((sum, it) => sum + itemValueAt(it, 0), 0);

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
          {items.length} line{items.length === 1 ? '' : 's'} · {money(monthlyTotal, currency)} in the first
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
                Per month ({currency})
              </th>
              <th scope="col">From</th>
              <th scope="col">Until</th>
              <th scope="col" className="num">
                Growth % / month
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
                  <td data-label={`Per month (${currency})`} className="num">
                    <NumberField
                      label={`Amount per month for ${item.name}`}
                      hideLabel
                      value={item.amount}
                      min={0}
                      max={LIMITS.amount}
                      step={100}
                      changed={changed('amount')}
                      onCommit={(v) => setField(item, 'amount', v)}
                    />
                  </td>
                  <td data-label="From">
                    <MonthField
                      label={`First month of ${item.name}`}
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
                  </td>
                  <td data-label="Growth % / month" className="num">
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
                      <button
                        type="button"
                        className="btn btn--quiet"
                        onClick={() => edit(`Revert ${item.name}`, (w) => revertItem(w, scenarioId, item.id))}
                      >
                        Revert<span className="visually-hidden"> {item.name}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--quiet"
                      onClick={() => edit(`Remove ${item.name}`, (w) => removeItem(w, scenarioId, item.id))}
                    >
                      Remove<span className="visually-hidden"> {item.name}</span>
                    </button>
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
        <span>Per month</span>
        <input
          value={amount}
          inputMode="numeric"
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
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
