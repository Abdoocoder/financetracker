# Contributing to FinanceTracker (Fajrak)

## Prerequisites

- **Node.js 20 or newer.** This repo has no `.nvmrc`; any modern LTS works (environment check on 2026-10-18 ran Node v26.12.0).
- **Flutter 3.47.7** (stable channel, Dart 3.13.5), as reported by `flutter --version` on 2026-10-18.
- **Android SDK.** `mobile/fajrak_flutter/android/app/build.gradle.kts` sets `targetSdk = flutter.targetSdkVersion` (Flutter-pinned; the migration to target SDK 35 is recorded in `CHANGELOG.md` under `[3.42.2+57]`).
- **Supabase CLI 2.116.0** (`supabase --version` on 2026-10-18).
- **JDK 17 or newer.**
- **Linux desktop build deps** (only for `flutter run -d linux` / `flutter build linux`):
  `sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev libstdc++-12-dev liblzma-dev libcurl4-openssl-dev zlib1g-dev`.
  The last two are required by the `sentry_flutter` plugin, which vendors `sentry-native`
  and builds it via CMake with `find_package(CURL REQUIRED COMPONENTS AsynchDNS)`. Without the
  *development* packages the build fails with `Could NOT find CURL (missing: CURL_LIBRARY
  CURL_INCLUDE_DIR AsynchDNS)`. `cd mobile/fajrak_flutter && make setup-linux` installs the
  full list; `libcurl4-openssl-dev` also pulls the whole `Requires.private` chain that
  `libcurl.pc` declares, so no extra packages are needed.
  If you see `Could NOT find CURL (missing: AsynchDNS) (found version "8.18.0")` instead,
  the `CURL_*` values are stale in `build/linux/x64/debug/CMakeCache.txt` — install the dev
  package, then `rm -rf build/linux` and rebuild. See the Linux desktop section of
  `mobile/fajrak_flutter/README.md`.

## Setup

1. Clone the repo: `git clone git@github.com:Abdoocoder/financetracker.git`
2. Install web dependencies: `npm install`
3. Provide `.env` at the repo root. `.env.example` exists in the repo: copy it with `cp .env.example .env` and fill in real values. Never commit real secrets.
4. Fetch mobile dependencies: `cd mobile/fajrak_flutter && flutter pub get`

## Build and run

- **Web dev server:** `npm run dev` (port 3000)
- **Web production build:** `npm run build`
- **Mobile debug (physical device or emulator):** `cd mobile/fajrak_flutter && make run`
- **Mobile release bundle:** `cd mobile/fajrak_flutter && make build-bundle`

> **Never run `flutter build appbundle --release` directly.** The Makefile passes Supabase and Firebase credentials through `--dart-define`. Bypassing it produces a build with empty credentials, which caused a production login failure in a previous release (see `CHANGELOG.md` under `[3.42.2+57]`).

## Tests

- **Web unit and integration:** `npm test` (592 tests across 66 suites in `__tests__/`, per `CLAUDE.md`)
- **Web end-to-end:** `npm run test:e2e` (Playwright, needs a running dev server)
- **Mobile:** `cd mobile/fajrak_flutter && flutter test` (177 tests, per `CLAUDE.md`)
- **Full health check:** `npm run doctor` (audit + lint + typecheck + test coverage + build)

## Conventions

- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `security(db):`
- **All user-facing strings must go through i18n** (web: `lib/locales/{en,ar}/`, mobile: `assets/i18n/`). Never hardcode strings.
- **Every user-visible change gets an entry in `CHANGELOG.md`** under `[Unreleased]`.
- **Never commit:** `.env`, `.env.local`, `google-services.json`, keystores
- **INCIDENT.md is tracked** and should be committed with doc updates (it holds public post-mortems). Do not re-add it to `.gitignore`.

## Critical Rules

Copied verbatim from the `## Critical Rules` section of `CLAUDE.md`:

1. Never bypass RLS — All queries must respect `auth.uid() = user_id`
2. Never hardcode user-facing strings — Always use `lib/locales/{en,ar}/`
3. Never log BYOK keys — Envelope encryption only; keys stored encrypted
4. Server Components by default — Add `'use client'` only when required
5. Admin client only for system operations — Crons, webhooks, migrations
6. Test multi-currency flows — Exchange rates, original_amount/original_currency fields
7. Respect quiet hours — Check `notification_preferences` before sending pushes
8. **Migrations are NOT the source of truth** — live prod has tables/columns with no
   CREATE TABLE migration (`user_stats`, `testimonials`, `saving_challenges`,
   `health_score_history`, 25+ extra `profiles` columns). Never run `supabase db reset`
   against prod, and diff schema against prod before trusting migration output.
   See `HANDOFF_REPORT.md` + `mobile/fajrak_flutter/INCIDENT.md` (prod outage 2026-10-11 → RESOLVED 2026-10-17; anon key rotation still recommended).
9. **Do NOT anchor the `grep` calls in `mobile/fajrak_flutter/Makefile`.** `.env` stores
   Firebase values under `FLUTTER_FIREBASE_*`; the unanchored `grep` is load-bearing.
   Anchoring it (e.g. `^FIREBASE_*`) would silently break web builds.
10. **Zakat is centralized**: Never calculate Zakat (Nisab, 2.5%, Hawl) locally in Web or Mobile. Always use the get_zakat_summary and get_zakat_hauls RPCs.
11. **Zakat Autopilot**: The Hawl state is managed by the sync_zakat_haul_state RPC. Never calculate Hawl logic in the UI; always read from this RPC or the zakat_haul_tracking table.
12. **Never send PII to Sentry.** Filter email/IP/passwords in `beforeSend` (`lib/services/sentry_service.dart`); drop events carrying `Authorization`/`Cookie` headers, and keep the mobile DSN out of web builds.
13. **Always verify external-API mocks against the real endpoint.** Before writing a test that mocks an external API (Yahoo, gold-api, Supabase Auth, etc.), curl the real URL and paste the actual response shape into a comment next to the fixture, including the verification date. A mock that doesn't match reality locks in the wrong contract — the test goes green while production crashes (see the Zakat freegoldapi regression, 2026-10-19).

## Where to find what

- **Current project state (authoritative):** `HANDOFF_REPORT.md`
- **Change history:** `CHANGELOG.md`
- **Security posture and backlog:** `SECURITY.md`
- **API surface:** `API_DOCS.md`
- **Historical audits (frozen):** `docs/archive/`
- **Incident post-mortem:** `mobile/fajrak_flutter/INCIDENT.md`
