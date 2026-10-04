# Operations

## Commands

| Command                      | What it does                                                  |
| ---------------------------- | ------------------------------------------------------------- |
| `ops.ps1 setup`              | Build the image, start it and wait for health                 |
| `ops.ps1 start` / `stop`     | Start (and wait for `/healthz`) / remove the container        |
| `ops.ps1 status`             | State, health, CPU, memory, pids                              |
| `ops.ps1 logs`               | Last 200 lines (nginx access and error log on stdout/stderr)  |
| `ops.ps1 test` / `e2e`       | Checks and unit tests / Playwright against the container      |
| `ops.ps1 seed`               | Explains: the sample plan is built into the app               |
| `ops.ps1 backup` / `restore` | Explains: plans live in browsers; use Data > Export / Import  |
| `ops.ps1 reset-demo -Yes`    | Recreates the container; prints how to reset a browser's plan |

Seed, backup and restore exist so every portfolio project has the same commands; for a static site they are
honest no-ops with directions, not fake work.

## Health

`GET /healthz` returns `ok` from nginx itself (no file access, never cached by the service worker). Docker
checks it every 15 s with busybox `wget`. Compose marks the container unhealthy after 3 failures;
`restart: on-failure:3` restarts it if nginx exits.

## Logs

One access-log line per request: client, time, request, status, bytes, user agent. No plan data is ever sent
to the server, so logs cannot contain it. Rotation: 2 files of 2 MB (json-file driver).

## Runbooks

**Container unhealthy.** `ops.ps1 logs`. A config error shows as `nginx: [emerg]` at start; fix
`deploy/nginx/*.conf`, rebuild. Read-only filesystem errors mean a path outside `/tmp` is being written;
check the tmpfs in `compose.yaml`.

**Someone sees an old version.** Their tab is controlled by the previous service worker. They get "New version:
reload"; if they dismissed it, the next navigation offers it again. Clearing site data always works.

**"The saved plan could not be read".** The app kept the unreadable copy under `planwright:unreadable:<time>`
in `localStorage` and loaded the sample. Copy it out in the browser console
(`localStorage.getItem('planwright:unreadable:<time>')`), save it as a file and inspect the import errors on
the Data page.

**"Not saved: browser storage is full / unavailable".** Export immediately (Data > Export). Free space or allow
site data for the origin, then import the file.

**Image vulnerability report.** Rebuild on the newest `nginxinc/nginx-unprivileged:1.30-alpine-slim`; the app
has no runtime dependencies of its own in the image.

## Failure drill (done 2026-10-04)

Scripted with Playwright against the local container:

1. With a tab open, `docker compose stop web`. In the tab: changed a line amount (saved), reloaded the page,
   opened Compare (a lazy chunk). All worked from the service worker cache and `localStorage`; the edit was
   still there after the reload.
2. `docker compose start web`: `/healthz` answered after 0.4 s; Docker reported healthy at its next check.
3. The E2E offline test covers the same path with the browser's network disabled on every CI run.
