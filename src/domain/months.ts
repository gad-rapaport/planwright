/** Calendar months as 'YYYY-MM' strings. Plans are month-granular, so no time zones are involved. */

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function addMonths(month: string, count: number): string {
  const match = MONTH_RE.exec(month);
  if (!match) throw new Error(`Not a month: ${month}`);
  const total = Number(match[1]) * 12 + (Number(match[2]) - 1) + count;
  const year = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

const labelFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

function toDate(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1));
}

/** "Jan 2027" for the month at `offset` from the plan start. */
export function monthLabel(startMonth: string, offset: number): string {
  return labelFormat.format(toDate(addMonths(startMonth, offset)));
}

/** "Jan" (chart ticks). */
export function monthShort(startMonth: string, offset: number): string {
  return shortFormat.format(toDate(addMonths(startMonth, offset)));
}

export function monthYear(startMonth: string, offset: number): number {
  return Number(addMonths(startMonth, offset).slice(0, 4));
}
