# Storage

Measured 2026-10-04.

| Item                     | Size                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `planwright:local` image | 21.9 MB unpacked, 6.2 MB compressed                                            |
| Volumes                  | None                                                                           |
| `node_modules/`          | 148 MB (development only, rebuildable with `npm ci`)                           |
| `dist/`                  | 0.6 MB (rebuildable)                                                           |
| Browser, per visitor     | Plan in `localStorage` (tens of KB), app files in Cache Storage (about 0.5 MB) |

Removing everything: `docker compose down`, `docker image rm planwright:local`, and delete the rebuildable
folders `node_modules/`, `dist/`, `playwright-report/`, `test-results/`. Visitors clear their own data through
the browser's site settings.
