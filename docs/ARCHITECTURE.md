# Architecture

Planwright is a static single-page app. There is no backend: the server hands out files, the browser does
everything else.

```
Browser
 ├─ React UI (src/pages, src/ui)
 │    └─ StoreProvider (src/state/store.tsx)
 │         ├─ reducer: History<Workspace> + selection + announcements
 │         ├─ projection cache per workspace snapshot
 │         └─ autosave (debounced) ──► localStorage  "planwright:workspace"
 ├─ Domain, pure functions (src/domain)
 │    ├─ scenario.ts   resolve(), edit operations, pruning
 │    └─ engine.ts     project(items, months, opening) → rows + summary
 ├─ File format (src/io)  export / parse + migrate + validate (Zod) / CSV
 └─ Service worker (src/sw/sw.js, generated at build) ──► Cache Storage

nginx-unprivileged (container)  static files, CSP and other headers, /healthz
```

## Data model

```ts
Workspace { plan: Plan; items: LineItem[]; scenarios: Scenario[] }
Plan      { name, currency, startMonth 'YYYY-MM', months 1-60, openingBalance }
LineItem  { id, name, kind income|expense, category, amount, cadence, start, end|null, growth %/month }
Scenario  { id, name, parentId|null, notes, changes: Change[] }   // baseline: id "base", no changes
Change    = set(itemId, field, value) | add(item) | remove(itemId) | opening(value)
```

`workspace.items` are the baseline lines. A scenario sees `resolve(ws, id)`: the baseline with the changes of
every scenario on its lineage applied root-first. This is the key design choice
([DECISIONS.md](DECISIONS.md#scenarios-store-changes-not-copies)): editing the baseline updates every branch
that has not overridden that field, and a branch's change list is exactly "what this scenario assumes", which
the print report shows in plain language.

### Edit rules (src/domain/scenario.ts)

| Edit in a branch                    | Result                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| Change a field of an inherited line | Upsert a `set` change; if the value equals the parent's, remove it |
| Change a field of a line added here | Edit the `add` change's item in place                              |
| Remove an inherited line            | Drop this scenario's `set` changes for it, add a `remove` change   |
| Remove a line added here            | Drop the `add` change                                              |
| Revert / restore                    | Drop this scenario's `set` and `remove` changes for the line       |
| Any structural edit                 | `pruneOrphans` drops changes in descendants that point at nothing  |
| Delete a scenario                   | Deletes its descendants too (one undo step brings all back)        |

In the baseline the same operations edit `workspace.items` directly.

## State and history

The whole workspace is one immutable value. Every edit is a pure function `Workspace -> Workspace` passed to
the reducer, which commits it to `History`:

- `past` holds earlier snapshots with a label ("Change amount of Workshop rent"). Unchanged branches of the
  object tree are shared between snapshots, so 100 steps cost little.
- Edits carry a coalescing key (scenario, line, field). Edits with the same key within one second replace
  the present instead of adding a step, so typing "8100" is one undo step.
- Undo, redo and selection fixes run in the reducer; if undo removes the selected scenario, selection falls
  back to the baseline, and the comparison list drops scenarios that no longer exist.
- Undo/redo results are announced in a polite live region and shown in a toast; destructive actions offer
  Undo in the toast.

Inputs keep a local draft (`src/ui/fields.tsx`): only valid values reach the store, so the plan is never in an
invalid state, and leaving a field with an invalid draft restores the last valid value.

## Computation and performance

`project()` is O(lines x months) with no allocation per line. The store caches `resolve` and `project`
results per scenario for the current workspace snapshot; a new snapshot gets a new cache, so there is no
invalidation logic to get wrong. The largest plan the limits allow (400 lines, 60 months, 8 scenarios) is
resolved and projected in well under 50 ms (unit test with a budget).

Bundle: React, React Router and Zod are separate long-lived chunks; Compare, Data and Print are lazy chunks.
`scripts/check-bundle.mjs` enforces budgets in CI. Measured numbers are in [TESTING.md](TESTING.md#performance).

## Persistence and files

- Autosave writes the export format (same validation path as an import) 400 ms after the last change.
- On load, a saved document that fails validation is copied to `planwright:unreadable:<time>` and the sample
  plan is loaded with a visible message. Storage that is blocked or full is reported, not ignored.
- Import: size check, JSON parse, `format` and `version` check, step-by-step migrations, strict schema with
  readable paths, preview, then an undoable replace. Details: [FILE-FORMAT.md](FILE-FORMAT.md).

## Offline

The Vite plugin in `vite.config.ts` emits `sw.js` with the list of built files and a content hash. The worker
precaches all of them on install, answers same-origin GET requests from that cache first, and serves the app
shell for every navigation. A new build has a different worker; it installs in the background and waits.
The page then shows "New version: reload", and only that button makes it take over, so a plan is never
swapped mid-edit. `/healthz` is never cached.

## Server

nginx-unprivileged, read-only root filesystem, everything writable in a 8 MB tmpfs, one worker. Hashed assets
are immutable for a year, `index.html` and `sw.js` revalidate on every load. Text files are precompressed at
build time. Unknown paths serve the app shell; unknown `/assets/` files are real 404s. Only GET and HEAD.
