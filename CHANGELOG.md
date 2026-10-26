# Changelog

## [Unreleased]

### Security
- Dependencies: patched **14 critical** and **41 high** advisories in production
  dependencies (`npm audit --omit=dev`: 74 → 1). Upgraded `next@16.4.3`
  (pulls `sharp@0.35.5`), `@sentry/nextjs@10.76.2`, `dompurify@3.4.17`,
  `@modelcontextprotocol/server@2.4.0`, `zod@4.6.7`. Added same-major
  `overrides` for `@grpc/grpc-js@^1.14.6`, `source-map-js@^1.2.2`,
  `jsdom → undici@^8.12.3`, and `handlebars@^4.7.10`. Removed the unused direct
  `npx@^10.2.2` dependency — its bundled `npm@5.1.0` tree (`request`,
  `tar@2.2.1`, `form-data@2.1.4`, `minimist`, `hawk`, `hoek`, `boom`, …)
  accounted for most of the critical findings and was never imported.
  No application logic changed.
  Remaining and accepted: `fast-uri@3.1.8` (moderate; the fix is a `4.x` major
  bump through `ajv`) plus dev-only `solid-js`/`seroval` criticals, which
  cannot be patched without leaving `solid-js`'s `~1.5.4` range.

## [3.46.0] — 2026-10-25

### Fixed
- Zakat: `sync_zakat_haul_state` now receives live gold/silver/FX prices in
  the daily cron and both dashboards. Previously computed Hawl at stale
  defaults ($30/g gold) — 2.7x under current price.
- Alerts: backfilled 3,799 fingerprints, removed 6,436 duplicate alerts.
  Unique index now enforces dedup.
- Currency: onboarding uses `detectCurrency()` (high-confidence), falls back
  to KWD. Prod DB default changed JOD → KWD.
- Fixed a debug-only Sentry "Zone mismatch" warning on Flutter web by ensuring
  the Flutter binding is initialized inside Sentry's zone.

### Security
- DB: revoked `anon` INSERT/UPDATE/DELETE/TRUNCATE on all tables. `anon` has
  SELECT only on `testimonials`. No app flows affected.
- Sentry (web): `sendDefaultPii` disabled on the server and edge runtimes;
  `beforeSend` now strips the user context and redacts IP/credential headers
  (`x-forwarded-for`, `x-real-ip`, `cookie`, `set-cookie`, `authorization`)
  before events leave the process (rule 12).
- Sentry (web): dropped `Failed to find Server Action` events aimed at the
  action-less landing route — bot/malformed traffic, not deploy skew. Genuine
  skew failures on routes with Server Actions still report.

### Internal
- Deploy: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` now targets preview as well as
  production; documented in `.env.example` and HANDOFF_REPORT §13.
- Docs: web test counts reconciled to 710 tests / 77 suites across
  PROJECT_CONTEXT §4, HANDOFF_REPORT, CLAUDE.md, CONTRIBUTING.md and
  `docs/ci-cd.md` (the CI count guard compares the suites to §4).
- Docs: reconciled test counts (695/76/25/6), removed stale AD_ID claim,
  corrected profiles column count.
- DB: added baseline snapshot for review (not a runnable migration).
- MCP: clarified `get_cashflow_summary` is a TS helper, not an RPC.