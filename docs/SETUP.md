# Setup

## Requirements

- Docker with Compose v2 (Docker Desktop on Windows, WSL 2 backend).
- PowerShell 7.2+ for `scripts/ops.ps1`.
- For development and tests: Node.js 24 and `npm ci`; Chromium for Playwright via `npx playwright install chromium`.

No `.env` is needed. `.env.example` lists the two optional overrides (`IMAGE_TAG`, `E2E_BASE_URL`); there are
no secrets.

## Run the demo

```powershell
./scripts/ops.ps1 setup     # docker compose build + up --wait
```

http://127.0.0.1:8104. The port is bound to 127.0.0.1 only. `restart: on-failure:3` means the container does
not start by itself after a reboot; run `ops.ps1 start`.

## Develop

```powershell
npm ci
npm run dev                 # http://127.0.0.1:5184 with hot reload
```

The service worker is only registered in production builds, so development always shows fresh code. To try
the production build without Docker: `npm run build; npm run preview` (http://127.0.0.1:4184).

## Checks

```powershell
./scripts/ops.ps1 test      # format, lint, types, unit tests, build, size budget
./scripts/ops.ps1 e2e       # Playwright against the running container
npm run screenshots         # regenerate docs/screenshots from the running container
```

## Clearing your plan

Data > Load sample plan (undoable), or clear site data for 127.0.0.1:8104 in the browser. Clearing site data
also removes the service worker and its cache.
