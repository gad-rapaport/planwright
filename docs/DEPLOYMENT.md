# Deployment

Nothing is deployed. This describes the prepared path for a future public demo.

## Pipeline

- **CI** (`.github/workflows/ci.yml`) on pushes to `main` and pull requests: format, lint, types, unit tests,
  build, size budget; Docker build and E2E against the image; Trivy report; gitleaks over full history and
  `npm audit` for production dependencies. Read-only token, actions pinned to commit SHAs, superseded runs
  cancelled.
- **Deploy** (`.github/workflows/deploy.yml`) runs only when started by hand. `publish` pushes
  `ghcr.io/<owner>/planwright:<sha>`; `deploy` is skipped unless the repository variable `DEPLOY_ENABLED` is
  `true` and the `demo` environment approves it. Neither exists today.

## Server layout (when it exists)

```
/srv/planwright/compose.yaml
/srv/planwright/compose.prod.yaml    image pinned by digest, port 127.0.0.1:8104
/srv/planwright/deploy.sh            deploy by digest, automatic rollback if unhealthy
```

A reverse proxy on the host terminates TLS, adds HSTS and forwards to 127.0.0.1:8104. The container never
listens publicly.

## Rollback

`./deploy.sh --rollback` starts the previous digest from `.deploy-history`. No data migration is involved
because the server stores no data. Visitors' browsers keep their plans; files exported by a newer version
(higher format number) are refused by an older version with a clear message, so roll back before people start
exporting new-format files, or accept that.

## Service worker and releases

A release changes `sw.js`. Open tabs see "New version: reload" on their next navigation or update check and
switch when the person clicks it. A broken release can be replaced by a fixed one the same way; there is no
"kill switch" worker, since the update path is the normal path.
