// Exports the film's chart data from the running app, so the film shows real output of the projection engine.
// Opens the comparison view of the built-in sample plan in a fresh browser, downloads the CSV export and writes
// animation/data/sample-balances.json. Needs the container: ./scripts/ops.ps1 start
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8104';
const browser = await chromium.launch();
const page = await browser.newPage({ acceptDownloads: true });
await page.goto(`${base}/compare`);
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: 'Export CSV' }).click(),
]);
const csv = (await readFile(await download.path(), 'utf8')).replace(/^\uFEFF/, '');
await browser.close();

const [header, ...rows] = csv
  .trim()
  .split('\r\n')
  .map((line) => line.split(','));
const names = header.filter((h) => h.endsWith(': balance')).map((h) => h.replace(/: balance$/, ''));
const series = names.map((name) => {
  const col = header.indexOf(`${name}: balance`);
  return { name, balance: rows.map((r) => Number(r[col])) };
});
const out = {
  source: `CSV export of the sample plan from ${base}/compare`,
  extractedAt: new Date().toISOString(),
  months: rows.map((r) => r[0]),
  series,
};
await mkdir(new URL('./data/', import.meta.url), { recursive: true });
await writeFile(new URL('./data/sample-balances.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${series.length} series x ${out.months.length} months`);
