# Slim configuration

The default is already slim: a static site behind one small nginx process.

| Setting         | Value                                                 | Measured 2026-10-04                 |
| --------------- | ----------------------------------------------------- | ----------------------------------- |
| Image           | nginx-unprivileged 1.30 Alpine slim + 0.6 MB of files | 21.9 MB unpacked, 6.2 MB compressed |
| Container       | 1 worker, 256 connections, 32 MB / 0.5 CPU / 32 pids  | 2.4 MiB, 2 pids, 0% CPU idle        |
| Browser         | 117 KB gzip JS before first render, 6.9 KB lazy       | see TESTING.md                      |
| Background work | None on the server; autosave debounced to 400 ms      |                                     |

There are no optional services, no database and no volumes. Development (`npm run dev`) needs only Node.
