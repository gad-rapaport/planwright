# Security

## Threat model

No accounts, no server-side data, no third-party requests. What remains:

| Threat                                                | Control                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Script injection through imported files or typed text | React escapes all text; no `dangerouslySetInnerHTML`; CSP `script-src 'self'`, no inline scripts    |
| Malicious or malformed plan file                      | 1 MB limit before parsing; strict schema (unknown keys rejected); tree checks; nothing evaluated    |
| Prototype pollution via JSON keys                     | `JSON.parse` output goes through strict Zod objects that only copy known keys                       |
| CSV formula injection (=, +, -, @, tab, CR)           | Text cells prefixed with `'`; numbers stay numeric; unit and E2E tests                              |
| Clickjacking                                          | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                                   |
| Data leaving the device                               | `connect-src 'self'` and no network calls besides loading the app; downloads are local blob URLs    |
| Data loss                                             | Autosave; unreadable saves kept aside; storage errors shown; undo for destructive actions; export   |
| Stale or poisoned cache                               | Service worker caches only same-origin GETs from a precache list fixed at build time                |
| Container compromise                                  | nginx as uid 101, read-only root, `cap_drop: ALL`, `no-new-privileges`, 32 MB / 32 pids, no secrets |

## Headers (deploy/nginx/security-headers.conf)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
  font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none';
  base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Frame-Options: DENY
```

`style-src 'self'` works because React sets inline styles through the CSSOM, which CSP does not block, and no
`<style>` or `style=""` markup is generated. HSTS belongs on the TLS-terminating proxy, not here.

## What is stored where

`localStorage` on the visitor's device: the plan (`planwright:workspace`) and any unreadable earlier copy
(`planwright:unreadable:<time>`). Cache Storage: the app's own files. Nothing else, no cookies, no analytics.

## Supply chain

Exact versions and a lockfile; `npm ci` in CI and in the image build; production dependency audit and
gitleaks in CI; Trivy report on the image (report-only, base image findings are fixed by rebuilding on a
newer nginx tag). The runtime image contains only nginx and built files: no Node, no `node_modules`.

## Known gaps

- `localStorage` is readable by any script on the same origin; the CSP keeps that to the app's own code. A
  shared machine user can read the plan; the app is not meant for secrets.
- No Subresource Integrity: all scripts are same-origin and hashed by name.
