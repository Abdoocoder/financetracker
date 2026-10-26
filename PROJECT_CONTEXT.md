# PROJECT_CONTEXT.md — Fajrak Map & Current State

> Layer 1 of the Project Brain. Read after `AGENTS.md`, before `CLAUDE.md`.
> Last verified against the repo: **2026-10-20**. When this file disagrees with the code, trust the code and update this file.

## 1. High-level architecture

```
┌──────────────────────┐        ┌─────────────────────────┐
│ Web: Next.js 16      │        │ Mobile: Flutter (Drift  │
│ (Vercel + Firebase   │        │ + SQLCipher, offline-   │
│ Hosting, PWA)        │        │ first sync queue)       │
└──────────┬───────────┘        └───────────┬─────────────┘
           │  SSR cookies / REST / RPC      │
           ▼                                ▼
┌──────────────────────────────────────────────────────────┐
│ Supabase — PostgreSQL 17 + RLS + RPCs + Auth + Realtime  │
│ Edge Function: push-notification (Deno)                  │
└───────┬──────────────────────┬───────────────────────────┘
        │                      │
  ┌─────▼──────┐   ┌───────────▼────────────┐   ┌─────────────────────┐
  │ BYOK proxy │   │ MCP server             │   │ Crons               │
  │ /api/byok/ │   │ /api/mcp (PAT + scopes)│   │ Vercel crons +      │
  │ proxy      │   │ 3 tools, shared logic  │   │ GitHub Actions      │
  └─────┬──────┘   └───────────┬────────────┘   └──────────┬──────────┘
        └──────────┬───────────┘                           │
                   ▼                                       ▼
        lib/unified-tools (shared RPC layer)      FCM (Android) + Web Push (VAPID)
```

Both clients are input/display layers; **all finance math lives in Supabase RPCs**. AI keys are encrypted on device; the proxy only forwards.

**Shared price fetcher:** `lib/zakat-prices.ts` (web) / `metal_price_service.dart` (mobile) — live gold/silver/FX for Zakat RPC calls.

## 2. Subsystem router (9 domains)

| # | Subsystem | Domain doc | Key sources |
|---|---|---|---|
| 1 | Islamic Finance (Zakat, Hawl, FIRE, halal) | `docs/domain/islamic-finance.md` | `supabase/migrations/20261019000000_zakat_engine_v2.sql`, `20261021000000_zakat_autopilot.sql`; `app/(dashboard)/dashboard/zakat/`, `dashboard/fire/`; mobile `more/zakat_calculator_screen.dart` |
| 2 | BYOK AI + MCP | `docs/domain/byok-ai.md` | `lib/byok/*`, `app/api/byok/proxy/route.ts`, `app/api/mcp/route.ts`, `lib/unified-tools/index.ts`; mobile `lib/services/byok/` |
| 3 | Data model (29 tables, RLS, crons) | `docs/domain/data-model.md` | `supabase/migrations/` (58 files), `vercel.json`, `.github/workflows/smart-notifications.yml` |
| 4 | Observability & Security | `docs/domain/observability-and-security.md` | `observability/` (OTel, dashboards, runbooks), `sentry.*.config.ts`, `instrumentation-client.ts`, mobile `lib/services/sentry_service.dart`, `SECURITY.md` |
| 5 | Push notifications | `docs/domain/background-and-jobs.md` | `supabase/functions/push-notification/index.ts`, `lib/push-send.ts`, `app/api/push-*`, `notification_preferences` |
| 6 | Offline sync | `docs/domain/background-and-jobs.md` | mobile `lib/database/app_database.dart` (Drift), `lib/services/sync_service.dart`, `sync_queue` table |
| 7 | Gamification | `docs/domain/background-and-jobs.md` | `app/api/gamification/route.ts`, `lib/daily-lessons.ts`, `user_stats`, `saving_challenges`; mobile `utils/level_ladder.dart` |
| 8 | Security backlog | *(covered in observability-and-security.md)* | `SECURITY.md`, `HANDOFF_REPORT.md` §8 |
| 9 | UI / Mobile / Alerts | `docs/domain/ui-and-mobile.md` | mobile `lib/screens/`, `lib/widgets/alerts/`, `lib/app_state.dart`, `lib/core/theme/`; web `components/ui/`, `components/dashboard/`, `lib/locales/` |

## 3. The 7 gotchas (each has burned a real release)

1. **DB drift — migrations are not the schema of record.** Prod has tables/columns with no CREATE TABLE migration (`user_stats`, `testimonials`, `saving_challenges`, `health_score_history`, 25+ extra `profiles` columns). `supabase db reset` against prod destroys reality. Always diff against prod before trusting migration output. (Outage post-mortem: `mobile/fajrak_flutter/INCIDENT.md`.)
2. **The Makefile's unanchored `grep` is load-bearing.** `mobile/fajrak_flutter/Makefile` extracts Firebase keys from `.env` by unanchored substring match on `FLUTTER_FIREBASE_*`. Anchoring it (e.g. `^FIREBASE_`) silently ships credential-less builds → login fails in production.
3. **Zakat is centralized — clients never compute.** Nisab, 2.5%, and Hawl logic exist only in RPCs (`get_zakat_summary`, `get_zakat_hauls`, `sync_zakat_haul_state`). A "small local helper" for Zakat in web/mobile is a bug by definition.
4. **Mock reality.** External-API test fixtures must be verified against the live endpoint (paste real response + date). The freegoldapi.com regression (2026-10-19) went green in tests and crashed in prod; the fix uses `api.gold-api.com/price/{XAU,XAG}`.
5. **Version drift.** Version lives in `VERSION`, `pubspec.yaml`, `PLAY_STORE_RELEASE.md`, `package.json`, and several READMEs — they disagree by design (web ships independently at 3.42.0) and by staleness elsewhere. Before quoting a version, check `HANDOFF_REPORT.md` §9.
6. **Zakat prices must be passed explicitly.** The RPC defaults ($30/0.35/1.0) are stale fixtures. Any new caller MUST fetch live prices via `lib/zakat-prices.ts` (web) or `metal_price_service.dart` (mobile) and pass them to `sync_zakat_haul_state`.
7. **Migration History Repair:** If you delete a migration file that was already applied to prod, CI will fail with "Remote migration versions not found". Run `supabase migration repair --status reverted <timestamp>` to fix.

## 4. Current state (verified 2026-10-25)

- **Mobile release:** `3.46.0+65` (`VERSION`, `pubspec.yaml`, `PLAY_STORE_RELEASE.md` aligned). Google Play's last *documented* submission is v3.44.0+63 (Submission ID 44, status "In review" at handoff); `mobile/README.md` still reads 3.44.0+63.
- **Web version:** `package.json` = 3.42.0 — intentionally not bumped with mobile releases.
- **Tests (re-run 2026-10-25):** **741 web tests / 78 Jest suites** (all passing), **260 Flutter tests** (all passing), 7 Playwright specs. Coverage last measured 44.85% vs an 80% target; dashboard pages ~0%. This bullet is the **single source of truth** for test counts — other docs must link here, never restate the numbers.
- **Latest feature:** Zakat Autopilot (Phase C) complete and live — engine v2 + `zakat_haul_tracking` state machine + daily `/api/zakat-autopilot` cron + Hawl countdown UI on Web and Mobile.
- **Next phase:** Agentic AI Executive Assistant — roadmap in `AGENTIC_AI_PLAN.md`.
- **Resolved:** prod DB outage (2026-10-17, `INCIDENT.md`), daily backups to Cloudflare R2, `currentUser!` force-unwraps (v3.44.0), Zakat live-price fallback.
- ✅ Zakat live prices passed to `sync_zakat_haul_state` (PR #1, 2026-10-25)
- ✅ Alerts fingerprint backfilled: 6,436 dupes removed, 3,799 keys assigned (PR #2, 2026-10-25)
- ✅ Anon write grants revoked on all public tables (PR #4, 2026-10-25)
- **Open risks:** anon key rotation (pending post-incident), leaked-password protection disabled, no feature flags, financial-metric duplication outside Zakat, 8 moderate `@opentelemetry` transitive vulns. Full list: `HANDOFF_REPORT.md` §8.
- **Process:** single-developer SPOF, no monetization; conventional commits, squash-merge to main.
