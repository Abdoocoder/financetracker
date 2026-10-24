# Changelog

## [3.46.0] — 2026-10-25

### Fixed
- Zakat: `sync_zakat_haul_state` now receives live gold/silver/FX prices in
  the daily cron and both dashboards. Previously computed Hawl at stale
  defaults ($30/g gold) — 2.7x under current price.
- Alerts: backfilled 3,799 fingerprints, removed 6,436 duplicate alerts.
  Unique index now enforces dedup.
- Currency: onboarding uses `detectCurrency()` (high-confidence), falls back
  to KWD. Prod DB default changed JOD → KWD.

### Security
- DB: revoked `anon` INSERT/UPDATE/DELETE/TRUNCATE on all tables. `anon` has
  SELECT only on `testimonials`. No app flows affected.

### Internal
- Docs: reconciled test counts (695/76/25/6), removed stale AD_ID claim,
  corrected profiles column count.
- DB: added baseline snapshot for review (not a runnable migration).
- MCP: clarified `get_cashflow_summary` is a TS helper, not an RPC.