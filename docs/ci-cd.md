# CI/CD Pipelines Guide

> Complete reference for GitHub Actions workflows, Supabase preview deployments, migration repair, and release process.

---

## 1. CI Checks (Runs on Every PR / Push)

Workflow: `.github/workflows/ci.yml` (or equivalent)

| Job | Purpose | Key Steps |
|-----|---------|-----------|
| `lint-test-build` | Full web health check | `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` |
| `validate_test_counts` | Enforces test count integrity | Runs the Jest suite and fails when totals disagree with PROJECT_CONTEXT.md §4 (Flutter half runs in the mobile job) |

**Required status checks for merge:** Both jobs must pass. No bypass.

---

## 2. Supabase Preview Deployment

Workflow: `.github/workflows/supabase-preview.yml`

**Trigger:** PR opened / synchronized against `main`

**What it does:**
1. Spins up a **fresh local Supabase stack** (PostgreSQL 17, Auth, Realtime, Storage, Edge Functions) via `supabase start`
2. Applies **all migrations** in order (`supabase db reset --linked` equivalent)
3. Seeds test data if `supabase/seed.sql` exists
4. Runs pgTAP tests (`supabase/tests/*.sql`) against the preview DB
5. Posts a comment on the PR with connection details (local tunnel URL, anon key) for manual testing
6. Tears down on PR close or after 6 hours

**Why it matters:** Catches migration conflicts, RLS policy regressions, and RPC signature mismatches **before** they hit prod. The preview DB is a true isolated replica — no shared state.

**If it fails:**
- Check the workflow logs for `supabase db reset` output
- Common cause: migration ordering (numbering gaps 020, 044–046) or a migration that assumes prod-only tables exist
- Fix: adjust migration SQL or add the missing `CREATE TABLE` to the migration file

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
| Root `VERSION` | `echo "3.47.6+72" > VERSION` | Single source of truth for mobile |
| `pubspec.yaml` | Edit `version: 3.47.6+72` | Must match `VERSION` exactly |
| `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md` | Add entry under `## [3.47.6+72]` | Release notes for Play Console |
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

### 4.3 Deploying to Google Play

1. Upload the `.aab` from `make build-bundle` to Play Console
2. Fill release notes from `PLAY_STORE_RELEASE.md`
3. Submit for review (track: production or internal testing)
4. Update `mobile/README.md` with the new version after approval

### 4.4 Deploying Web to Vercel

1. Push to `main` → Vercel auto-deploys (connected to `main` branch)
2. Vercel runs `npm run build` (Next.js 16 production build)
3. Environment variables configured in Vercel Dashboard (not in repo)
4. No manual step required — but verify deployment at `https://fajrak.com`

### 4.5 Post-Release Checklist

- [ ] `VERSION`, `pubspec.yaml`, `PLAY_STORE_RELEASE.md` aligned
- [ ] `HANDOFF_REPORT.md` header updated with new version
- [ ] `PROJECT_CONTEXT.md` §4 updated with new version
- [ ] `CHANGELOG.md` has `[3.47.0]` section with Fixed/Security/Internal entries
- [ ] Mobile README updated after Play Store approval
- [ ] Vercel deployment healthy (check Functions, Edge, Analytics tabs)

---

## 5. Workflow Reference Table

| Workflow File | Trigger | Purpose |
|---------------|---------|---------|
| `ci.yml` | PR / push to main | Lint, typecheck, test, build (web) |
| `flutter-ci.yml` | PR / push to main | `flutter analyze`, `flutter test` (mobile) |
| `supabase-preview.yml` | PR opened | Spin up preview DB, apply migrations, run pgTAP |
| `supabase-backup.yml` | `0 2 * * *` (daily) | `pg_dump` → Cloudflare R2 (`fajrak-backups` bucket) |
| `smart-notifications.yml` | Multiple daily UTC | Reminder crons (zakat, lessons, debts, etc.) |
| `zakat-autopilot.yml` | `0 8 * * *` (daily) | Calls `/api/zakat-autopilot` with `ZAKAT_AUTOPILOT_SECRET` |

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
| `npm test` shows 798 → 797 | Test file deleted or renamed | Check `__tests__/` for missing test; restore or update count in `validate_test_counts` |