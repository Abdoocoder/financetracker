# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions in this file track the mobile app version in `mobile/fajrak_flutter/pubspec.yaml` (`major.minor.patch+build`). Versions before 3.42.0 are not listed; this is a deliberate omission, not an oversight. Every entry below is sourced from `git log` or `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md`. Parenthesized values are commit hashes from this repository's history, included as evidence.

## [Unreleased]

### Added

- **Unified Zakat Engine (v2)**: Centralized all Zakat calculation logic into PostgreSQL RPCs (`get_zakat_summary` v2 and `get_zakat_hauls`). The v2 summary keeps the v1 signature and keys, adds a `components` breakdown (`cash`, `investments`, `investment_cash`, `goals`, `gold`, `silver`, `other`, `debts`), a `GREATEST(…, 0)` clamp on negative nets, and an `engine_version` marker (migration `20261019000000_zakat_engine_v2.sql`).
- **Zakat Holdings Table**: Added `zakat_holdings` (RLS-enabled, gold/silver by grams; real-estate/inventory/other by USD value) to track assets server-side so the RPC includes them in the zakatable base.
- **Audit Columns**: Extended `zakat_history` with `engine_version`, `price_gold`, `price_silver`, `fx_rate`, and `nisab_effective`, making historical rows recomputable.
- **Zakat test fixtures + verification harness**: `supabase/tests/zakat_fixtures.sql` (13 golden edge cases: Nisab boundaries, negative-net clamp, gold/silver-heavy Nisab, zero prices, holdings, high FX) and `supabase/tests/zakat_engine_v2_test.sql` (sample proof; intentionally not in `supabase/migrations/`).

### Changed

- **Web, Mobile, and Cron**: Removed all client-side Zakat math (Nisab, 2.5%, Hawl constants and helpers in TypeScript/Dart). The clients now act purely as input/display layers calling the unified RPCs; gold/silver grams entered by users are synced to `zakat_holdings` before each recalculation.
- **Zakat Reminder Cron**: Fixed a bug where it ignored `purchase_date` for Hawl calculations (it used `created_at` + 354 days inline); `/api/zakat-reminder` now relies on the `get_zakat_hauls` RPC via the service-role client.

### Fixed

- Resolved the discrepancy where Web and Mobile could display different Zakat amounts due to local rounding/logic differences; both now render the same server-computed values.

### Security

- **Anonymous clients can no longer call internal database RPCs.** Seven functions (health-score and sync RPCs such as `get_health_score` and `get_changed_records`) granted `EXECUTE` to `PUBLIC` by default, so any client holding the embeddable anon key could invoke them. Migration `supabase/migrations/20261018000000_linter_security_hardening.sql` revokes `PUBLIC` and `anon`, then grants `authenticated` and `service_role` explicitly (3db6ca2f, fca352be). Applied to production (project `ujwcvtpwsaidljecqbaa`) and verified on 2026-10-18 via `proacl`: all 14 internal RPCs now show `anon` EXECUTE revoked and `PUBLIC` EXECUTE revoked. Anon-key rotation remains outstanding and is tracked in `mobile/fajrak_flutter/INCIDENT.md`.
- The same migration pins `search_path = public` on four functions flagged with mutable search paths, and drops the duplicate index `health_score_history_user_date_uniq` (3db6ca2f).

### Changed

- Documentation brought in line with the security hardening: incident post-mortem, risk register, handoff report, and migration counts updated (242f7a32).

## [3.44.0+63] - 2026-10-17

### Fixed

- **Arabic AI assistant replies are readable again.** Raw Markdown syntax and English filler words leaked into chat output; formatting, JOD three-decimal display, and prompt wording corrected (7ec50a96, b4d85e39; PLAY_STORE_RELEASE.md).
- **No more "Good morning" at 3 AM.** Alerts ignored the user's timezone; delivery is now gated to 05:00 to 10:59 in each user's local time (7ec50a96, b4d85e39).
- **Zero-budget false alarms stopped.** Budgets with `monthly_limit = 0` triggered "exceeded" alerts; a database trigger guard now skips them (b4d85e39, migration `supabase/migrations/20261017160000_zero_budget_trigger_guard.sql`).
- **Session loss no longer crashes the app.** 11 `currentUser!` force-unwraps across 10 files replaced with null-safe early returns (7ec50a96).
- **Firebase Cloud Messaging registration works on fresh installs.** The Firebase Installation ID registration API was missing from the Android manifest and is now enabled (48cfbaa0; PLAY_STORE_RELEASE.md).
- **Gamification is consistent** between the dashboard and the achievements screen (265b0905).
- The accounts screen no longer overflows for long account names (PLAY_STORE_RELEASE.md).

### Changed

- `flutter_markdown` (discontinued upstream) replaced with `flutter_markdown_plus` (dbcaeb33).
- Production incident post-mortem archived and the incident marked resolved, with the daily R2 backup pipeline and zero-budget trigger guard recorded (7de5b4f6, b061a6fa).

## [3.43.2+61] - 2026-10-16

### Fixed

- **Onboarding and registration survive a missing session.** Both flows failed when no Supabase session existed yet; they now recover gracefully (0c7cb096, 27979ff7).
- `get_financial_dashboard` returns the real health score from the `get_health_score` RPC instead of a hardcoded `0` (e5197d3b).

## [3.43.1+60] - 2026-10-16

Production hotfix (PLAY_STORE_RELEASE.md).

### Fixed

- **Splash screen no longer hangs when Firebase Messaging registration fails.** A missing notification permission could stall app startup; initialization now has a 5-second timeout as defense in depth (8ad9cdba, f209ada1).
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

## [3.42.3+58] - 2026-10-15

### Added

- A daily Supabase backup pipeline now dumps the database with pg_dump 17 and uploads it to Cloudflare R2 from GitHub Actions (716c0c87, de6f13fd, 6ecd4665, 176d40d6).

### Fixed

- BYOK provider-key saves misread PostgREST insert results (c3d3acb9).
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

### Changed

- BYOK settings and chat UX were refined, with test updates to match (badf315b).

## [3.42.0] - 2026-09-27

Release details from PLAY_STORE_RELEASE.md; audit trail in git (abb6d77f, c458cad7).

### Added

- The BYOK AI finance assistant: chat privately with your own LLM provider (Ollama, OpenAI, Anthropic, and others) directly in the app; API keys are encrypted on device with AES-256-GCM and RSA-OAEP before any proxy request and never leave the device in clear text (PLAY_STORE_RELEASE.md).
- BYOK security hardening: automatic credential rotation, a content moderation layer, idempotent retries for AI operations, and a unified tool-calling layer across providers (PLAY_STORE_RELEASE.md).
- OpenTelemetry tracing for AI requests, with Grafana dashboards and PagerDuty alerts (PLAY_STORE_RELEASE.md).

### Changed

- The typography system was consolidated from 19 styles to 8, with a design token migration for consistent theming (PLAY_STORE_RELEASE.md).
- Flutter web CORS handling for Supabase Auth was resolved and Firebase dependencies were upgraded for web compatibility (PLAY_STORE_RELEASE.md).

### Fixed

- Cleartext traffic configuration for Android and the Sentry SDK paths were corrected (PLAY_STORE_RELEASE.md).
