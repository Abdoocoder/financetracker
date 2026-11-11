# AGENTS.md — Fajrak (repo: financetracker)

## What is Fajrak?
Fajrak (فجرك) is a free, privacy-first Islamic-finance coach for Arabic speakers (Gulf-first), combining daily budgeting with Zakat, halal investing, and FIRE planning (see `VISION.md`, `PRODUCT.md`).
It ships as two clients on one Supabase backend: a Next.js 16 web app (Vercel) and a Flutter app (Google Play), sharing PostgreSQL 17 RPCs, RLS, Realtime, and Deno Edge Functions.
AI chat is BYOK: the user's own LLM key, encrypted on device — conversation content never leaves the device in plaintext.

## Golden Rules (do not break — full text: `CLAUDE.md` → "Critical Rules")
1. RLS always: every query respects `auth.uid() = user_id`.
2. All user-facing strings go through i18n (web `lib/locales/{en,ar}/`; mobile `assets/i18n/` + `.tr()`).
3. Never log or transmit BYOK keys — envelope encryption only.
4. Server Components by default; add `'use client'` only when the page needs state, effects, or browser APIs.
5. Admin (service-role) client only for crons, webhooks, and migrations.
6. Test every multi-currency flow (`original_amount` / `original_currency`).
7. Check `notification_preferences` quiet hours before any push.
8. Migrations are NOT the schema of record — prod has unmigrated tables/columns. Diff against prod; never `supabase db reset` against prod.
9. Leave the Flutter Makefile's Firebase `grep` unanchored — `.env` stores `FLUTTER_FIREBASE_*` keys; anchoring it silently breaks builds. The Makefile now runs a `check-secrets` preflight before any release build; it aborts with the missing file name (e.g., `google-services.json`) instead of letting Gradle fail minutes later. See `docs/DEPLOYMENT.md` → Troubleshooting Build Failures.
10. Zakat math lives only in RPCs `get_zakat_summary` / `get_zakat_hauls` — never compute Nisab or 2.5% in web or mobile code.
11. Hawl state lives only in `sync_zakat_haul_state` / `zakat_haul_tracking` — the UI reads it, never computes it.
12. Never send PII to Sentry — `beforeSend` filters on both clients; drop events carrying `Authorization`/`Cookie`.
13. Verify mocks of external APIs against the live endpoint; paste the real response shape + verification date next to the fixture.
14. **Never commit local agent configs or sensitive docs.** `.agents/`, `.opencode/`, `.claude/`, `.cursor/`, `.gemini/`, `.continue/`, `.taskmaster/`, `.planning/`, `.trae/`, `.kilo/`, `.vscode/`, `DEEPSEEK_BRIEFING.md`, `INVESTIGATION_REPORT.md`, and build outputs (`brag-output/`, `coverage/`, `playwright-report/`, `test-results/`) were scrubbed from Git history on 2026-10-29. These must never be committed.

## Build gotchas (release builds)
Three release inputs are **gitignored** and absent from a fresh clone, so a release build fails minutes in unless they are restored first:

| File | Where it comes from |
|---|---|
| `mobile/fajrak_flutter/android/app/google-services.json` | Firebase Console → Project Settings → Your Android App (project `fajrak-f7df1`, package `com.fajrak.app`) |
| `mobile/fajrak_flutter/android/key.properties` | Release signing config (`keyAlias` + `storeFile=upload-keystore.jks`) |
| `mobile/fajrak_flutter/android/app/upload-keystore.jks` | Release upload keystore |

`make build-apk` and `make build-bundle` depend on the `check-secrets` target, which aborts with the missing path name **before** Gradle starts. If you see `File google-services.json is missing` or a null-keystore signing error, you bypassed the Makefile.

- **Always** build release artifacts with `make build-apk` / `make build-bundle`. Never run `flutter build appbundle --release` directly — it skips the `--dart-define` credentials and `check-secrets`, and previously shipped a build that could not log in.
- `make check-secrets` is safe to run on its own; it only reads the three paths and exits non-zero when one is missing.
- The keystore path is resolved relative to `android/app` (from `key.properties`). If `storeFile` ever changes, update `RELEASE_INPUTS` in the Makefile too.

## Reading order (mandatory before writing code)
1. `PROJECT_CONTEXT.md` — architecture, subsystem router, gotchas, current state.
2. The matching `docs/domain/*.md` for the subsystem you are touching (router below).
3. `CLAUDE.md` — full commands, conventions, and rules.

Need a file-level directory map? → `docs/REPO_INDEX.md`. Current project state, risks, release history? → `PROJECT_CONTEXT.md` + `docs/domain/observability-and-security.md` §4 (`HANDOFF_REPORT.md` and `SECURITY.md` were both deleted in the 2026-10-29 scrub/`92b8a123`; do not recreate them). Verifying a quote against a file before calling an agent wrong? → `docs/PROMPTS.md`. Initializing a fresh agent session or onboarding a new client (Cursor, Claude Code, ChatGPT)? → `docs/AGENT_BOOTSTRAP.md`.

## Subsystem router
| If your task touches… | Read |
|---|---|
| Zakat, Hawl, Nisab, FIRE, halal investing | `docs/domain/islamic-finance.md` |
| AI chat, BYOK keys, LLM proxy, PATs, MCP tools | `docs/domain/byok-ai.md` |
| Tables, RLS, migrations, RPCs | `docs/domain/data-model.md` |
| Flutter screens, UI components, Alerts, i18n | `docs/domain/ui-and-mobile.md` |
| Crons, Push notifications, Offline Sync, Gamification | `docs/domain/background-and-jobs.md` |
| Traces, Sentry, dashboards, runbooks, ACL posture | `docs/domain/observability-and-security.md` |
| Release state, known risks, open questions | `PROJECT_CONTEXT.md` §4, `docs/domain/observability-and-security.md` §4 |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
