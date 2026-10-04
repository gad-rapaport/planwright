# File format

Plan files are UTF-8 JSON, at most 1 MB. The same format is used for autosave in `localStorage`
(key `planwright:workspace`).

```json
{
  "format": "planwright",
  "version": 2,
  "exportedAt": "2027-01-04T09:30:00.000Z",
  "workspace": {
    "plan": {
      "name": "…",
      "currency": "ILS",
      "startMonth": "2027-01",
      "months": 24,
      "openingBalance": 60000
    },
    "items": [
      {
        "id": "rent",
        "name": "Workshop rent",
        "kind": "expense",
        "category": "Premises",
        "amount": 7800,
        "cadence": "monthly",
        "start": 0,
        "end": null,
        "growth": 0
      }
    ],
    "scenarios": [
      { "id": "base", "name": "Baseline", "parentId": null, "notes": "", "changes": [] },
      {
        "id": "bigger-space",
        "name": "Bigger space",
        "parentId": "base",
        "notes": "",
        "changes": [
          { "type": "set", "itemId": "rent", "field": "amount", "value": 11500 },
          { "type": "opening", "value": 35000 },
          { "type": "add", "item": { "id": "fit-out", "…": "…" } },
          { "type": "remove", "itemId": "fees" }
        ]
      }
    ]
  }
}
```

## Rules

| Field                     | Rule                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------- |
| ids                       | 1-40 of `a-z 0-9 -`; scenario ids unique; item ids unique across baseline and branches |
| `name`                    | 1-80 characters after trimming                                                         |
| `currency`                | `ILS`, `EUR`, `USD`, `GBP`                                                             |
| `startMonth`              | `YYYY-MM`                                                                              |
| `months`                  | 1-60                                                                                   |
| `amount`                  | whole number 0 to 1,000,000,000 per occurrence                                         |
| `openingBalance`, opening | whole number, may be negative                                                          |
| `cadence`                 | `monthly`, `quarterly`, `yearly`, `once` (counted from `start`)                        |
| `start`, `end`            | month offsets 0-59 from `startMonth`; `end` null = to the end; `end >= start`          |
| `growth`                  | -50 to 50 percent per month, compounded from `start`                                   |
| scenarios                 | 1-8; exactly one baseline `id: "base"`, `parentId: null`, no changes; no cycles        |
| `set` changes             | `value` must be valid for `field`                                                      |
| unknown keys              | rejected everywhere                                                                    |

A `set` or `remove` change for a line that its parent no longer has is ignored when resolving and removed
by the editor; it is not an error in a file.

## Versions

| Version | Change                                                 | Upgrade                        |
| ------- | ------------------------------------------------------ | ------------------------------ |
| 1       | First format; every line monthly                       | to 2: add `cadence: "monthly"` |
| 2       | `cadence` on lines; `set` changes may target `cadence` | current                        |

Files with a newer version than the app knows are refused with a message to reload (a new version of the
app may be waiting in the service worker). Migrations only reshape; validation always runs on the result, so
a damaged old file still gets precise errors.

## CSV exports

CSV is for reading in spreadsheets, not for import. Files have a UTF-8 BOM, CRLF line ends and RFC 4180
quoting. Text cells starting with `=`, `+`, `-`, `@`, tab or carriage return get a leading apostrophe so they
open as text; numbers are written as numbers.
