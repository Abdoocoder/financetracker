# CI/CD Pipelines Guide

> Complete reference for GitHub Actions workflows, pre-prod validation, migration repair, and release process.

---

## 1. CI Checks (Runs on Every PR / Push)

Workflow: `.github/workflows/lint-test-build.yml` (there is no `ci.yml` in this repo — the web and mobile jobs live in `lint-test-build.yml`)

| Job (id) | Purpose | Key Steps |
|-----|---------|-----------|
| `web (lint, typecheck, test, build)` (`lint-typecheck-test`) | Full web health check | Prompts validator → **`Validate test counts (web)`** → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` |
| `mobile (flutter analyze, test)` (`mobile`) | Flutter health check | `flutter pub get` → Drift codegen → `flutter analyze` → `flutter test` → `Validate test counts (mobile)` |

**`Validate test counts` is a step, not a job** — it runs inside each job above. On the web side it
runs **before** lint/typecheck/test and also fails when any Jest test is red, so a red suite
surfaces here first, not at `npm test`.

**Required status checks for merge:** Both jobs must pass. No bypass.

---

## 2. Preview & Validation Deployments

There is **no full Supabase preview-stack workflow** in this repo. (`.github/workflows/supabase-preview.yml`
does not exist; it was replaced by `neon-preview-branch.yml`.) Two workflows cover pre-prod checks,
and neither produces an app environment.

### 2.1 `.github/workflows/neon-preview-branch.yml`

**Trigger:** PR `opened` / `reopened` / `synchronize` / `closed`

**What it does:**
1. Creates a Neon branch named `preview/pr-<number>` when the PR opens.
2. Deletes it when the PR closes (plus an expiry backstop for abandoned PRs).

**What it does *not* do:** it applies no migrations and posts no schema diff. Neon holds a
*restored standby copy* of the Supabase database: no Auth/PostgREST/Realtime, `auth.uid()` returns
`NULL`, and every query runs as `neondb_owner` (RLS bypassed). It is a **diagnostics sandbox**
(run a query, inspect a schema, test a one-off SQL script) — never an app environment.
`supabase/migrations/` is not the schema of record (CLAUDE.md rule 8), so replaying it there
would diff against a baseline this repo does not trust.

**Secrets:** `NEON_API_KEY` is a repository *secret*; `NEON_PROJECT_ID` is a repository *variable*
(read via `vars.`). If the ID ended up in secrets, the create step fails with a missing project_id.

### 2.2 `.github/workflows/supabase-validate.yml`

**Trigger:** push to `main`, plus `workflow_dispatch`

**What it does:**
1. **Migration structure guard** — every top-level migration filename must be `<NNN>_…` or
   `<YYYYMMDDHHMMSS>_…`, and each numeric prefix must be unique. An 8-digit date prefix
   (e.g. `20261107_rename_deen_to_tabarruat.sql`) fails the job.
2. **Prod-safety guard** — scans every workflow file and fails if any contains a real
   `supabase db push` (only `--dry-run` is permitted).
3. **Isolated schema check** — boots an empty local stack, best-effort replays the 42 archived
   `supabase/migrations/legacy/` files, then **strictly applies** every top-level migration
   (the real DDL gate). `supabase db lint` runs on the result as an advisory report. Prod is
   never touched: `psql` binds to the local throwaway DB only.

**Why it matters:** catches migration-name/structure breakage and RLS/RPC drift before prod,
without ever touching prod.

**If it fails:**
- **Migration structure guard:** rename the file to the 14-digit timestamp form
  (`20261107000000_rename_deen_to_tabarruat.sql`) and update any references.
- **Isolated validation:** check the log for the failing SQL; the usual cause is a migration that
  assumes prod-only tables exist (see CLAUDE.md rule 8 — prod carries unmigrated tables/columns).

---

## 3. The "Migration Repair" Workflow

**When this happens:** You delete (or revert) a migration file that was **already applied to production**. The next CI run fails with:

```
Error: Remote migration versions not found: 20261021000000
```

**Root cause:** Supabase tracks applied migrations in `supabase_migrations.schema_migrations`. If the local file is gone but the remote record remains, `supabase db push` / `supabase migration list` sees a divergence.

**Step-by-step fix:**

```bash
# 1. Identify the missing migration timestamp from the error message
#    Example: 20261021000000

# 2. Run the repair command (marks the migration as "reverted" in remote tracking)
npx supabase migration repair --status reverted 20261021000000

# 3. Verify the repair
npx supabase migration list
# Should show the migration as "reverted" (not "applied")

# 4. If you need to re-apply a corrected version, create a NEW migration file
#    with a NEW timestamp (e.g., 20261025000000_fix_zakat_prices.sql)
#    and run supabase db push normally.
```

**Critical rules:**
- **Never** edit an already-applied migration file in place. Always create a new migration.
- **Never** run `supabase db reset` against prod (destroys prod reality — see Gotcha #1).
- The repair command only updates the *tracking table*; it does not roll back SQL. If the migration created tables/columns, they remain in prod until you write a down-migration.

---

## 4. Release Process

### 4.1 Version Bumping

| Artifact | Command / Location | Notes |
|----------|-------------------|-------|
| Root `VERSION` | `echo "3.47.8+74" > VERSION` | Single source of truth for mobile |
| `pubspec.yaml` | Edit `version: 3.47.8+74` | Must match `VERSION` exactly |
| `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md` | Add entry under `## [3.47.8+74]` | Release notes for Play Console |
| `package.json` (web) | **Do not bump** — stays at 3.42.0 | Web ships independently |

### 4.2 Building Flutter AAB (Release Bundle)

**⚠️ NEVER run `flutter build appbundle --release` directly.**

The Makefile injects Supabase and Firebase credentials via `--dart-define`. Bypassing it produces a build with **empty credentials → login fails in production** (documented past incident).

**Correct command:**
```bash
cd mobile/fajrak_flutter && make build-bundle
# Output: build/app/outputs/bundle/release/app-release.aab
```

The Makefile reads `FLUTTER_FIREBASE_*` and `FLUTTER_SUPABASE_*` from `.env` (unanchored grep — see Gotcha #2) and passes them to the build.

Both release targets depend on the `check-secrets` preflight, which aborts **before** Gradle starts when one of the three gitignored inputs is missing (`android/app/google-services.json`, `android/key.properties`, `android/app/upload-keystore.jks`). Run it on its own any time:

```bash
cd mobile/fajrak_flutter && make check-secrets
# ❌ Missing release build input: android/app/google-services.json   (exit 1)
```

See `docs/DEPLOYMENT.md` → Troubleshooting Build Failures for the full table.

### 4.3 Deploying to Google Play

1. Upload the `.aab` from `make build-bundle` to Play Console
2. Fill release notes from `PLAY_STORE_RELEASE.md`
3. Submit for review (track: production or internal testing)
4. Update `mobile/README.md` with the new version after approval

### 4.4 Deploying Web to Vercel

> **⚠️ Paused (verified 2026-11-11):** the `financetracker` Vercel project is paused (`live: false`); its last production deployment was 2026-10-31 and the operator-stated resume target is **2026-11-30**. Pushes to `main` do not serve traffic until the pause is lifted.

1. Push to `main` → Vercel auto-deploys (connected to `main` branch)
2. Vercel runs `npm run build` (Next.js 16 production build)
3. Environment variables configured in Vercel Dashboard (not in repo)
4. No manual step required — but verify deployment at `https://fajrak.com`

### 4.5 Post-Release Checklist

- [ ] `VERSION`, `pubspec.yaml`, `PLAY_STORE_RELEASE.md` aligned
- [ ] `PROJECT_CONTEXT.md` §4 updated with new version and test counts (`HANDOFF_REPORT.md` is intentionally untracked — do not recreate it)
- [ ] `CHANGELOG.md` has an `[Unreleased]` → released version section with Fixed/Security/Internal entries
- [ ] Mobile README updated after Play Store approval
- [ ] Vercel deployment healthy (check Functions, Edge, Analytics tabs) — **project paused, resume target 2026-11-30**

---

## 5. Workflow Reference Table

| Workflow File | Trigger | Purpose |
|---------------|---------|---------|
| `lint-test-build.yml` | PR / push to main | Web: lint, typecheck, test, build. Mobile: `flutter analyze`, `flutter test` |
| `neon-preview-branch.yml` | PR opened | Neon preview branch for schema validation |
| `supabase-validate.yml` | Push to main + manual | Migration structure guard + isolated schema validation |
| `supabase-backup.yml` | `0 2 * * *` (daily) | `pg_dump` → Cloudflare R2 (`fajrak-backups` bucket) — **currently failing nightly, see §7** |

**Removed workflows:** `smart-notifications.yml` (GitHub-Actions notification crons, deleted in
`d4e306d0` on 2026-10-31), `flutter-ci.yml` (folded into `lint-test-build.yml`),
`supabase-preview.yml` (replaced by `neon-preview-branch.yml`). The repo has exactly four
workflow files.

---

## 6. Secrets Required in GitHub / Vercel / Supabase

| Secret | Where | Purpose |
|--------|-------|---------|
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions | CLI auth for `supabase` commands |
| `SUPABASE_DB_URL` | GitHub Actions / Vercel | Direct PostgreSQL connection (for `pg_dump`, migrations) |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions / Vercel | Admin client for crons, backups |
| `CRON_SECRET` | Vercel / GitHub Actions | Bearer token for cron route auth |
| `ZAKAT_AUTOPILOT_SECRET` | Vercel | Auth for daily zakat cron |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Supabase Edge Function | FCM v1 OAuth JWT minting |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Vercel / Supabase | Web Push encryption |
| `CLOUDFLARE_R2_*` | GitHub Actions | Backup bucket credentials |

---

## 7. Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `Remote migration versions not found` | Deleted applied migration | Run `npx supabase migration repair --status reverted <timestamp>` |
| `supabase db reset` hangs | Docker daemon not running / port conflict | `docker ps`, free ports 5432, 54321, 8000 |
| Flutter build fails with "Could NOT find CURL" | Missing `libcurl4-openssl-dev` on Linux | `sudo apt install libcurl4-openssl-dev && rm -rf build/linux && flutter build` |
| Vercel deploy fails "CRON_SECRET not set" | Missing env var in Vercel Dashboard | Add `CRON_SECRET` to Production env |
| Playwright tests flaky | Timing / race conditions | Add `await expect(locator).toBeVisible({ timeout: 10000 })` |
| `Validate test counts (web)` fails with "N Jest test(s) failed" | A Jest test is red; the validator refuses to compare counts | Run `npx jest --ci`, fix the failing test (do not edit the validator) |
| `npm test` shows 832 → 831 | Test file deleted or renamed | Check `__tests__/` for missing test; restore or update count in `validate_test_counts` |