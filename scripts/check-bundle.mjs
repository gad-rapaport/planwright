// Size budget for the production build (run after `npm run build`). Fails when a budget is exceeded.
// Initial = what the browser must download before the plan editor renders: the entry script, the chunks
// index.html preloads, and the stylesheet. Lazy views (compare, data, print) are counted separately.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_KB = { initialJs: 125, appChunk: 20, lazyJs: 15, css: 6 };
const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const gz = (file) => gzipSync(readFileSync(join(dist, file)), { level: 9 }).length / 1024;

const initial = new Set([...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]));
const allJs = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/${f}`);
const css = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => `assets/${f}`);

const rows = allJs.map((f) => ({ file: f, kb: gz(f), initial: initial.has(f) }));
const sum = (list) => list.reduce((n, r) => n + r.kb, 0);
const initialJs = sum(rows.filter((r) => r.initial));
const lazyJs = sum(rows.filter((r) => !r.initial));
const app = rows.find((r) => /assets\/index-[^/]+\.js$/.test(r.file))?.kb ?? 0;
const cssKb = css.reduce((n, f) => n + gz(f), 0);

console.table(rows.map((r) => ({ file: r.file, 'gzip KB': r.kb.toFixed(1), initial: r.initial })));
const checks = [
  ['Initial JavaScript', initialJs, BUDGET_KB.initialJs],
  ['App chunk', app, BUDGET_KB.appChunk],
  ['Lazy views', lazyJs, BUDGET_KB.lazyJs],
  ['CSS', cssKb, BUDGET_KB.css],
];
let failed = false;
for (const [label, value, budget] of checks) {
  const ok = value <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: ${value.toFixed(1)} KB gzip (budget ${budget} KB)`);
}
process.exit(failed ? 1 : 0);
