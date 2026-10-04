# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning: [SemVer](https://semver.org/).

## [0.1.0] - 2026-10-04

### Added

- Projection engine: month-by-month balances with compounding growth, lowest balance, run-out month.
- Branching scenarios that store only their changes; revert, restore, branch, delete with undo.
- Line cadence: monthly, quarterly, yearly, once.
- Undo and redo with keyboard shortcuts and coalesced typing; announcements for screen readers.
- Comparison of up to four scenarios: chart with keyboard cursor, key figures, monthly table, CSV export.
- Versioned JSON export and import (format 2) with preview, migration from format 1 and readable errors.
- CSV exports that neutralise formula-like text.
- Autosave in `localStorage`; unreadable saves are kept aside, not discarded.
- Offline support through a build-generated service worker; update prompt.
- Print view and print stylesheet.
- Light and dark themes, phone layout, reduced motion.
- nginx-unprivileged image with a strict CSP, Compose file bound to 127.0.0.1, CI with E2E, size budget,
  image scan, secret scan and dependency audit; manual, disabled deploy workflow.
