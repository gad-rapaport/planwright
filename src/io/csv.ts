export type Cell = string | number | null;

/**
 * Spreadsheet apps treat a cell starting with = + - @ (or a tab / carriage return) as a formula. Text cells
 * that start with one of these get a leading apostrophe so they open as text (OWASP CSV injection guidance).
 * Numbers are written as numbers, so negative balances stay numeric.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCell(cell: Cell): string {
  if (cell === null) return '';
  if (typeof cell === 'number') return Number.isFinite(cell) ? String(cell) : '';
  let text = cell;
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || text !== text.trim()) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

/** RFC 4180 CSV with CRLF line ends and a BOM so spreadsheet apps detect UTF-8. */
export function toCsv(rows: readonly (readonly Cell[])[]): string {
  return '﻿' + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}
