# Production Incident — Post-Mortem

**Status:** RESOLVED (verified Oct 17, 2026)
**Project:** Supabase `ujwcvtpwsaidljecqbaa` (production)
**Severity:** Critical — production data plane partially unreachable

> Post-mortem archive for the production Supabase outage that began on/around
> 2026-10-11 and was resolved on 2026-10-17. Superseded by the daily backup
> pipeline and the zero-budget trigger guard described below.

---

## 1. Timeline

| Date | Event |
|------|-------|
| ≥ 2026-10-11 | Production Supabase DB (`ujwcvtpwsaidljecqbaa`) becomes unreachable; request success rate drops to ~0.2%. Unknown external client hammering `/rest/v1/testimonials`. |
| 2026-10-14 | First daily backup captured: `fajrak_backup_20261014_121600.dump` (2.78 MB). |
| 2026-10-15 | Daily backup captured (2.79 MB). |
| 2026-10-16 | Daily backup captured (2.80 MB). |
| 2026-10-17 | Incident **RESOLVED**. DB health restored, zero-budget trigger guard applied, backups confirmed flowing (2.83 MB dump). |

---

## 2. Root Causes

- **Free-tier Supabase project** — no point-in-time recovery (PITR) and limited platform-level resilience.
- **No backups configured** — a sustained failure could have meant permanent data loss.
- **Unknown external client** hammering the public read surface `/rest/v1/testimonials` (public `SELECT WHERE is_visible=true`) — read amplification, not a policy bypass.
- Contributed: the Supabase **anon key is embedded in shipped clients** (rotation was pending).

---

## 3. Resolution Steps Taken

1. **Backups automation (a):** Enabled a daily GitHub Actions → Cloudflare R2 backup pipeline.
   - Workflow: `.github/workflows/supabase-backup.yml` (`Supabase Daily Backup`).
   - Schedule: daily at `02:00 UTC` (= `05:00` Amman).
   - Destination: Cloudflare R2 bucket `fajrak-backups`.
2. **Zero-budget trigger guard (b):** Applied the SQL guard
   `supabase/migrations/20261017160000_zero_budget_trigger_guard.sql` to production,
   preventing false "budget exceeded" alerts when `monthly_limit = 0`.
3. **DB health restored (c):** Production request success recovered; the app is serving normally.

---

## 4. Verification Evidence

**Backups (Cloudflare R2 bucket `fajrak-backups`):**

| Dump | Size |
|------|------|
| `fajrak_backup_20261014_121600.dump` | 2.78 MB |
| `fajrak_backup_20261015_*.dump` | 2.79 MB |
| `fajrak_backup_20261016_*.dump` | 2.80 MB |
| `fajrak_backup_20261017_*.dump` | 2.83 MB |

- GitHub Actions run **"Supabase Daily Backup #8"** completed successfully (3m 24s, 2.35 MB artifact).

**Zero-budget guard (production):**
- In the Supabase SQL Editor, `SELECT pg_get_functiondef('public.check_budget_limits'::regproc)`
  returns a body containing:

  ```sql
  IF v_budget.monthly_limit IS NULL OR v_budget.monthly_limit <= 0 THEN RETURN NEW; END IF;
  ```

- Confirms the guard is live in production, matching the committed migration.

---

## 5. Outstanding Items

- **Rotate the Supabase anon key** (still recommended post-incident — the key is embedded in clients).
- **Consider upgrading off the Free tier** to enable PITR and higher platform resilience.
- **Keep the daily R2 backup pipeline monitored** (alert on consecutive failed runs).

## Security Hardening Backlog

- Linter report reviewed. Migration `supabase/migrations/20261018000000_linter_security_hardening.sql` committed (2026-10-17):
  - **7 internal RPCs hardened:** `calculate_health_score`, `get_health_score`, `check_and_reserve_idempotency_key`, `complete_idempotency_key`, `cleanup_expired_idempotency_keys`, `get_changed_records`, `get_deleted_records`.
  - Each gets `REVOKE EXECUTE ... FROM PUBLIC, anon` + explicit `GRANT ... TO authenticated, service_role`.
  - **Why PUBLIC too:** PostgreSQL functions grant `EXECUTE` to `PUBLIC` by default, so revoking from `anon` alone is insufficient. The initial revision only revoked from `anon`; corrected in follow-up commit `fca352be`.
  - `search_path = public` pinned on the 4 flagged functions (incl. `update_updated_at_column`).
  - Duplicate index `health_score_history_user_date_uniq` dropped.
- **Open:** verify the migration is applied in production (`npx supabase db push` or SQL editor) and re-check that mobile/web RPC flows still work after the grants are live.
- **Security hardening fixes applied 2026-10-19** (two-phase safety audit; each fix landed test-first — see `CHANGELOG.md` `[3.45.0+64]`):
  - **Fix A — localized Zakat Autopilot push copy.** `app/api/zakat-autopilot/route.ts` had hardcoded Arabic push title/body (CLAUDE.md Rule 2). Added 5 locale keys to `lib/locales/{ar,en}/zakat.ts` (`zakat_autopilot_push_title_due`, `_body_due`, `_title_approaching`, `_body_approaching`, `_body_approaching_one`); the route now selects the locale from `profiles.lang` (fallback `ar`) and picks due vs. approaching wording by `days_remaining`.
  - **Fix B — quiet-hours notification stamp.** The cron stamped `last_notified_at` unconditionally, so a user suppressed by quiet hours / disabled notifications / no device was counted as notified and silently skipped for the rest of the day. The route now captures `sendPushToUser`'s return and only stamps + counts when a push was actually delivered.
  - **Fix C — Hawl sync now passes live prices.** `sync_zakat_haul_state` was invoked with only `p_user_id`, so the state machine evaluated Nisab against the stale defaults (gold 30 / silver 0.35 / fx 1.0) and a display read could wrongly start or clear the hawl clock. `hooks/useZakatHawl.ts` and `FinanceService.syncZakatHaulState()` accept optional live prices; the Zakat pages pass gold/silver/USD-rate. `get_zakat_hauls` was not used because it returns the per-investment haul list, not the aggregate tracking state the cards render — switching would require a schema change (out of scope).
  - **Still open:** anon-key rotation (§5) unchanged by these fixes.
- **Sentry mobile integration added (release 3.45.0+64)** — mobile crashes now observable. `sentry_flutter` is wired at app-init (`SentryService.init` in `lib/main.dart`, skipped gracefully when no `SENTRY_DSN` dart-define is present) and in the global `ErrorHandler` (release mode only; handled errors are never rethrown, so Sentry's uncaught-exception handler never double-reports them). PII is stripped in `beforeSend` (email/IP, `password`/`anon_key`/`apikey`-style fields; events with `Authorization`/`Cookie` headers are dropped) per CLAUDE.md Critical Rule #12. The DSN is injected by the Makefile (`run`, `build-apk`, `build-bundle`) via unanchored grep on `.env`; web keeps its separate Sentry project. **Open:** create a Flutter project in Sentry (`abdoocoder-m2`) and put its DSN in `.env` — currently no Flutter project is registered, so events will not land until then. Anon-key rotation (§5) still open.

## Runtime Bugs Resolved (2026-10-19)

Three production-affecting runtime bugs found and fixed during the post-release hardening pass. All on origin/main.

### 1. Zakat live-price fallback was broken (freegoldapi → gold-api.com)
- **Symptom**: On web, tapping "Fetch Live Prices" threw `TypeError: "gold": type 'String' is not a subtype of type 'int'` at `zakat_calculator_screen.dart:87`. Gold/silver fields silently stayed at defaults (30 / 0.35).
- **Root cause**: `freegoldapi.com/data/latest.json` returns a JSON **Array** of `{date, price, source}` historical records (gold-only, last record ~2026-02-20, ~8 months stale). The code did `fb['gold']` on a List — a TypeScript-style subscript on a Dart List throws.
- **Fix**: Replaced with `api.gold-api.com/price/{XAU,XAG}` — CORS-enabled (`Access-Control-Allow-Origin: *`), live, keyless, returns `{"price": <num|String>, "symbol": "XAU"|"XAG"}`. Divides by 31.1035 g/oz for per-gram consistency.
- **Commit**: aba3df23

### 2. usdRate was silently discarded on web
- **Symptom**: Web users in JOD/SAR/AED saw zakat amounts ~41% higher than correct (silent wrong number, no crash).
- **Root cause**: `Future.wait([yahoo_gold, yahoo_silver, fetchExchangeRate]).catchError(→[404,404,1.0])`. Yahoo is always CORS-blocked on web, so the whole wait rejected and the real JOD rate from `open.er-api.com` (via Supabase) was replaced with 1.0.
- **Fix**: Exchange-rate fetch is now a separate `Future` with its own `catchError` — Yahoo failure no longer touches `usdRate`.
- **Commit**: aba3df23

### 3. Zone mismatch on web boot (Sentry)
- **Symptom**: `flutter run -d chrome` printed a debug-only assertion: `Zone mismatch. The Flutter bindings were initialized in a different zone than is now being used.` Non-fatal, debug-only, but noisy in Sentry.
- **Root cause**: `WidgetsFlutterBinding.ensureInitialized()` ran in main()'s root zone; Sentry's web init uses `runZonedGuarded`, so `runApp` ran in the forked zone.
- **Fix**: On web, skip the pre-Sentry binding init (`if (!kIsWeb)`); initialize inside `_bootstrapApp` which runs inside Sentry's zone. Native unchanged.
- **Commit**: 6e05bc5a
