# Testing

## Suites

| Suite         | Files                       | Count | What it covers                                                                                  |
| ------------- | --------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| Engine        | `tests/unit/engine.test.ts` | 10    | Ranges, cadences, growth, rounding, run-out month, lowest balance, empty plan                   |
| Scenarios     | `scenario.test.ts`          | 12    | Lineage, inheritance, overrides and their removal, add/remove/restore, pruning, delete cascade  |
| History       | `history.test.ts`           | 7     | Undo/redo labels, coalescing window and keys, redo cleared by new edits, 100-step limit         |
| File format   | `fileFormat.test.ts`        | 13    | Round trip, non-Planwright files, newer versions, size, paths in errors, tree checks, migration |
| CSV           | `csv.test.ts`               | 9     | Formula prefixes (=, +, -, @, tab, CR), quoting, numbers, BOM and CRLF                          |
| Persistence   | `persist.test.ts`           | 6     | Save/load, unreadable save kept aside, blocked and full storage                                 |
| Store         | `store.test.ts`             | 5     | Selection after delete and undo, comparison limits                                              |
| Budget        | `performance.test.ts`       | 3     | Largest allowed plan under 50 ms; chart tick and label helpers                                  |
| E2E desktop   | `tests/e2e/flows.spec.ts`   | 14    | See below                                                                                       |
| E2E phone     | `tests/e2e/mobile.spec.ts`  | 1     | Scenario picker, stacked cards, no sideways scroll, axe on two views                            |
| Bundle budget | `scripts/check-bundle.mjs`  | 4     | Initial JS, app chunk, lazy views, CSS                                                          |

E2E runs against the production image (service worker, nginx headers and all), one worker, Chromium:

- branch override, keyboard undo and redo, revert; typing coalesces and invalid drafts are blocked;
- branch, remove and restore a line, delete a branch and undo from the toast; persistence across reload;
- comparison: columns, run-out month, toggling scenarios, chart keyboard cursor, CSV download contents, axe;
- a line named `=HYPERLINK(...)` comes out of the CSV export as text;
- JSON export, replace, failed import of a newer format, successful import with preview, axe;
- quarterly cadence changes the monthly table; the real format-1 fixture imports with an upgrade notice;
- offline: reload and navigate with the network disabled;
- print media hides the app chrome and keeps the report; axe on print view and editor;
- security headers, 404 for missing assets, 405 for POST, health endpoint.

## Results (2026-10-04, local)

- `npm test`: 65 passed.
- `npx playwright test --project=desktop --project=mobile`: 15 passed in about 27 s.
- `npm run budget`: initial JS 116.6 KB, app chunk 13.1 KB, lazy views 6.9 KB, CSS 4.3 KB (all gzip, under budget).

## Performance

Measured with Playwright on the local image, Chromium, throttled to 150 ms latency, 1.6 Mbit/s down and 4x
CPU slowdown (a mid-range phone on mobile data). Three runs each:

| Visit                  | First contentful paint | Editor heading visible | Transferred |
| ---------------------- | ---------------------- | ---------------------- | ----------- |
| First (no cache)       | 1.72-1.82 s            | 1.86-1.99 s            | 124 KB      |
| Later (service worker) | 0.36-0.46 s            | 0.66-0.89 s            | 0 KB        |

Chunks (gzip): React 65.8 KB, Zod 23.8 KB, React Router 13.5 KB, app 13.1 KB, lazy views 6.9 KB.

## Gaps

- E2E runs in Chromium only. Firefox and Safari service worker and print behaviour are not automated.
- No visual regression tests; screenshots are reviewed by hand (`npm run screenshots`).
- Screen reader behaviour is checked with axe and by reading the accessibility tree in tests, not with a real
  screen reader in CI.
- The service worker update prompt is not in the automated suite (it needs two builds served one after the
  other). It was checked on 2026-10-04 with a one-off Playwright script against `npm run preview`: after the
  worker was replaced by a byte-different one, the page stayed usable, showed "New version: reload", and the
  click switched the cache from the old version to the new one and removed the prompt.
