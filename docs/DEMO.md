# Demo script

About 6 minutes. Start with `./scripts/ops.ps1 start`, open http://127.0.0.1:8104 in a fresh browser profile
(or Data > Load sample plan).

1. **The plan (1 min).** Baseline of a fictional bike workshop: income and expense lines, a quarterly
   insurance bill, a yearly accounts fee. The summary says the cash lasts the whole plan, lowest in July 2027.
2. **Branches (1.5 min).** Open "Apprentice + bigger space" in the rail: it is a branch of "Hire an
   apprentice". Point at the marked rent field ("Changed here"), the added lines and the opening balance
   override. The summary compares with its parent and warns: runs out in March 2027.
3. **Inheritance (1 min).** Go to Baseline, change Mechanics' wages from 21000 to 22000. Back in the bigger
   space branch the wages changed too, the rent override did not. Press Ctrl+Z: both return.
4. **Compare (1 min).** Compare view: four lines with dash patterns and labels. Tab to the chart, use the arrow
   keys, End. Untick "Slow first year". Key figures show differences against Baseline.
5. **Your data (1 min).** Data > Plan file (JSON). Load sample plan, then import the file: preview, replace,
   Undo in the toast. Mention the format version and the format-1 upgrade.
6. **Offline and print (30 s).** DevTools > Network > Offline, reload: still works. Compare > Print view >
   Print or save as PDF.

## Questions to expect

- Why not copy the plan per scenario? See [DECISIONS.md](DECISIONS.md#scenarios-store-changes-not-copies).
- How big is undo history? 100 steps of shared immutable snapshots.
- What if the saved data is corrupt? It is kept aside and the sample loads with a message.
- What stops formula injection in CSV? Leading apostrophe for text starting with = + - @ tab CR.
