# HANDOFF REPORT — FinanceTracker (Fajrak)

**Last updated:** 2026-10-21 · **Current release:** 3.45.0+64 · **Single source of truth for project state**
Archived audits live in docs/archive/; open change history lives in CHANGELOG.md.

**Prepared for:** external software architect
**Date:** 2026-10-17
**Method:** read-only repository reconnaissance (no source files modified, no package managers or test suites run, `node_modules/` etc. not read)

---

## 0. Executive Summary (max 15 bullets)

- Repo is a dual-client personal-finance product: **Next.js 16 web app** + **Flutter mobile app**, both on one **Supabase** (PostgreSQL 17, Auth, RLS, RPCs, Realtime, Edge Functions) backend, deployed via Vercel/Firebase Hosting and Google Play.
- Target market: Arabic-speaking users, primarily **Kuwait & the Gulf**; product identity is "**Fajrak** — Islamic finance coach" (zakat, halal investing, FIRE), while repo/tooling is named "FinanceTracker" — an unresolved identity mismatch.
- Production incident: RESOLVED — see `mobile/fajrak_flutter/INCIDENT.md` (post-mortem). Outage ran ≥2026-10-11 → 2026-10-17; daily backups + zero-budget trigger guard now in place.
- **Database drift is the #1 technical risk**: live prod has columns/tables not in migrations (`user_stats`, `testimonials`, `saving_challenges`, `health_score_history`, 25+ extra `profiles` columns) — `supabase db reset` would destroy prod reality.
- Schema defines **29 tables; all 29 have `ENABLE ROW LEVEL SECURITY`** in migrations — but live-prod RLS state for the 4 unmigrated tables is UNKNOWN (policies exist, table DDL does not).
- `currentUser!` force-unwrap: **FIXED in v3.44.0** — all 11 occurrences in 10 files under `mobile/fajrak_flutter/lib/` replaced with null-safe early returns (historical list retained in §4).
- Tests (declared, not re-run): **592 Jest** (66 suites) and **177 Flutter**; **7 Playwright**; coverage **44.85% stmts**, dashboard pages **0%** vs 80% target (older docs cite 561/524 Jest — see §5).
- Financial calculations are **duplicated 5–7× per metric** across web/mobile/SQL (per ARCHITECTURE_AUDIT_VERIFIED) with some hardcoded health-score thresholds (partially addressed by migration `20261017000000`).
- Dependency issues (declared versions only): 8 moderate `@opentelemetry` vulns (documented), accidental runtime deps `install`/`npx` in `package.json`, Flutter `flutter_local_notifications: ^23.0.0-dev.3` (dev prerelease) and `sqlcipher_flutter_libs: ^0.7.0+eol` in a shipping app.
- Release: mobile **3.44.0+63** shipped to Google Play (Submission ID 44, status "In review"); web `package.json` remains **3.42.0**. Historical version drift across five sources is documented in §9.
- Security posture: RLS-first design is sound; open items are **leaked-password protection disabled**, pending anon-key rotation, no feature flags, and BYOK "keys never leave device" store copy vs the envelope actually POSTed to the proxy (wording needs legal review).
- Process reality: **single-developer SPOF**, no revenue/subscriptions, ~58 migration files (legacy 001–041 + 12 dated + 042–048 with numbering gaps 020/044–046), and multiple overlapping audit documents with conflicting numbers.
- Toolchain is documented green: lint, typecheck, Jest (592), Playwright, `next build`, `flutter analyze`, 177 Flutter tests all pass per audits (not re-verified in this recon).
- Biggest structural gaps for a new architect: DB-not-managed-by-migrations, duplicated calculation logic, and version/identity drift. (The production outage is **resolved** — see `mobile/fajrak_flutter/INCIDENT.md`.)

---

## 1. Product: Problem, USP & Scope

- **Problem:** personal-finance management for Arabic speakers (Kuwait/Gulf primary, per `PRODUCT.md` line 4) who want clarity/control and whose values (Islamic finance) are unaddressed by mainstream budgeting apps.
- **USP stack (from `store-listing.txt`, `README.md`, `VISION.md`):**
  - Islamic-finance tooling: comprehensive **zakat calculator** (gold, silver, cash, investments, debts), automatic **hawl tracking (354 days)**, yearly zakat history + reminders, **halal investment flag** (`is_halal`).
  - **BYOK private AI chat**: user's own LLM key (OpenAI, Anthropic, Gemini, OpenRouter, NVIDIA/Ollama), AES-256-GCM + RSA-OAEP envelope encryption, privacy as the headline claim ("we don't store your conversations").
  - **FIRE planning** (FIRE number, simulation with real savings goals) + full money management: transactions (Quick Add), 50/30/20 budgets, debts with auto-deduction, savings goals, multi-account, multi-currency.
  - Learn-&-earn gamification: daily lessons by life stage, streaks, **18 badges**, beginner→financially-free levels.
  - Privacy-first positioning: "no ad tracking", "never share data with advertisers".
- **Scope:** ~40 web page routes (`(auth)`, `(dashboard)` incl. accounts, alerts, budgets, chat, debts, fire, goals, help, investments, learn, pdf-report, settings, transactions, zakat, download) + ~24 API routes (crons, push, reports, BYOK proxy, gamification, MCP, testimonials); 22 Flutter screens.
- **Identity inconsistency to resolve:** repo/README say "FinanceTracker (Fajrak)"; store listing title is "Fajrak — Smart Finance Coach" / "فجرك"; audits flag the Play-store package name as "FinanceTracker"; website `https://fajrak.com`.
- **Monetization:** none documented — no subscriptions, IAP, or pricing in `store-listing.txt` or audits; free app, no revenue (flagged in risk docs).

## 2. Tech Stack & Architecture

- **Web:** Next.js **16** App Router, React **19**, TypeScript 5 (strict), Tailwind CSS 3.4, TanStack Query, framer-motion, recharts, Sonner-style toast, PWA/service worker.
- **Backend:** Supabase — PostgreSQL 17, Auth (PKCE, HttpOnly cookies via `@supabase/ssr`), Realtime, Storage, **Edge Functions** (`supabase/functions/push-notification/index.ts`, Deno); heavy use of **RPC functions** for all finance math (`get_health_score`, `get_account_balances`, `get_cashflow_summary`, `get_financial_dashboard`, sync RPCs).
- **Mobile:** Flutter 3.x/Dart (SDK `>=3.2.0 <4.0.0`; README says Flutter 3.22+/Dart 3.4+), **Provider** state (`lib/app_state.dart`), **Drift + SQLCipher** offline-first DB, `easy_localization` (ar/en JSON, 979 keys each), `supabase_flutter`, Firebase (FCM + Analytics), Makefile-driven builds with `--dart-define` credentials.
- **AI:** BYOK pattern on both clients + web proxy routes (`app/api/mcp`, `lib/byok/*`, `lib/unified-tools`), envelope crypto in `lib/byok/crypto-utils.ts`; mobile `lib/services/byok/`.
- **Infra/ops:** Vercel (Next.js), Firebase Hosting (shared web bundle), Sentry, OpenTelemetry → Grafana + PagerDuty (`observability/`), web-push VAPID + FCM.
- **Testing:** Jest 30 + RTL 16 (`__tests__/`, 62 test files on disk), Playwright 1.63 (`e2e/`, 7 specs, POM), Flutter `flutter test` (20 test files on disk).
- **Code shape (depth-3 map):**
  - `app/` — 24 API route handlers + `(auth)` (login/register/forgot/reset-password/onboarding), `(dashboard)` (dashboard shell/layout), static pages (download, help, privacy, terms, robots, sitemap, not-found, global-error).
  - `lib/` (76 files) — `byok/` (9), `supabase/` (client/server/admin), `locales/`, `unified-tools/`, `moderation/`, `errors/`, hooks-style helpers (`use-*`), cron auth, rate-limit, push.
  - `components/` (75 files) — `dashboard/` (14), `ui/` (24 primitives), `settings/`, `transactions/`, `landing/`, `layout/`, `seo/`, `investments/`, `providers/`.
  - `mobile/fajrak_flutter/lib/` (133 Dart files) — `screens/` (14 feature folders), `widgets/` (13 folders), `services/` (+ `byok/`, `repositories/`), `models/`, `providers/`, `core/theme/`, `database/connection/`, `utils/`.
  - `supabase/` — **58 migration files** (`legacy/` 001–041 with duplicate numbers 003/029, 12 dated `2026xxxx` files, `042–043`, `047–048`; numbering gaps at 020, 044–046), `config.toml`, 1 Edge Function.

## 3. Database: Tables & RLS Status

All 29 tables defined in `supabase/migrations/*.sql`:

| Table | RLS (migrations) | Notes |
|---|---|---|
| accounts, alerts, budgets, debts, debt_payments, investments, investment_transactions, investment_cash, recurring_transactions, savings_goals, saving_challenges, transactions, zakat_history | **YES** | core finance domain |
| profiles, notification_preferences, notification_history, push_subscriptions | **YES** | profile has 25+ extra prod-only columns |
| chats, messages, user_api_keys, user_byok_keys, proxy_usage, api_audit_log | **YES** | BYOK/privacy-sensitive |
| health_score_history, idempotency_keys, app_events, budget_alert_log, testimonials, user_stats | **YES** | `user_stats`, `testimonials`, `saving_challenges`, `health_score_history` have **no CREATE TABLE migration** (prod-only DDL) |

- **RLS verdict:** 29/29 tables have `ENABLE ROW LEVEL SECURITY` in migrations; policy pattern is `auth.uid() = user_id` (wrapped as `(select auth.uid())` after perf migrations `20260908045741`/`20260914000000`).
- **UNKNOWN-in-prod caveat:** the 4 prod-only tables' live RLS state cannot be proven from the repo (policies reference them, DDL missing) → treat as **UNKNOWN** until DB access is restored.
- **Live drift (AUDIT_REPORT.md §4):** `profiles` has 25+ columns not in migrations; default currency in prod is **JOD** (not KWD); 6 RLS-initplan WARN advisories; 21 unused indexes across 14 tables.
- **testimonials** policies (`legacy/010`, `011`, re-applied in `20260913135653_add_prod_only_schema.sql`): public SELECT `WHERE is_visible=true`; owner-only insert/update/delete — yet an external client is hammering `/rest/v1/testimonials` (incident), i.e. public read amplification, not a policy bypass.
- Security-hardening migrations present: `advisor_function_lockdown`, `revoke_public_from_secdef_functions`, `verify_owner_in_user_rpcs`, `022_security_hardening`, `024_production_hardening`, `20261018000000_linter_security_hardening` (revokes PUBLIC+anon EXECUTE on 7 internal RPCs with explicit grants to authenticated/service_role, pins `search_path`, drops dup index).
- `supabase/config.toml` has `[auth] enabled = true`; **leaked-password protection is not enabled** (flagged as recommendation in AUDIT_REPORT.md:179).

## 4. Codebase Structure & Force-Unwrap Hotspots (RESOLVED in v3.44.0)

- Structure map: see §2 "Code shape" plus `hooks/`, `types/index.ts` (single source of truth), `e2e/`, `__tests__/`, `observability/`, `docs/`, `mobile/`.
- **`currentUser!` in `mobile/fajrak_flutter/lib/` — RESOLVED in v3.44.0** (was 11 occurrences in 10 files; all replaced with null-safe early returns). Historical file:line list retained for reference:

| # | File:line |
|---|---|
| 1 | `lib/services/accounts_service.dart:7` |
| 2 | `lib/services/finance_service.dart:5` |
| 3 | `lib/widgets/settings/assets_form.dart:63` |
| 4 | `lib/widgets/settings/profile_form.dart:68` |
| 5 | `lib/widgets/budgets/add_budget_dialog.dart:55` |
| 6 | `lib/widgets/transactions/add_transaction_dialog.dart:117` |
| 7 | `lib/widgets/investments/investment_list_item.dart:87` |
| 8 | `lib/widgets/investments/investment_list_item.dart:163` |
| 9 | `lib/widgets/investments/investment_cash_card.dart:197` |
| 10 | `lib/widgets/debts/debt_list_item.dart:71` |
| 11 | `lib/widgets/goals/add_goal_dialog.dart:87` |

- Status: **fixed in v3.44.0** — auth-state races (sign-out mid-session, session refresh failure) no longer throw a null-check crash; the add/edit/delete dialogs and list items now use null-safe early returns. (Legacy recommendation was `?.` + early-return or a `requireAuth()` helper.)

## 5. Tests & Coverage (suites run 2026-10-21)

| Source | Web (Jest) | Flutter | Playwright | Coverage |
|---|---|---|---|---|
| **Current (verified 2026-10-21)** | **626 / 71 suites** | **186** | 7 specs | 44.85% stmts (last measured) |
| `AUDIT_REPORT.md` (historical) | **561** | **135** | **7 specs** | — |
| `DEEP_PROJECT_ANALYSIS.md` | **524 / 56 suites** | — | 7/7 (~46.5s) | **44.85% stmts** / 30.78% branch / 30.7% funcs / 48.07% lines |
| On disk (files counted) | 62 test files | 20 test files | 7 specs | — |

- **Current counts (suites run 2026-10-21): 626 web tests across 71 suites, 186 Flutter tests** (Zakat Autopilot added suites on both sides). Older audits cite 592 / 561 / 524 / 135 — treat those as historical.
- `mobile/AGENTS.md` says "`flutter test` runs 13 files" but **20 test files exist** → stale doc.
- CLAUDE.md target is **80%+ coverage**; actual 44.85%; **dashboard pages 0%** (AUDIT_REPORT flags as Medium risk needing E2E).
- Known test-infra quirk: Jest uses `forceExit` due to a documented worker leak (low risk, accepted).
- Flutter tests are pure-Dart (no live Supabase/Firebase), Arabic descriptions for repository tests, i18n key-parity test (`test/i18n_keys_test.dart`).

## 6. Dependency Status (declared versions only — no package-manager runs)

**Web (`package.json`, v3.42.0) key declared versions:**
`next ^16.3.5`, `react ^19.2.4`, `@supabase/supabase-js ^2.45.4`, `@supabase/ssr ^0.5.1`, `@sentry/nextjs ^10.73.0`, `@tanstack/react-query ^5.96.2`, `firebase ^12.10.0`, `firebase-admin ^14.3.0`, `playwright ^1.63.0`, `zod ^4.4.3`, `recharts ^3.8.0`, `dompurify ^3.4.16`, `web-push ^3.6.7`.
- **Documented vulnerabilities:** 8 moderate, all transitive `@opentelemetry/*` (<2.8.0 chain); exits 0 at `--audit-level=high`; `overrides` pin `@opentelemetry/core ^2.10.0`, `@sentry/cli ^3.4.2`, `uuid ^11.1.1`.
- **Smells:** runtime deps `install ^0.13.0` and `npx ^10.2.2` (accidental npm installs), `jsdom ^30.1.1` listed under dependencies (should be dev).
- OTel version soup: `0.222.0`-series exporters/sdk-node alongside `2.11.0` resources/sdk-metrics — mixed major lines.

**Mobile (`pubspec.yaml`, v3.44.0+63) key declared versions:**
`supabase_flutter ^2.3.4`, `provider ^6.1.1`, `firebase_core ^5.0.0`, `firebase_messaging ^17.0.0`, `drift ^2.18.0`, `fl_chart ^1.2.0`, `syncfusion_flutter_charts ^35.1.37`, `pdf ^3.10.7`, `flutter_secure_storage ^11.2.0`, `easy_localization ^3.0.3`, `flutter_markdown_plus ^1.0.12`.
- **Concerning pins:** `flutter_local_notifications: ^23.0.0-dev.3` (**dev prerelease in production**), `sqlcipher_flutter_libs: ^0.7.0+eol` (**EOL-suffixed build**), `webcrypto ^0.6.0` (unmaintained), `flutter_app_badge_control ^0.0.2`.
- README flags **legacy KGP plugins** (`firebase_analytics`, `firebase_core`, `flutter_app_badge_control`) needing migration to built-in Kotlin before Flutter drops support.
- **Resolved dependency debt (v3.44.0):** the deprecated `flutter_markdown` package was replaced by **`flutter_markdown_plus ^1.0.12`** (used by the AI chat assistant for proper Markdown rendering).

## 7. Feature Set vs Store Listing (`store-listing.txt`)

Store listing (ar + en) claims, mapped to implementation:

| Listing claim | Evidence in repo |
|---|---|
| BYOK AI (NVIDIA/OpenAI/Anthropic/Gemini/OpenRouter), keys encrypted on device only | ✅ `lib/byok/` + `lib/services/byok/`, 6 providers per v3.43.1 notes |
| Zakat calculator + 354-day hawl + history/reminders | ✅ Unified engine v2 RPCs (`get_zakat_summary`, `get_zakat_hauls`) + **Zakat Autopilot**: `sync_zakat_haul_state` state machine + `zakat_haul_tracking` (migration `20261021000000_zakat_autopilot.sql`) + daily `/api/zakat-autopilot` cron (Hawl countdown UI on Web + Mobile dashboards, Push when ≤ 7 days remain) + `zakat_holdings` (gold/silver tracking) + `zakat_history` + `/api/zakat-reminder` |
| Halal investing (`is_halal`) | ✅ `investments.halal flag` |
| FIRE number/simulation | ✅ `app/(dashboard)` fire route + `components/investments/wealth-simulator.tsx` |
| Dashboard charts, Quick Add, 50/30/20 budgets, debts auto-deduct, goals, multi-account, multi-currency | ✅ features + tables |
| Learn & earn: lessons, streaks, **18 badges**, levels | ✅ gamification (`/api/gamification`, `user_stats`, `daily-lessons.ts`) |
| Arabic/EN + RTL, dark/light, CSV + monthly PDF, smart alerts | ✅ i18n, PDF service, push/cron routes |
| "Keys never sent to our servers" | ⚠️ architecture POSTs an **RSA-OAEP envelope + payload** to `{proxy}/api/byok/proxy` — technically wrapped, but verify store-copy wording |
| "No ad tracking" / AD_ID permission | ⚠️ AD_ID permission added for Firebase Analytics compliance (Play requirement) — reconcile messaging |

- Store identity: ar name "فجرك — مدربك المالي الذكي", en "Fajrak — Smart Finance Coach", category Finance, rating Everyone, site fajrak.com. Last documented release: **v3.44.0** (Oct 17, 2026) "Feature & Stability Release", version code 63 (Submission ID 44, status "In review"). Previous: v3.43.1 (Oct 16, 2026) "Production Hotfix" (FCM splash hang + transactions crash), version code 60, target SDK 35, min SDK 21.

## 8. Known Risks (documented — max 15 bullets)

1. ✅ **Production DB outage — RESOLVED** (2026-10-17); post-mortem in `mobile/fajrak_flutter/INCIDENT.md`.
2. ✅ **Backups — RESOLVED:** daily GitHub Actions → Cloudflare R2 (`fajrak-backups`) pipeline is live; 4 dumps retained (2026-10-14 → 2026-10-17).
3. 🔴 **DB drift**: live schema ≠ migrations; `supabase db reset`/fresh migrate would destroy prod reality.
4. 🟡 **Financial logic duplication (non-Zakat)** — 5–7 implementations of the same metric across web/mobile/SQL (ARCHITECTURE_AUDIT_VERIFIED). Zakat is out of scope for this risk: it is fully unified in engine v2 + Autopilot (`get_zakat_summary`, `get_zakat_hauls`, `sync_zakat_haul_state`; clients are input/display only, Hawl state lives in `zakat_haul_tracking`). Other metrics (e.g. health-score) may still be duplicated.
5. 🟠 Hardcoded health-score thresholds / hardcoded `0` health score bug (partially fixed by `20261016114425` + `20261017000000` migrations).
6. 🟠 **No feature flags** — every change ships all-or-nothing.
7. 🟠 Leaked-password protection disabled in Supabase Auth.
8. 🟠 Coverage 44.85% vs 80% target; dashboard pages 0%.
9. 🟠 8 moderate npm vulns (`@opentelemetry` transitive).
10. 🟠 Anon key rotation still pending (post-incident) — key is embedded in clients.
11. 🟡 Identity/currency inconsistencies: FinanceTracker vs Fajrak; **KWD (CLAUDE.md) vs JOD (prod default)** vs "Kuwait/Gulf" (PRODUCT.md).
12. 🟡 Version drift across 5 documents (see §9).
13. 🟡 **Makefile fragility:** `mobile/fajrak_flutter/Makefile` extracts Firebase keys from `.env` via **unanchored** `grep`, matching `FLUTTER_FIREBASE_*` by substring. Anchoring the grep (`^FIREBASE_*`) would silently break web builds.
14. 🟡 Single-developer SPOF; no bus-factor docs beyond this handoff; no revenue to fund help.
15. 🟡 Play `dev`/`eol`-suffixed Flutter plugins in production (see §6).
16. ✅ **Zakat Autopilot audit bugs — RESOLVED** (2026-10-19 safety audit, test-first): (a) hardcoded Arabic push copy → localized from `profiles.lang`; (b) quiet-hours users were stamped `last_notified_at` without receiving a push → stamp now gated on actual delivery; (c) Hawl sync used stale default prices → clients pass live gold/silver/FX. Details in `mobile/fajrak_flutter/INCIDENT.md` §Security Hardening Backlog and `CHANGELOG.md` `[3.45.0+64]`.

## 9. Release & Version Drift

**Current release:** mobile **3.45.0+64** — version-bump commit `7269ffdd` (2026-10-19); `VERSION` file, `pubspec.yaml`, and this header are now aligned. `PLAY_STORE_RELEASE.md` / `mobile/README.md` may still read 3.44.0+63 until the next store submission is documented.

**Zakat Autopilot (Phase C) — complete and live** (2026-10-21): backend migration `20261021000000_zakat_autopilot.sql` (`sync_zakat_haul_state` + `zakat_haul_tracking`) is on `main`, the daily Vercel Cron `/api/zakat-autopilot` (`0 8 * * *`) is live, and the Hawl countdown UI has landed on the Web and Mobile dashboards and Zakat pages. Next phase: Agentic AI (Executive Assistant) — roadmap in `AGENTIC_AI_PLAN.md`.

| Source | Declared version |
|---|---|
| `VERSION` (root) | **3.45.0+64** |
| `mobile/fajrak_flutter/pubspec.yaml` | **3.45.0+64** |
| `HANDOFF_REPORT.md` header | **3.45.0+64** |
| `mobile/README.md` | 3.44.0+63 *(pending next store docs)* |
| `mobile/PLAY_STORE_RELEASE.md` | 3.44.0+63 *(version code 63; next submission pending)* |
| `package.json` (web) | 3.42.0 — **intentionally unchanged** |
| `mobile/AGENTS.md` | 3.43.1+60 (stale) |
| `structure.md` | 3.40.0+51 (stale) |

- **Intentional decision:** the web app's `package.json` stays at **3.42.0** and is deliberately not bumped with mobile releases — web and mobile ship independently from the same repo, and the web bundle has not been re-released. This is a documented choice, not drift to be "fixed."
- Mobile version sources are aligned at **3.45.0+64** for `VERSION` / `pubspec.yaml` / this handoff; the Play store docs (`PLAY_STORE_RELEASE.md`, `mobile/README.md`) lag until the next submission is recorded.
- Release cadence: 3.42.2 (Play compliance + auth/`--dart-define` build fix) → 3.43.0 (gamification API, 6 BYOK providers, restored 4 DB RPCs) → 3.43.1 (FCM splash hang, DB init crash) → 3.44.0 (AI formatting, timezone-aware alerts, zero-budget guard, Firebase FID, null-safety) → **3.45.0** (Zakat Engine v2 + Autopilot: backend, cron, countdown UI on Web + Mobile).
- Build-process fragility: running `flutter build appbundle --release` directly (bypassing Makefile) silently ships a build with **no credentials → login fails** (documented past incident).
- No changelog file at root; release history lives in `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md`.

## 10. Agent & Development Conventions (CLAUDE.md, ≤10 bullets)

1. **Never bypass RLS** — all queries respect `auth.uid() = user_id`; no manual user_id filtering.
2. **Never hardcode user-facing strings** — always `lib/locales/{en,ar}/` (web) / `assets/i18n/*.json` + `.tr()` (mobile).
3. **Never log BYOK keys** — envelope encryption only.
4. **Server Components by default** — add `'use client'` only when required; admin (service-role) client only for crons/webhooks/system ops.
5. **RPCs for finance math** — `get_health_score`, `get_account_balances`, `get_cashflow_summary` (web + mobile share via Supabase RPCs).
6. **Test multi-currency flows** — `original_amount`/`original_currency` fields; respect `notification_preferences` quiet hours before pushes.
7. **Naming**: PascalCase components, `use`-prefix hooks, kebab-case API folders, numbered snake_case migrations, camelCase locale keys; `types/index.ts` is the single type source of truth.
8. **Git**: conventional-ish prefixes (`feat:`/`fix:`/`refactor:`/`chore:`), branch prefixes `feature/`/`fix/`/`chore/`, squash-merge to main (Vercel).
9. **Testing commands**: `npm test`, `npm run test:e2e`, `npm run doctor` (full health check); mobile `make test`/`make analyze`.
10. The `<!-- BEGIN:nextjs-agent-rules -->` block in CLAUDE.md is **auto-regenerated by `next dev`** — don't remove it from diffs; it warns Next.js 16 APIs differ from training data (read `node_modules/next/dist/docs/`).

## 11. Gaps & Inconsistencies Found in Reconnaissance

- **MISSING: `CONTEXT.md`** and **MISSING: `RESEARCH.md`** — explicitly noted as absent in `mobile/fajrak_flutter/UI-SPEC.md` ("No CONTEXT.md exists — No locked decisions to respect").
- Migration numbering gaps: **020, 044, 045, 046** absent; legacy has duplicate numbers (two `003_*`, two `029_*`).
- Doc-vs-disk drift (remaining): `mobile/AGENTS.md` still pinned at **3.43.1+60** and says "13 test files" (disk has 20); `structure.md` pinned at **3.40.0+51**. Test counts are reconciled to **592 web / 177 Flutter**.
- Overlapping/conflicting audit corpus: `AUDIT_REPORT.md`, `docs/archive/ARCHITECTURE_AUDIT.md`, `docs/archive/ARCHITECTURE_AUDIT_VERIFIED.md`, `DEEP_PROJECT_ANALYSIS.md`, `docs/archive/AUDIT_REPORT_AR.md`, `docs/archive/COMPREHENSIVE_AUDIT_REPORT_AR.md`, `docs/archive/FAJRAK_AUDIT_REPORT_AR.md`, `FAJRAK_ACCOUNTING_ANALYSIS.md` — several AR variants skimmed at header/key-section level only in this recon; no precedence order declared among them.
- `20260913135653_add_prod_only_schema.sql` exists precisely because prod DDL was never migrated — signals that migrations are not the system of record.
- No root CHANGELOG/VERSION file found in this recon (release history lives in `PLAY_STORE_RELEASE.md` only, mobile-side).
- BYOK store copy vs proxy envelope (see §7) — unreviewed compliance wording gap.
- Currency default contradiction unresolved across CLAUDE.md (KWD), audits/prod (JOD), PRODUCT.md (Kuwait/Gulf).
- Web `app/(dashboard)/dashboard/transactions/` referenced in CLAUDE.md task table did not appear in the depth-3 listing (transactions UI lives under `components/transactions/`) — minor doc/structure mismatch to verify.
- Everything else requested in the recon brief was found; no other required files were missing.

## 12. Questions for the Owner

1. **Production DB** (RESOLVED 2026-10-17): the outage is over — recovery plan / post-mortem in `mobile/fajrak_flutter/INCIDENT.md`. Remaining: any formal Supabase-side ownership follow-up.
2. **Backups** (RESOLVED): daily GitHub Actions → Cloudflare R2 pipeline is live (4 dumps retained). Still open: decide whether to upgrade off the Free plan for PITR.
3. **Schema truth**: do you want the live DB formally reconciled into migrations (baseline dump → squashed migration), so `db:push` becomes safe?
4. **Anon key rotation**: post-incident, can we rotate the Supabase anon key and ship updated clients — and who is the unknown tester hitting `/rest/v1/testimonials`?
5. **Version truth** (answered): mobile is **3.44.0+63** on Google Play (Submission ID 44); web `package.json` remains **3.42.0**. Decide whether the web app should track the same version.
6. **Identity**: ship as "Fajrak" everywhere (store, repo, domain) or keep "FinanceTracker"? Any Play-console renaming constraints?
7. **Default currency**: KWD, JOD, or per-profile detection? Which is authoritative for new signups?
8. **Money**: is monetization (subscription/IAP) planned — it determines whether to prioritize paywall/auth work, feature flags, and higher test bars?
9. **BYOK store wording**: is "keys never sent to our servers" acceptable given the proxy receives an RSA-OAEP envelope, or should copy be reworded?
10. **Scope of help**: what should an incoming architect own first — incident recovery, calc-deduplication (single source of truth for finance math), or coverage/feature-flag safety net?
