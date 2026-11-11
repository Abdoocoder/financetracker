# PROJECT_CONTEXT.md — Fajrak Map & Current State

> Layer 1 of the Project Brain. Read after `AGENTS.md`, before `CLAUDE.md`.
> Last verified against the repo: **2026-11-11**. When this file disagrees with the code, trust the code and update this file.

## 1. High-level architecture

```
┌──────────────────────┐        ┌─────────────────────────┐
│ Web: Next.js 16      │        │ Mobile: Flutter (Drift  │
│ (Vercel, PWA)        │        │ + SQLCipher, offline-   │
│ Firebase = FCM only  │        │ first sync queue)       │
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
| 3 | Data model (31 tables, RLS, crons) | `docs/domain/data-model.md` | `supabase/migrations/` (76 files: 34 top-level + 42 legacy), `vercel.json` (4 crons), `.github/workflows/` (4 workflows) |
| 4 | Observability & Security | `docs/domain/observability-and-security.md` | `observability/` (OTel, dashboards, runbooks), `sentry.*.config.ts`, `instrumentation-client.ts`, mobile `lib/services/sentry_service.dart`, `RISK_REGISTER.md`, `docs/internal/security-definer-audit.md` (frozen 2026-10-27 audit; local-only, gitignored) |
| 5 | Push notifications | `docs/domain/background-and-jobs.md` | `supabase/functions/push-notification/index.ts`, `lib/push-send.ts`, `app/api/push-*`, `notification_preferences` |
| 6 | Offline sync | `docs/domain/background-and-jobs.md` | mobile `lib/database/app_database.dart` (Drift), `lib/services/sync_service.dart`, `sync_queue` table |
| 7 | Gamification | `docs/domain/background-and-jobs.md` | `app/api/gamification/route.ts`, `lib/daily-lessons.ts`, `user_stats`, `saving_challenges`; mobile `utils/level_ladder.dart` |
| 8 | Security backlog | `docs/domain/observability-and-security.md` §4 | `RISK_REGISTER.md`, `docs/domain/observability-and-security.md` |
| 9 | UI / Mobile / Alerts | `docs/domain/ui-and-mobile.md` | mobile `lib/screens/`, `lib/widgets/alerts/`, `lib/app_state.dart`, `lib/core/theme/`; web `components/ui/`, `components/dashboard/`, `lib/locales/` |

## 3. The 7 gotchas (each has burned a real release)

1. **DB drift — migrations are not the schema of record.** Prod has tables/columns with no CREATE TABLE migration (`user_stats`, `testimonials`, `saving_challenges`, `health_score_history`, 25+ extra `profiles` columns). `supabase db reset` against prod destroys reality. Always diff against prod before trusting migration output. (Outage post-mortem: `mobile/fajrak_flutter/INCIDENT.md`.)
2. **The Makefile's unanchored `grep` is load-bearing.** `mobile/fajrak_flutter/Makefile` extracts Firebase keys from `.env` by unanchored substring match on `FLUTTER_FIREBASE_*`. Anchoring it (e.g. `^FIREBASE_`) silently ships credential-less builds → login fails in production. The same Makefile now runs a `check-secrets` preflight before any release build; it aborts with a named missing file (see `docs/DEPLOYMENT.md` → Troubleshooting Build Failures) instead of shipping an empty-credential APK/AAB.
3. **Zakat is centralized — clients never compute.** Nisab, 2.5%, and Hawl logic exist only in RPCs (`get_zakat_summary`, `get_zakat_hauls`, `sync_zakat_haul_state`). A "small local helper" for Zakat in web/mobile is a bug by definition.
4. **Mock reality.** External-API test fixtures must be verified against the live endpoint (paste real response + date). The freegoldapi.com regression (2026-10-19) went green in tests and crashed in prod; the fix uses `api.gold-api.com/price/{XAU,XAG}`.
5. **Version drift.** Version lives in `VERSION`, `pubspec.yaml`, `PLAY_STORE_RELEASE.md`, `package.json`, and several READMEs — they disagree by design (web ships independently at 3.42.0) and by staleness elsewhere. Before quoting a version, read `VERSION`, `pubspec.yaml`, and `PLAY_STORE_RELEASE.md` directly (and confirm the bump commit with `git log --oneline`).
6. **Zakat prices must be passed explicitly.** The RPC defaults ($30/0.35/1.0) are stale fixtures. Any new caller MUST fetch live prices via `lib/zakat-prices.ts` (web) or `metal_price_service.dart` (mobile) and pass them to `sync_zakat_haul_state`.
7. **Migration History Repair:** If you delete a migration file that was already applied to prod, CI will fail with "Remote migration versions not found". Run `supabase migration repair --status reverted <timestamp>` to fix.

## 4. Current state (verified 2026-11-11)

> `HANDOFF_REPORT.md` and `SECURITY.md` were removed from Git history in `92b8a123 chore(repo): sanitize for public visibility`, and the repository **remains public** (`api.github.com/repos/Abdoocoder/financetracker` → `private: false`, `visibility: public`, verified 2026-11-11). Their surviving 2026-10-27 snapshots — plus `security-definer-audit.md` — were therefore **not** re-added to the repo; they live in `docs/internal/` (gitignored at `.gitignore:117`, with belt-and-suspenders entries for the old `docs/archive/` paths at `.gitignore:125-127`) and carry a `SUPERSEDED` header. Do **not** recreate them at the repo root, do **not** commit them, and do **not** cite them for current state — this file plus `docs/domain/observability-and-security.md` §4 are the source of truth.

- **Mobile release:** `3.47.8+74` (`VERSION`, `pubspec.yaml`, `PLAY_STORE_RELEASE.md`, and `mobile/fajrak_flutter/README.md` aligned). Google Play submission **53** is **In Review** as of 2026-11-11.
- **Web version:** `package.json` = 3.42.0 — intentionally not bumped with mobile releases. **Vercel deployment is paused** (`live: false`; last production deploy 2026-10-31) with an operator-stated resume target of **2026-11-30**. Do not assume the web app is serving traffic until that pause is lifted. Vercel is the **platform of record**; §5 has the full topology and the credential blocker that stops an agent from resuming it.
- **Tests (re-run 2026-11-11):** **832 web tests / 86 Jest suites, all passing** (`__tests__/types/index.test.ts` is green — `92058498` corrected `types/index.ts` to ship `صلة رحم` and 11 entries). **347 Flutter tests** (all passing), **Playwright: 4 passed, 2 skipped, 0 flaky** (Ollama-dependent tests skipped). Coverage last measured 49.91% vs an 80% target; dashboard pages ~0%. This bullet is the **single source of truth** for test counts — other docs must link here, never restate the numbers. CI's `Validate test counts (web)` step (`scripts/validate_test_counts.py:97`) refuses to compare counts while any test is failing.
- **Latest feature:** Agentic AI Phases 1–3 remain live — interactive agent chat (`app/api/byok/agent/route.ts`), unified tool layer (`lib/agent/tools.ts`, `lib/unified-tools/index.ts`), interactive tool-call UI cards, Smart BYOK validation (`/api/byok/validate`), and security hardening (P0/P1/P2). **Phase 4's proactive cron (`/api/agent/proactive`) was deleted on 2026-10-31** in `d4e306d0` (CPU-quota reduction); the route does not exist — see `PRE_DELETION_INVESTIGATION_REPORT.md`. Do not cite it as a shipped feature.
- **Next phase:** Agentic AI Executive Assistant — roadmap in `AGENTIC_AI_PLAN.md`.
- **Resolved:** prod DB outage (2026-10-17, `INCIDENT.md`), `currentUser!` force-unwraps (v3.44.0), Zakat live-price fallback.
- ⚠️ **Not resolved — nightly backups.** `Supabase Daily Backup` has failed **every day since 2026-11-03** with `pg_dump: … FATAL: password authentication failed for user "postgres"` (stale `SUPABASE_DB_URL` secret). The "daily backups to Cloudflare R2" claim below/elsewhere is therefore false for the current window; fix the secret and re-run the workflow before trusting a restore point.
- ✅ Zakat live prices passed to `sync_zakat_haul_state` (PR #1, 2026-10-25)
- ✅ Alerts fingerprint backfilled: 6,436 dupes removed, 3,799 keys assigned (PR #2, 2026-10-25)
- ✅ Anon write grants revoked on all public tables (PR #4, 2026-10-25)
- ✅ Security P0/P1/P2 resolved in v3.47.0: 14 critical + 41 high npm advisories patched; internal tables hardened (`api_audit_log`, `idempotency_keys`, `proxy_usage`); `bump_proxy_usage` made SECURITY DEFINER.
- ✅ **Supabase Security Advisor WARNs audited (2026-10-27):** 21 `authenticated_security_definer_function_executable` WARNs investigated — 15 False Positives (safe by design: SECURITY DEFINER + owner guard + pinned search_path + revoked PUBLIC/anon), 6 True Positives fixed via `20261027000000_fix_missing_owner_guards.sql` (missing owner guards on `calculate_health_score`, `get_health_score`, `check_and_reserve_idempotency_key`, `complete_idempotency_key`, `get_changed_records`, `get_deleted_records`). Audit record: `docs/internal/security-definer-audit.md` (frozen snapshot, superseded, local-only).
- ✅ **Security scrub & history rewrite (2026-10-29):** sensitive audit docs (`DEEPSEEK_BRIEFING.md`, `INVESTIGATION_REPORT.md`, `HANDOFF_REPORT.md`, `SECURITY.md`, `docs/security-definer-audit.md`) removed from Git history via `git filter-repo`, 891 agent configs untracked. **Correction (verified 2026-11-11): the repo is PUBLIC, not private** — `https://api.github.com/repos/Abdoocoder/financetracker` returns `private: false` / `visibility: public` to an unauthenticated request. Treat everything the scrub removed as permanently non-publishable; local copies stay in `docs/internal/` (gitignored). Live RLS audit verified: 4 prod-only tables strictly `auth.uid()`, 1 table (`testimonials`) intentional public read. Anon key deemed safe, not rotated.
- ✅ **Flutter P0–P3 fixes shipped in v3.47.8+74:** offline SyncService crash, the SQLCipher/native-library conflict (`sqlite3_flutter_libs` removed, `PRAGMA cipher_version` guard added), Auth refresh cascade, i18n gaps, PDF/CSV export layouts + RTL (including `دين` → `تبرعات`), and FCM token sync degrading gracefully on network errors. `FAJRAK-MOBILE-S` has had no new events since 2026-11-08.
- ⚠️ **Open mobile crash signal (2026-11-11):** Sentry still records a **fatal SIGSEGV** (`FAJRAK-MOBILE-2`, status `regressed`) on **`3.47.8+74`**, from one OnePlus8Pro / Android 11 device, plus two new issues in the same session — `FAJRAK-MOBILE-W` (`Failed to generate alerts: 402`) and `FAJRAK-MOBILE-X` (PostgREST `504`). The “Confirmed Fixed” verdict in `docs/sentry-investigation-2026-11-11.md` does not hold for build 74; treat as an open P0 until the remaining native crash is symbolicated. See that doc's 2026-11-11T08:01Z update.
- **Open risks:** leaked-password protection disabled, no feature flags, financial-metric duplication outside Zakat, and **9 moderate + 1 low npm advisories** (`npm audit --omit=dev`, 2026-11-11 — `@sentry/*` + `google-gax` chains, all with available fixes; **zero** `@opentelemetry` entries, contrary to earlier notes). Full list: `docs/domain/observability-and-security.md` §4 (Arabic register: `RISK_REGISTER.md`). **`SECURITY.md` is not a live document** — the original was deleted in `92b8a123` and its snapshot sits only in `docs/internal/SECURITY.md` (gitignored, never committed); any citation of it as current is stale.
- **Process:** single-developer SPOF, no monetization; conventional commits, squash-merge to main.

## 5. Deployment topology (verified 2026-11-11)

**Vercel is the platform of record for the web app.** Everything else below is either a push-delivery service or dead configuration — not a second deployment path.

| Host | Role today | Evidence |
|---|---|---|
| **Vercel** | **Production host for `https://fajrak.com` — currently PAUSED** | `curl -I https://fajrak.com` → `HTTP/2 402`, `server: Vercel`, `x-vercel-error: DEPLOYMENT_DISABLED`; `fajrak.com` resolves to Vercel anycast `64.29.17.1` / `64.29.17.65` |
| **Netlify** | **Not a deployment path.** `netlify.toml` exists only to configure Netlify's secrets scanner. | The file declares no `command`, no `publish`, and no redirects — only `[build.environment] SECRETS_SCAN_OMIT_KEYS`. `https://fajrak.netlify.app` → `HTTP 404`. Any real Netlify build command lives in the Netlify UI and is **not reproducible from this repo** |
| **Firebase** | **FCM push only** (Android) + Web Push VAPID. Not a web host. | No `firebase.json` / `.firebaserc` at repo root; `mobile/fajrak_flutter/firebase.json` is Flutter/FCM config. `docs/DEPLOYMENT.md` lists Firebase as the push target, not a host |

- **Crons:** `vercel.json` holds the only scheduled jobs (4 crons — see `docs/domain/data-model.md` §6). There is no Netlify or Firebase scheduler.
- **Do not add a second build path.** A Netlify deploy would be able to ship a different artifact than Vercel with no repo-level diff to catch it — the same version-drift class of bug as §3 gotcha 5. Keep `netlify.toml` as a secrets-scan suppression file and nothing more.
- **Resume blocker (operator action required).** The Vercel MCP token available to agents can only see an unrelated team, which owns a *different, empty* project also named `financetracker` (0 deployments, sole domain `financetracker-lime.vercel.app`). The project that actually owns `fajrak.com` sits on a team this token **cannot reach** (`GET /v9/projects/...` → 404). Project IDs and the team slug are deliberately not recorded here — they live only in the gitignored `GIT_STATE_REPORT.md`. Until someone with dashboard access to the owning team lifts the pause (operator-stated target **2026-11-30**), no agent can verify, promote, or trigger a web deploy.
- **Unpausing is a human decision** — it is a billing/account action on the owning team, not an API call to make from here.

## 6. Open work queue (verified 2026-11-11)

Six items from the post-`git pull` audit are still open. Their durable record is **`RISK_REGISTER.md` → "بنود مفتوحة — تدقيق حالة المستودع (11 نوفمبر 2026)"** (`R-1` … `R-6`). The full evidence lives in `GIT_STATE_REPORT.md`, which is **gitignored on purpose** (`.gitignore:89` — it names Vercel project IDs, team slugs and the open security posture), so the register is the copy that survives a fresh clone. A next session starts with `R-2`, then `R-3`, then `R-1`.

| ID | Item | Severity | Where |
|---|---|---|---|
| `R-1` | `FAJRAK-MOBILE-2` SIGSEGV still `regressed` on `3.47.8+74`; `docs/sentry-investigation-2026-11-11.md` says "Confirmed Fixed" and that does not hold | **P0** | §4 above + `RISK_REGISTER.md` |
| `R-2` | Two clients still offer the retired `'دين'` category, and `auto-recurring` writes it back into `transactions` | P1 | `components/transactions/RecurringList.tsx:18`, `mobile/fajrak_flutter/lib/screens/transactions/recurring_screen.dart:233` |
| `R-3` | 4 cron routes dropped from `vercel.json` but still live `verifyCronAuth` endpoints | P1 | `app/api/wealth-guidance/`, `receivable-debt-reminder/`, `smart-nudge/`, `cleanup-notifications/` |
| `R-4` | `data-model.md` still claims the 8-digit migration filename "currently fails" the guard | P2 | `docs/domain/data-model.md:85` |
| `R-5` | `@sentry/nextjs` `^10.76.2` → `>=11.12.0` (9 moderate + 1 low, all fixable) | P2 | `package.json` |
| `R-6` | `docs/workstream-closure-2026-11-05.md` claims a `docs/_recon/` archive that never existed | P2 | that file, §Step 3 |

**Out of scope for this queue:** Vercel settings/DNS, migrations, and any deploy. Do not add a second web build path (§5).
