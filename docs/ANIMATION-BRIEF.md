# Animation brief

## Purpose and audience

A 21.5-second film for the portfolio page and README that shows the idea behind Planwright in one pass: a plan
branches into scenarios that each keep only their changes, and the outcomes are compared side by side.
Audience: interviewers for frontend roles. It must work without sound.

## Core message

Branch the plan instead of copying it, compare the outcomes, and decide, with the work staying on your own
device (offline, saved locally, printable).

## Reference and what was taken from it

The local reference video (an illustrated product film, stored rotated by 90 degrees and viewed in the correct
orientation frame by frame; not included here) moves from a person with a need, into a screen, through an
abstract space where objects are arranged, and back to the person for the result. Adapted for Planwright:

| Reference element                          | Here                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Person with a need in a simple environment | Paper cut-out workshop owner at a bench with a bicycle wheel, two questions floating    |
| Push into the device and a UI action       | The real branch editor on a laptop; the cursor presses "Branch from here"               |
| Objects arranged in an abstract space      | Scenario sheets peel off the baseline sheet and form a tree; each shows only its change |
| A visible result of the process            | Balance lines laid as paper strips, the run-out month pinned with a flag                |
| Return to the person for the outcome       | The owner holds the printed report; one question becomes a decision                     |

Not taken: any character, brand, layout, colour or asset of the reference. The style here is paper cut-out
(flat sheets with hard shadows, paper grain, layered paper hills), unlike the other films in the portfolio.

## Duration and format

21.5 s, 1920x1080, 30 fps, H.264 (yuv420p, BT.709, faststart), no audio.

## Palette and typography

Planwright tokens: desk `#efe6d3`, paper `#fffdf8`, ink `#24211c`, accent `#b4532a`, changed `#8a5a00` on
`#fdf3dc`, added `#1d6b3a` on `#e6f2ea`, warning `#a3261e`, and the app's scenario colours `#2a78d6`,
`#eb6834`, `#1baf7a`, `#eda100` in the same order as in the app. Fraunces 600 and Public Sans 400/600 from
the app's font packages.

## Motion language

Paper behaviour: sheets drop and settle with a small overshoot (`outBack`), branches slide out from under the
baseline sheet with a slight rotation that straightens, strips are laid left to right (`inOutCubic`), the flag
and badges pop. Everything casts the same hard shadow, so depth reads as stacked paper. No flashes.

## Scenes

| #   | Time      | Content                                                                                                               | Capability                     |
| --- | --------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | 0-4.3     | Owner at the bench; "Hire an apprentice?" and "Move to a bigger space?"                                               | The need                       |
| 2   | 4.2-8.1   | Laptop with the real branch editor screenshot; cursor presses "Branch from here"                                      | Branching in the editor        |
| 3   | 7.9-11.0  | Baseline sheet, three branches peel off and connect; change chips "+ Apprentice wage 7,500" and "Rent 7,800 → 11,500" | Scenarios store only changes   |
| 4   | 10.6-14.7 | Balance chart drawn from the app's CSV export; "Runs out in Mar 27" flag; end balance ₪89,740                         | Comparison                     |
| 5   | 14.6-17.7 | The real print view as a sheet; badges "Works offline", "Saved in this browser", "Undo every change"                  | Offline, autosave, undo, print |
| 6   | 17.6-19.8 | Owner holds the report; "Hire an apprentice" checked, "Bigger space: not yet"                                         | Outcome                        |
| 7   | 19.5-21.5 | Mark, name, tagline, repository                                                                                       | Brand                          |

Timing per element: [ANIMATION-STORYBOARD.md](ANIMATION-STORYBOARD.md).

## On-screen text

"Two big decisions. What can the workshop afford?" / "Branch the plan instead of copying it." / "Each branch
keeps only what it changes." / "Compare the outcomes, month by month." / "Works offline. Prints a clean report."
/ "Decide with the numbers in front of you." / "Planwright" / "Branch a plan. Compare the outcomes. Decide." /
repository.

## Assets and sources

| Asset                                   | Source                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Laptop screen                           | `docs/screenshots/plan-branch.png`, captured from the running image                                                      |
| Report sheet                            | `docs/screenshots/print.png`, the app's print view                                                                       |
| Chart lines, run-out month, end balance | `animation/data/sample-balances.json`, the app's CSV export of the sample plan, produced by `animation/extract-data.mjs` |
| Sheet names, change chips, badge texts  | The sample plan and the app's own labels                                                                                 |
| Everything else                         | Original SVG in [animation/scene.js](../animation/scene.js)                                                              |
| Fonts                                   | Fraunces and Public Sans (SIL OFL)                                                                                       |
| Music                                   | None                                                                                                                     |

The workshop owner is an invented illustration, as is the sample business.

## Production

Same pipeline as the other portfolio films: SVG scene, deterministic `seek(t)`, Playwright frame capture,
ffmpeg encode; nothing in the app image. See [ANIMATION-RENDERING.md](ANIMATION-RENDERING.md).

## Acceptance checks

Reviewed on contact sheets and per-transition frames. Fixed before the final render: an empty right half in the
opening scene, change chips covering the tree connectors, the run-out flag sitting on the zero line, a sheet
title wider than its sheet, and the decision text changing before the owner had the report. Every capability
shown is implemented and covered by unit or E2E tests. No personal data.
