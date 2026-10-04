import type { Cadence, Currency } from './types';

const cache = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency, signed: boolean, compact: boolean): Intl.NumberFormat {
  const key = `${currency}|${signed}|${compact}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
      signDisplay: signed ? 'exceptZero' : 'auto',
    });
    cache.set(key, f);
  }
  return f;
}

export function money(value: number, currency: Currency): string {
  return formatter(currency, false, false).format(value);
}

/** "+₪1,200" / "−₪300" for differences. */
export function signedMoney(value: number, currency: Currency): string {
  return formatter(currency, true, false).format(value);
}

/** "₪45.2K" for axis ticks. */
export function compactMoney(value: number, currency: Currency): string {
  return formatter(currency, false, true).format(value);
}

const plain = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
export function number(value: number): string {
  return plain.format(value);
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  once: 'Once',
};

/** "₪3,300 a quarter", "₪12,000 once". */
export function perCadence(amount: number, cadence: Cadence, currency: Currency): string {
  const tail = { monthly: 'a month', quarterly: 'a quarter', yearly: 'a year', once: 'once' }[cadence];
  return `${money(amount, currency)} ${tail}`;
}
