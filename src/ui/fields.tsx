import { useEffect, useId, useState, type ReactNode } from 'react';
import { monthLabel } from '../domain/months';

/**
 * Inputs keep a local draft so half-typed values ("", "-", "12.") never reach the plan. Valid drafts are
 * committed on every keystroke (history coalesces them); invalid ones show an error until fixed or blurred.
 */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  integer = true,
  suffix,
  hideLabel = false,
  changed = false,
  describedBy,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  suffix?: string;
  hideLabel?: boolean;
  changed?: boolean;
  describedBy?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  const parsed = draft.trim() === '' ? NaN : Number(draft);
  const error =
    Number.isNaN(parsed) || !Number.isFinite(parsed)
      ? 'Enter a number'
      : integer && !Number.isInteger(parsed)
        ? 'Whole numbers only'
        : parsed < min || parsed > max
          ? `Between ${min.toLocaleString('en-GB')} and ${max.toLocaleString('en-GB')}`
          : null;
  const errorId = `${id}-error`;
  return (
    <div className={`field${changed ? ' field--changed' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
        {changed && <span className="visually-hidden"> (changed in this scenario)</span>}
      </label>
      <span className="field__control">
        <input
          id={id}
          type="text"
          inputMode={integer && min >= 0 ? 'numeric' : 'decimal'}
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, describedBy].filter(Boolean).join(' ') || undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setDraft(String(value));
          }}
          onChange={(e) => {
            const text = e.target.value.replace(/[,\s]/g, '');
            setDraft(text);
            const n = Number(text);
            if (
              text !== '' &&
              Number.isFinite(n) &&
              (!integer || Number.isInteger(n)) &&
              n >= min &&
              n <= max &&
              n !== value
            ) {
              onCommit(n);
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            const next = Math.min(max, Math.max(min, value + (e.key === 'ArrowUp' ? step : -step)));
            const rounded = integer ? Math.round(next) : Math.round(next * 100) / 100;
            setDraft(String(rounded));
            if (rounded !== value) onCommit(rounded);
          }}
        />
        {suffix && <span className="field__suffix">{suffix}</span>}
      </span>
      {error && focused && (
        <span id={errorId} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onCommit,
  maxLength,
  hideLabel = false,
  changed = false,
  multiline = false,
  required = true,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  maxLength: number;
  hideLabel?: boolean;
  changed?: boolean;
  multiline?: boolean;
  required?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  const empty = required && draft.trim() === '';
  const props = {
    id,
    value: draft,
    maxLength,
    'aria-invalid': empty ? true : undefined,
    'aria-describedby': empty ? `${id}-error` : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setDraft(value);
    },
    onChange: (e: { target: { value: string } }) => {
      setDraft(e.target.value);
      const v = multiline ? e.target.value : e.target.value.replace(/\s+/g, ' ');
      if ((!required || v.trim() !== '') && v !== value) onCommit(v);
    },
  };
  return (
    <div className={`field${changed ? ' field--changed' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
        {changed && <span className="visually-hidden"> (changed in this scenario)</span>}
      </label>
      {multiline ? <textarea rows={2} {...props} /> : <input type="text" {...props} />}
      {empty && focused && (
        <span id={`${id}-error`} className="field__error" role="alert">
          Required
        </span>
      )}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onCommit,
  hideLabel = false,
  changed = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onCommit: (v: T) => void;
  hideLabel?: boolean;
  changed?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field${changed ? ' field--changed' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
        {changed && <span className="visually-hidden"> (changed in this scenario)</span>}
      </label>
      <select id={id} value={value} onChange={(e) => onCommit(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Month offset picker; `allowOpen` adds "Until the end". */
export function MonthField({
  label,
  value,
  startMonth,
  months,
  min = 0,
  allowOpen = false,
  onCommit,
  hideLabel,
  changed,
}: {
  label: string;
  value: number | null;
  startMonth: string;
  months: number;
  min?: number;
  allowOpen?: boolean;
  onCommit: (v: number | null) => void;
  hideLabel?: boolean;
  changed?: boolean;
}) {
  const options: { value: string; label: string }[] = [];
  if (allowOpen) options.push({ value: 'open', label: 'To the end' });
  for (let m = min; m < months; m++) options.push({ value: String(m), label: monthLabel(startMonth, m) });
  // Keep a value outside the current horizon selectable instead of silently changing it.
  const current = value === null ? 'open' : String(value);
  if (!options.some((o) => o.value === current))
    options.push({ value: current, label: `${monthLabel(startMonth, value ?? 0)} (outside plan)` });
  return (
    <SelectField
      label={label}
      value={current}
      options={options}
      hideLabel={hideLabel}
      changed={changed}
      onCommit={(v) => onCommit(v === 'open' ? null : Number(v))}
    />
  );
}

export function Badge({ tone, children }: { tone: 'added' | 'changed' | 'removed'; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
