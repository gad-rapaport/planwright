# Design

## Identity: layered paper

Scenarios are drafts laid over a base plan, so the interface looks like sheets of paper: warm paper colours,
ink outlines, short hard offset shadows (the sheet lifted off the desk) and a terracotta accent. The scenario
list is a stack of tabs with a colour edge; the current one is pulled out. The look is calm and editorial to
match careful planning, and clearly different from the other portfolio projects.

| Token            | Light                 | Dark                  | Use                               |
| ---------------- | --------------------- | --------------------- | --------------------------------- |
| `--paper`        | `#fffdf8`             | `#26231e`             | Sheets                            |
| `--paper-2`      | `#f6f1e7`             | `#1d1b17`             | Desk (page background)            |
| `--ink`          | `#24211c`             | `#f3ede2`             | Text, outlines                    |
| `--ink-2`        | `#57514a`             | `#cfc6b8`             | Secondary text (7.7:1 / 9.3:1)    |
| `--accent`       | `#b4532a`             | `#e0855c`             | Primary button, active tab marker |
| `--changed`      | `#8a5a00`             | `#f2c46b`             | Fields overridden in a branch     |
| `--good`/`--bad` | `#1d6b3a` / `#a3261e` | `#6cc68b` / `#ff8a80` | Differences, run-out warnings     |

Dark mode follows the system setting and has its own values, not an inversion.

## Typography

- **Fraunces 600** for headings: a soft serif with some character, sets the "planning document" tone.
- **Public Sans 400/600** for everything else: plain, very legible at small sizes, with tabular figures so
  money columns line up. Its latin-ext subset carries the shekel sign and only downloads when needed.

Both are bundled from npm (`@fontsource`), so no request leaves the origin and the fonts work offline.

## Colour

Scenario identity uses a fixed order of eight colours validated with a colour-vision-deficiency checker
against both paper surfaces: neighbouring colours stay at least 9 ΔE apart under protanopia and
deuteranopia simulation (one pair drops to 5.8 under tritanopia) and at least 19 apart for normal vision. Three light-mode colours are below 3:1 against paper, so identity is never colour alone:
every line has its own dash pattern, the chart has a legend and direct end labels, and the same figures are in
tables. A scenario keeps its colour whatever else is selected.

## Interaction

- Numbers are typed, not dragged. Arrow keys step amounts by 100 and growth by 0.1. Invalid drafts show an
  inline message and never reach the plan.
- Overridden fields in a branch have a marked border and background plus screen-reader text "(changed in this
  scenario)"; the row has a "Changed here" badge and a revert button.
- Destructive actions are immediate and undoable, with Undo offered in the toast; no confirmation dialogs.
- Moving to another scenario moves focus to its heading.
- The chart is one focusable group: Left/Right, Home/End, PageUp/PageDown move a cursor; a live region reads
  the month's values; Escape clears.

## Accessibility

Skip link, landmarks, one `h1` per view, labels on every input (visible or visually hidden), errors linked by
`aria-describedby` and announced, `aria-current` on navigation and the scenario tab, focus outlines kept,
touch targets at least 36 px (WCAG 2.2 asks for 24), reduced motion respected, no horizontal scrolling at 390 px. Checked with
axe-core (WCAG 2.2 AA rules) on every view in E2E, desktop and phone.

## Layout

- Wide screens: scenario rail on the left, sheets on the right, item tables with fixed columns.
- Below 1280 px the item tables become cards (four columns, then two on phones).
- Below 900 px the rail becomes a select.
- Print: app chrome hidden, report layout, monthly table on a new page, no shadows, 10.5 pt.

## Assets and licences

| Asset              | Source                                  | Licence     |
| ------------------ | --------------------------------------- | ----------- |
| Fraunces           | `@fontsource/fraunces` (Undercase Type) | SIL OFL 1.1 |
| Public Sans        | `@fontsource/public-sans` (USWDS)       | SIL OFL 1.1 |
| Icons, logo, chart | Drawn in SVG for this project           | n/a         |
| Sample data        | Invented                                | n/a         |
