# Exercises

Extensions that fit the current design, roughly from small to large. Each names where to start.

1. **Percent-of-income lines.** A card-fee line as 2% of income. Add a `basis` field, compute after income in
   `project()`, migrate to format 3 with `MIGRATIONS[2]`, add a fixture exported from today's build.
2. **Smaller start-up bundle.** Rewrite `src/io/schema.ts` with `zod/mini` and measure with `npm run budget`;
   or validate lazily and only parse autosave on start-up.
3. **Scenario notes in the chart.** Show a marker for one-off lines (fit-out, grants) on the balance line.
4. **Reorder lines** by keyboard (Alt+Up/Down) with a single undo step per move.
5. **Several plans** in IndexedDB with a plan switcher; keep `localStorage` migration for the current plan.
6. **Test the update prompt automatically**: serve two builds from Playwright's `route` handler and assert the
   prompt and the cache switch (today it is a scripted manual check, see TESTING.md).
7. **Share a read-only snapshot** as a URL fragment (compressed JSON in `#…`), never sent to the server.
8. **Firefox and WebKit** in the E2E matrix; note service worker differences.
