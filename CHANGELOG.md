# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Mobile version codes (`+NN`) come from `mobile/fajrak_flutter/pubspec.yaml`; dates and
descriptions come from `git log`, git tags, and `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md`.
Entries marked "(from release notes)" are derived from `PLAY_STORE_RELEASE.md` sections
rather than individual commits. Parenthesized values are commit hashes from this
repository's history, included as evidence. The web `package.json` version historically
lagged behind the mobile version (currently `3.42.0` vs mobile `3.44.0+63`) — see
`HANDOFF_REPORT.md` §9. Versions before 3.42.0 are recorded in summary form from release
notes and version-bump commits; see the note on links at the end of this file.

## [Unreleased]

### Added

- **Observability**: Sentry Flutter integrated for mobile crash reporting (app-init + global ErrorHandler, PII filtered in `beforeSend`; skipped gracefully when no `SENTRY_DSN` is provided).

### Fixed

- **Zakat live prices on Web**: the metal-price fallback crashed silently (`TypeError` at `fb['gold']`) because `freegoldapi.com/data/latest.json` serves a JSON array of historical records (gold only, ~8 months stale) — not the `{"gold","silver"}` map the code expected. The fallback now uses `api.gold-api.com` (CORS-enabled, live gold + silver, USD/troy-oz → per-gram). Also decoupled the exchange-rate fetch from the Yahoo `Future.wait`: previously any Yahoo failure (always, on Web, due to CORS) discarded the real FX rate and forced `usdRate = 1.0`, producing wrong-currency zakat amounts. Regression test rewritten against the real endpoint shapes.
- **Web debug boot (Sentry)**: fixed the `Zone mismatch` assertion on `flutter run -d chrome` — on Web, Sentry runs `appRunner` inside `runZonedGuarded`, so the Flutter binding is now initialized there (and on native as before) instead of the root zone before Sentry init.
- **Alerts screen (mobile)**: signed-out users no longer see an infinite
  spinner. `_load()` used to return before its `try/finally`, so `_loading`
  never cleared; the guard is now inside the `try` and `finally` always
  clears the flag. The load logic now lives in `AlertsService.fetchAlerts`.

### Changed

- **Alerts screen (mobile)**: the AI alert generator is a single compact
  banner — the duplicate floating button (previously shown next to the
  banner when the list was empty) and its 80 px spacer are gone. The unread
  counter pill was removed because the "unread" filter tab already shows
  the same number. The screen's data access moved into `AlertsService`. The
  8 placeholder widget tests (all `expect(true, isTrue)`) are replaced by
  real behavioural tests.

### Removed

- `alerts_unread_count` (mobile `ar.json` / `en.json`) — the label for the
  deleted `AlertHeader`; no longer referenced in code.

## [3.45.0+64] - 2026-10-19

Release commit `7269ffdd` (chore(release): bump version to 3.45.0+64 and update store notes, 2026-10-19). This release delivers the Zakat Engine v2, the full Zakat Autopilot stack (backend, cron, and countdown UI on Web + Mobile), and the associated security hardening. The web `package.json` intentionally stays at `3.42.0` — see `HANDOFF_REPORT.md` §9.

### Added

- **Unified Zakat Engine (v2)**: Centralized all Zakat calculation logic into PostgreSQL RPCs (`get_zakat_summary` v2 and `get_zakat_hauls`). The v2 summary keeps the v1 signature and keys, adds a `components` breakdown (`cash`, `investments`, `investment_cash`, `goals`, `gold`, `silver`, `other`, `debts`), a `GREATEST(…, 0)` clamp on negative nets, and an `engine_version` marker (migration `20261019000000_zakat_engine_v2.sql`).
- **Zakat Holdings Table**: Added `zakat_holdings` (RLS-enabled, gold/silver by grams; real-estate/inventory/other by USD value) to track assets server-side so the RPC includes them in the zakatable base.
- **Audit Columns**: Extended `zakat_history` with `engine_version`, `price_gold`, `price_silver`, `fx_rate`, and `nisab_effective`, making historical rows recomputable.
- **Zakat test fixtures + verification harness**: `supabase/tests/zakat_fixtures.sql` (13 golden edge cases: Nisab boundaries, negative-net clamp, gold/silver-heavy Nisab, zero prices, holdings, high FX) and `supabase/tests/zakat_engine_v2_test.sql` (sample proof; intentionally not in `supabase/migrations/`).
- **Zakat Autopilot — backend (Phase C)**: Zakat is now fully automated. A Hawl state machine lives in the database: new RPC `sync_zakat_haul_state(p_user_id, p_gold_price, p_silver_price, p_fx_rate)` (migration `20261021000000_zakat_autopilot.sql`) reuses engine v2 (`get_zakat_summary`, unmodified) and upserts the new RLS-protected `zakat_haul_tracking` row — above Nisab with no prior state → start the clock (`nisab_reached_at = now`, `current_haul_due_at = now + 354d`); above Nisab with an active Hawl → keep it (a running Hawl never restarts); below Nisab → clear both timestamps (the Hawl breaks). The RPC returns `days_remaining`, `zakat_due`, `nisab_effective`, `zakatable_assets`, `is_eligible`, etc. Security follows the engine-v2 conventions (`SECURITY DEFINER`, owner-verification guard, `authenticated`/`service_role` only; clients get SELECT-only — no INSERT/UPDATE policy, so a compromised token cannot forge its clock). A new daily Vercel Cron route `/api/zakat-autopilot` (`0 8 * * *`, `verifyCronAuth`) syncs every user via `service_role` and sends an Arabic Push (deep link `/dashboard/zakat`) when `days_remaining ≤ 7`, with a once-per-day do-not-disturb stamp (`last_notified_at`, written only by the cron).
- **Zakat Autopilot — Hawl countdown UI (Phase C, Web + Mobile)**: both dashboards call `sync_zakat_haul_state` on load (`hooks/useZakatHawl.ts` with a 1-hour staleTime on Web; `FinanceService.syncZakatHaulState()` on Mobile) and render a "حالة الحول (Zakat Hawl)" card near the Health Score: "بقي X يوماً" with tone bands Green > 60 days / Orange 7–60 / Red ≤ 7, a red "حان موعد زكاتك" state once the due date passes, and a muted below-Nisab state ("أنت تحت النصاب") with an "احسب زكاتك" button linking to the calculator. The Web and Mobile Zakat pages show the matching "🕒 حولك الحالي" banner. Neither client ever computes Hawl logic — both only render the RPC response.

### Changed

- **Web, Mobile, and Cron**: Removed all client-side Zakat math (Nisab, 2.5%, Hawl constants and helpers in TypeScript/Dart). The clients now act purely as input/display layers calling the unified RPCs; gold/silver grams entered by users are synced to `zakat_holdings` before each recalculation.
- **Zakat Reminder Cron**: Fixed a bug where it ignored `purchase_date` for Hawl calculations (it used `created_at` + 354 days inline); `/api/zakat-reminder` now relies on the `get_zakat_hauls` RPC via the service-role client.
- Documentation brought in line with the security hardening: incident post-mortem, risk register, handoff report, and migration counts updated (242f7a32).

### Fixed

- Resolved the discrepancy where Web and Mobile could display different Zakat amounts due to local rounding/logic differences; both now render the same server-computed values.
- **Dashboard gamification 401s**: The `GamificationCard` called `/api/gamification` (GET and POST) without the required `Authorization: Bearer <jwt>` header — the GET even sent a `user_id` query param, which the route ignores (identity comes from the token). Both requests returned 401, so the Wealth Journey card silently failed to render. The card now fetches the session and attaches the token, matching every other caller (dashboard page, learn page, onboarding, mobile). Added regression tests at both seams: the route contract (`__tests__/api/gamification.test.ts` — 401 with query param but no token; token user wins over query param) and the component call site (`__tests__/components/GamificationCard.test.tsx`).
- **`make run-web` built with empty credentials**: The `run-web` target invoked `flutter run -d chrome` with no `--dart-define` flags, so the dev web app compiled with an empty `SUPABASE_URL` and every auth call 404'd on `/auth/v1/token` — the same failure class as the 3.42.2 release incident. The nine `--dart-define` lines were also duplicated verbatim across `build-web`, `build-apk`, and `build-bundle`. They are now extracted into a shared `DART_DEFINES` variable in `mobile/fajrak_flutter/Makefile` (recursive `=` matters: with `:=` the `$$(grep …)` substitutions collapse at definition time and expand to empty, silently recreating the bug). `run-web` appends `$(DART_DEFINES)`; the three build targets were verified via `make -n` to produce token-identical commands to before.
- **Zakat screen crash fetching live gold/silver prices (Flutter Web)**: `_fetchLivePrices` cast raw JSON price values with `as num` / `as num?`. The upstream price sources (Yahoo `regularMarketPrice`, and the FreeGoldAPI fallback which the mobile app calls directly) can return numbers as Strings — on dart2js an `as num` failure surfaces as `TypeError: type 'String' is not a subtype of type 'int'`, which aborted the whole fetch and left the price fields unfilled (`zakat_calculator_screen.dart`). All four parse sites now go through a defensive `_parsePrice` helper (null → 0.0, num → double, String → `double.tryParse(…) ?? 0.0`), and the FreeGoldAPI fallback only overwrites a price field when the parsed value is > 0 — matching the Yahoo path's existing guard, so an unparseable value can no longer clobber the field with 0.

### Security

- **Anonymous clients can no longer call internal database RPCs.** Seven functions (health-score and sync RPCs such as `get_health_score` and `get_changed_records`) granted `EXECUTE` to `PUBLIC` by default, so any client holding the embeddable anon key could invoke them. Migration `supabase/migrations/20261018000000_linter_security_hardening.sql` revokes `PUBLIC` and `anon`, then grants `authenticated` and `service_role` explicitly (3db6ca2f, fca352be). Applied to production (project `ujwcvtpwsaidljecqbaa`) and verified on 2026-10-18 via `proacl`: all 14 internal RPCs now show `anon` EXECUTE revoked and `PUBLIC` EXECUTE revoked. Anon-key rotation remains outstanding and is tracked in `mobile/fajrak_flutter/INCIDENT.md`.
- The same migration pins `search_path = public` on four functions flagged with mutable search paths, and drops the duplicate index `health_score_history_user_date_uniq` (3db6ca2f).

## [3.44.0+63] - 2026-10-17

### Fixed

- **Arabic AI assistant replies are readable again.** Raw Markdown syntax and English filler words leaked into chat output; formatting, JOD three-decimal display, and prompt wording corrected (7ec50a96, b4d85e39; PLAY_STORE_RELEASE.md).
- **No more "Good morning" at 3 AM.** Alerts ignored the user's timezone; delivery is now gated to 05:00 to 10:59 in each user's local time (7ec50a96, b4d85e39).
- **Zero-budget false alarms stopped.** Budgets with `monthly_limit = 0` triggered "exceeded" alerts; a database trigger guard now skips them (b4d85e39, migration `supabase/migrations/20261017160000_zero_budget_trigger_guard.sql`).
- **Session loss no longer crashes the app.** 11 `currentUser!` force-unwraps across 10 files replaced with null-safe early returns (7ec50a96).
- **Firebase Cloud Messaging registration works on fresh installs.** The Firebase Installation ID registration API was missing from the Android manifest and is now enabled (48cfbaa0; PLAY_STORE_RELEASE.md).
- **Gamification is consistent** between the dashboard and the achievements screen (265b0905).
- The accounts screen no longer shows a RenderFlex overflow for long account names (PLAY_STORE_RELEASE.md).
- Splash-screen hang (FCM) and `AppDatabase` crash fixes shipped in 3.43.1 remained stable in this release (from release notes).

### Changed

- `flutter_markdown` (discontinued upstream) replaced with `flutter_markdown_plus` (dbcaeb33).
- Production incident post-mortem archived and the incident marked resolved, with the daily R2 backup pipeline and zero-budget trigger guard recorded (7de5b4f6, b061a6fa).

### Quality

- 592 Jest tests (66 suites) + 177 Flutter tests passing (from release notes).

## [3.43.2+61] - 2026-10-16

### Fixed

- **Onboarding and registration survive a missing session.** Both flows failed when no Supabase session existed yet; they now recover gracefully (0c7cb096, 27979ff7).
- `get_financial_dashboard` returns the real health score from the `get_health_score` RPC instead of a hardcoded `0` (e5197d3b).
- BYOK `/api/byok/config` test updated to cover all six providers.

## [3.43.1+60] - 2026-10-16

Production hotfix (PLAY_STORE_RELEASE.md).

### Fixed

- **Splash screen no longer hangs when Firebase Messaging registration fails.** A missing notification permission could stall `NotificationService.initialize()` at app startup; initialization now has a 5-second timeout as defense in depth (8ad9cdba, f209ada1).
- **Transactions screen no longer crashes at startup.** The offline database was read before initialization; a nullable `AppDatabase.maybeInstance` accessor now skips the sync queue gracefully when the database is not ready (f209ada1; PLAY_STORE_RELEASE.md).
- Skeleton loaders cap their row count to the available screen height (42089cd8).

## [3.43.0+59] - 2026-10-16

### Added

- The achievements screen is wired to the `/api/gamification` endpoint, with a `user_stats` fallback (a991ead2).
- The BYOK configuration endpoint `/api/byok/config` advertises all six supported providers; it previously advertised three (a2a865bd).

### Fixed

- Four database RPCs referenced by sync and the health cron were missing and are restored: `get_changed_records`, `get_deleted_records`, `calculate_health_score`, `get_health_score` (9da3ca48).
- FCM token registration uses the `onRegistered` hook (f02958ca).

### Changed

- The store listing was rewritten around the Fajrak brand (bdd2e2e4).
- `firebase_analytics` and the AD_ID permission were removed (2fd46a1b).
- The Gradle wrapper was bumped to 9.3.1 for AGP 9.1.0 compatibility (1caa6e02).
- Dependency: upgraded `@sentry/nextjs` to 10.73.0.

## [3.42.3+58] - 2026-10-15

### Added

- A daily Supabase backup pipeline now dumps the database with pg_dump 17 and uploads it to Cloudflare R2 from GitHub Actions (716c0c87, de6f13fd, 6ecd4665, 176d40d6).
- MCP server configurations added to the repo tooling.

### Fixed

- BYOK provider-key saves misread PostgREST insert results (c3d3acb9); `_handleSave` was split into focused helpers.
- Adding a provider key now surfaces the real failure cause instead of a generic error (4da78745).
- BYOK chat send auto-selects the provider key, so sending works without a manual selection (5e8b435c).
- The testimonial tile crashed with a ListTile assertion and is now wrapped in Material (f064717c).
- BYOK envelope configuration is resolved at runtime via `/api/byok/config` (f67504ae).

### Changed

- CI gates the build and Flutter analyze, runs Drift codegen first, and uses concurrency control with least-privilege permissions (57313bd1, 2da51d1a).
- Flutter dependencies were refreshed in `pubspec.lock`, including `flutter_local_notifications` 23.0.0-dev.3 (7e8bc068, c02d0c7d).

## [3.42.2+57] - 2026-09-30

### Added

- Playwright end-to-end tests run against a local Supabase instance with the system Chromium browser (a02a0042, dcc2e8ca, 80e13d09).

### Fixed

- **Production login failure.** Release builds ran without embedded credentials; the Makefile build targets now pass Supabase and Firebase values via `--dart-define` (317c847a; PLAY_STORE_RELEASE.md).
- Play Store compliance for Android 13+: the AD_ID permission is declared for Firebase Analytics (cd760be3).
- Edge-to-edge support for Android 15 (API 35): migrated from the deprecated `setStatusBarColor`/`setNavigationBarColor` to `enableEdgeToEdge()` with transparent system bar themes, and updated the target SDK to 35 (PLAY_STORE_RELEASE.md).
- The Sentry import now uses the non-deprecated path (391c5285).
- Version alignment fix (`c92ec226`).

### Changed

- BYOK settings and chat UX were refined, with test updates to match (badf315b).

## [3.42.2+56] - 2026-09-29

Play Store compliance and auth fixes (from release notes). Overlaps with [3.42.2+57] above, which supersedes this build.

### Fixed

- **Login failure on production builds**: credentials embedded via `--dart-define` in Makefile build targets (`make build-bundle`, `make build-apk`); direct `flutter build appbundle --release` bypassed them
- **AD_ID permission**: added `com.google.android.gms.permission.AD_ID` for Android 13+ Firebase Analytics compliance
- **Edge-to-Edge (Android 15/API 35)**: migrated from deprecated `setStatusBarColor`/`setNavigationBarColor` to `enableEdgeToEdge()`; Target SDK 35

## [3.42.0] - 2026-09-27

Release details from PLAY_STORE_RELEASE.md; audit trail in git (abb6d77f, c458cad7).

### Added

- The BYOK AI finance assistant: chat privately with your own LLM provider (Ollama, OpenAI, Anthropic, and others) directly in the app; API keys are encrypted on device with AES-256-GCM and RSA-OAEP before any proxy request and never leave the device in clear text (PLAY_STORE_RELEASE.md).
- BYOK security hardening: automatic credential rotation, a content moderation layer, idempotent retries for AI operations, and a unified tool-calling layer across providers (PLAY_STORE_RELEASE.md).
- Financial MCP server (`/api/mcp`, Streamable HTTP) with PAT-scoped tools.
- PAT (Personal Access Token) system `fjk_live_...` with scopes (`/api/api-keys/*`, `/api/webhook/transaction`).
- OpenTelemetry tracing for AI requests, with Grafana dashboards and PagerDuty alerts (PLAY_STORE_RELEASE.md).
- E2E test coverage for critical paths.

### Changed

- The typography system was consolidated from 19 styles to 8, with a design token migration for consistent theming (PLAY_STORE_RELEASE.md).
- Flutter web CORS handling for Supabase Auth was resolved and Firebase dependencies were upgraded for web compatibility (PLAY_STORE_RELEASE.md).
- Improved empty states with actionable guidance.

### Fixed

- Cleartext traffic configuration for Android and the Sentry SDK paths were corrected (PLAY_STORE_RELEASE.md).

## [3.40.0+52] - 2026-09-14

### Added

- BYOK UX polish: re-enter key flow + chat vault filtering (`0b9841db`, 2026-09-08)

### Fixed

- Mobile: currency-conversion operator precedence (`9fb7c48a`)
- Mobile: `passkeys_platform_interface` → 2.10.0
- Web push guard added

### Changed

- Senior technical-writer documentation audit across 4 doc areas (`63d5d8f9`)
- Dependency updates: `firebase_core`, `firebase_messaging`, `flutter_secure_storage` 11.2.0

## [3.39.1+50] - 2026-09-08

### Fixed

- CI: pass `GITHUB_TOKEN` to supabase `setup-cli` (fix latest-release rate limit)

### Changed

- Supabase migration versions aligned with remote history (`494fdd82`)
- Changelog entries added for the 3.39.x line (`7a362054`)

## [3.39.0] - 2026-09-06

LLM Ecosystem — BYOK Chat + Financial MCP server (`e0623271`).

### Added

- BYOK chat on web + financial MCP server foundations
- PAT/MCP/BYOK endpoints documented in `API_DOCS.md` (`76bf042d`)

## [3.38.0+48] - 2026-09-03

Dependency fixes and code quality (`cc9b8b4b`).

## [3.35.4] - 2026-05-03

### Added

- Flutter mobile app project initialized in-repo; download-page localization strings (`cb2f28c8`)

## [3.34.0] - 2026-04-28

### Added

- Salary sync functionality in Flutter (`3af2fa4d`)

## [3.32.x] - 2026-04-10 → 2026-04-20

### Added

- Android download landing page (`f61ed34d`, 2026-04-16)
- Flutter mobile project with bug fixes and i18n support (`5bad5964`, 2026-04-18)
- Task Master AI server configuration in `mcp.json` (`74ea0a8a`, 2026-04-14)

## [3.29.0+18] - 2026-04-04

### Added

- Mobile project structure (`76b5b557`)

## [3.28.0] - 2026-04-04

### Changed

- Test coverage documentation updated (`482e508b`)

## [3.26.0] - 2026-04-03

### Added

- Flutter project with new dashboard and navigation features (`7dc319cd`)

## [3.25.0] - 2026-04-03

### Changed

- Core logic migrated to Supabase RPC; dual-API live pricing implemented (`8c1f6ba1`)

## [3.23.0] - 2026-04-02

### Added

- Flutter project structure; investment and debt feature documentation (`e07a9211`)

## [3.18.0] - 2026-04-01

### Added

- New investment and debt features documented in README (`1cec0454`)

## [3.16.2+10] - 2026-03-31

### Fixed

- AAB build for Play Store; `compileSdk` bumped to 35 (`76c8ec46`)

## [2.0] - 2026-03-17

### Added

- Fajrak v2.0 APK, signed by PWABuilder (`9b9345ca`)

## [1.1] - 2026-03-15

### Added

- Fajrak v1.1 APK with correct assetlinks fingerprint (`01e13aed`)

## [1.0] - 2026-03-12

### Added

- FinanceTracker v1.0 APK — first tagged release (tag `v1.0.0`) (`9c981f32`)

## [0.1.0] - 2026-03-08

### Added

- Initial commit: FinanceTracker SaaS (`eff6c6c9`)

---

> **Note on links:** this repository only carries four git tags (`v1.0.0`, `v1.1.0`,
> `v1.6.0`, `v2.1.0-android`). Most releases above are recorded via version-bump commits
> and `PLAY_STORE_RELEASE.md`, not tags — so no compare URLs are provided. Use the cited
> commit hashes to inspect any release boundary.
