<!-- generated-by: gsd-doc-writer -->
# DEPLOYMENT.md

## Deployment Targets

| Target | Platform | Config File | Description |
|--------|----------|-------------|-------------|
| **Web App** | Vercel | `vercel.json`, `next.config.mjs` | Next.js 16 (App Router, React 19) production deployment at `https://fajrak.com` |
| **Mobile App (Android)** | Google Play Store | `mobile/fajrak_flutter/Makefile`, `mobile/fajrak_flutter/pubspec.yaml` | Flutter 3.47.8 release App Bundle (`.aab`) built via Makefile with injected credentials |
| **Database** | Supabase (PostgreSQL 17) | `supabase/config.toml` (local), Supabase Dashboard | Project `ujwcvtpwsaidljecqbaa` — Auth, Database, Realtime, Edge Functions, Storage |
| **Push Notifications** | Firebase (FCM) | `mobile/fajrak_flutter/firebase.json`, `mobile/fajrak_flutter/android/app/google-services.json` | Android FCM via Firebase project `fajrak-f7df1`; Web Push via VAPID keys |
| **Monitoring** | Sentry, Vercel Analytics | `next.config.mjs`, `mobile/fajrak_flutter/lib/services/sentry_service.dart` | Error tracking, web vitals |

---

## Build Pipeline

### CI/CD Workflows (GitHub Actions)

Four workflows live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lint-test-build.yml` | push / PR to `main` | Web lint, typecheck, tests, build; Flutter analyze + test |
| `supabase-validate.yml` | push to `main`, manual | Dry-run, prod-safe Supabase validation |
| `neon-preview-branch.yml` | PR opened / closed | Creates and deletes a Neon preview branch (diagnostics sandbox only — no Auth/PostgREST, no RLS) |
| `supabase-backup.yml` | daily 02:00 UTC, manual | Supabase daily backup |

None of them publishes the mobile app. Deployment itself is host-managed or manual:
- **Web**: Vercel auto-deploys on push to `main` (build: `npm run build`). **⚠️ The Vercel project is currently paused** (`live: false`, last production deploy 2026-10-31) with an operator-stated resume target of **2026-11-30**. Pushes to `main` will not serve traffic until the pause is lifted — check Vercel before assuming a web deploy is live.
- **Mobile**: Manual `make build-bundle` + Play Console upload
- **Database**: Supabase Dashboard for migrations; backups via Supabase PITR
- **Crons**: Vercel Cron Jobs (configured in `vercel.json`)

### Web Build (Vercel)

> **Paused:** the `financetracker` Vercel project is paused (`live: false`). Its last production
> deployment was 2026-10-31 and the operator-stated resume target is 2026-11-30. Verify the
> project is live in the Vercel dashboard before treating a push to `main` as deployed.

```bash
# Local production build verification
npm run build

# Vercel auto-deploys on push to main
# Build command: npm run build
# Output directory: .next (Next.js default)
# Install command: npm ci
```

### Mobile Build (Google Play Store)

```bash
cd mobile/fajrak_flutter

# ⚠️ NEVER run flutter build appbundle --release directly
# The Makefile injects Supabase and Firebase credentials via --dart-define
# Bypassing it produces a build with empty credentials → login fails in production

# Correct command (reads .env for credentials):
make build-bundle
# Output: build/app/outputs/bundle/release/app-release.aab
```

**Makefile Credential Injection** (from `mobile/fajrak_flutter/Makefile`):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — from `.env` (unanchored `grep`)
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID` — from `.env` (unanchored `grep` for `FIREBASE_*`)
- `SENTRY_DSN` — from `.env` (mobile-only DSN, kept out of web builds)
- `API_BASE_URL` — defaults to `https://fajrak.com`, overridden for local proxy development

---

## Environment Setup

### Web (Vercel Environment Variables)

Configure in Vercel Dashboard → Project → Settings → Environment Variables (Production, Preview, Development):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g., `https://ujwcvtpwsaidljecqbaa.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only, for crons/webhooks/migrations) |
| `NEXT_PUBLIC_APP_URL` | Yes | Production URL (`https://fajrak.com`) |
| `CRON_SECRET` | Yes | Strong random string for cron route authentication (`X-Cron-Secret` header) |
| `BYOK_PRIVATE_KEY` | Yes | RSA-2048 PEM private key (PKCS#8, base64 or raw) for BYOK envelope decryption |
| `NEXT_PUBLIC_BYOK_PUBLIC_KEY` | Yes | RSA public key (SPKI PEM) distributed to clients |
| `NEXT_PUBLIC_BYOK_KEK_ID` | Yes | Key version tag (e.g., `v1`) for envelope key rotation |
| `TIMEZONE_OFFSET_HOURS` | Yes | Default timezone offset (Gulf: `3`) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID for FCM web |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email (for FCM v1 OAuth) |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key (for FCM v1 OAuth JWT minting) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key for Web Push |
| `VAPID_EMAIL` | Yes | Contact email for VAPID (e.g., `support@fajrak.com`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Sentry DSN for web (must match org/project in `next.config.mjs`) |
| `SENTRY_AUTH_TOKEN` | Yes | Sentry auth token for source map upload |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Yes | Base64-encoded 32-byte key (generate: `openssl rand -base64 32`) |
| `TWELVE_DATA_KEY` | No | Twelve Data API key for market data |
| `NEXT_PUBLIC_EXCHANGE_RATE_KEY` | No | Exchange rate API key for currency conversion |

**Critical**: `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` must be set in both Production and Preview environments. Without a fixed key, Next.js derives a random key per build, causing "Failed to find Server Action" errors for users on stale builds.

### Mobile (Flutter `.env`)

File: `mobile/fajrak_flutter/.env`, or `mobile/fajrak_flutter/.env.local` if that is the file
you already have — the Makefile prefers `.env` and falls back to `.env.local`. `make setup`
copies `mobile/fajrak_flutter/.env.example` to `.env` only when neither file exists.

The root `.env.example` is not the template for this: it carries `NEXT_PUBLIC_*` web values plus
only `FIREBASE_API_KEY` / `FIREBASE_PROJECT_ID`, and lacks the rest of the mobile key set
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`).

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon public key |
| `FIREBASE_API_KEY` | Yes | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain (e.g., `fajrak.firebaseapp.com`) |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `FIREBASE_APP_ID` | Yes | Firebase app ID |
| `FIREBASE_MEASUREMENT_ID` | Yes | Firebase Analytics measurement ID |
| `SENTRY_DSN` | No | Sentry DSN for mobile (crash reporting skipped if absent) |

**Also required for a release build** — three gitignored files that are not in the repo:

| File | Source |
|------|--------|
| `mobile/fajrak_flutter/android/app/google-services.json` | Firebase Console → Project Settings → Your Android App (`fajrak-f7df1`, package `com.fajrak.app`) |
| `mobile/fajrak_flutter/android/key.properties` | Release signing config (`keyAlias`, `storeFile=upload-keystore.jks`) |
| `mobile/fajrak_flutter/android/app/upload-keystore.jks` | Release upload keystore |

`make build-bundle` and `make build-apk` depend on the `check-secrets` target, which aborts
with restore instructions if any of the three is missing — otherwise the build fails late with
`File google-services.json is missing` or a release signing-config error.

### Troubleshooting Build Failures

Run the preflight on its own at any time:

```bash
cd mobile/fajrak_flutter && make check-secrets
# ✅ Release build inputs present.
# ❌ Missing release build input: android/app/google-services.json   (exit 1)
```

| Error | Cause | Fix |
|---|---|---|
| `❌ Missing release build input: android/app/google-services.json` | Firebase config not restored after clone | Download it from Firebase Console → Project Settings → Your Android App (`fajrak-f7df1`, `com.fajrak.app`) |
| `❌ Missing release build input: android/key.properties` | Signing config absent | Recreate with `storePassword`, `keyPassword`, `keyAlias`, `storeFile=upload-keystore.jks` |
| `❌ Missing release build input: android/app/upload-keystore.jks` | Upload keystore absent | Restore the release keystore (never commit it) |
| `File google-services.json is missing` after several minutes | You ran `flutter build appbundle --release` directly | Re-run through `make build-bundle` |
| `Keystore file ... not found` / null signing config | `storeFile` path wrong or keystore missing | Confirm `key.properties` resolves relative to `android/app`, then run `make check-secrets` |

If `storeFile` changes, update `RELEASE_INPUTS` in the Makefile as well. `make check-secrets`
only reads the three paths — it never prints their contents.

---

## Rollback Procedure

### Web (Vercel)

**Option 1: Git Revert + Push (recommended — fixes git history)**
```bash
# 1. Find the bad merge commit
git log --oneline -20

# 2. Revert the merge commit (preserves history)
git revert -m 1 <merge-commit-sha>

# 3. Push to main (Vercel auto-deploys the revert)
git push origin main

# 4. Verify Vercel builds and deploys the revert commit
# Watch Vercel Dashboard → Deployments
```

**Option 2: Vercel Dashboard Promotion (faster, doesn't fix git history)**
1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known good deployment
3. Click "..." menu → "Promote to Production"

### Mobile (Google Play Store)

1. In Play Console, go to **Release → Testing** (or Production)
2. Click "Create new release" on the previous track
3. Upload the previous `.aab` artifact (keep artifacts from CI or local builds)
4. Submit for review / staged rollout

**Alternative**: If the issue is config-only (no code change), rebuild the previous version tag:
```bash
git checkout <previous-version-tag>
cd mobile/fajrak_flutter && make build-bundle
# Upload the resulting .aab to Play Console
```

### Database (Supabase)

**Point-in-Time Recovery (PITR)** — Available on Supabase Pro plan:
1. Supabase Dashboard → Project → Database → Backups
2. Select "Point-in-Time Recovery"
3. Choose timestamp before the breaking migration
4. Restore to a new branch/project, verify, then promote

**Manual Backup Restore** (see `docs/runbooks/database-backup.md`):
```bash
# 1. Create a preview branch (or use the PR preview DB from .github/workflows/neon-preview-branch.yml)
# 2. Restore the backup
psql "$PREVIEW_DB_URL" -f backup_critical_20261025_143000.sql

# 3. Verify row counts match
psql "$PREVIEW_DB_URL" -c "SELECT count(*) FROM alerts;"
psql "$PROD_DB_URL"     -c "SELECT count(*) FROM alerts;"

# 4. If preview restore works, restore to prod (coordinate — downtime required)
psql "$SUPABASE_DB_URL" -f backup_critical_20261025_143000.sql
```

---

## Monitoring

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Sentry (Web)** | Error tracking, performance monitoring | `@sentry/nextjs` in `next.config.mjs`; DSN from `NEXT_PUBLIC_SENTRY_DSN`; `tracesSampleRate: 0.1`; replay on errors with `maskAllText: true` |
| **Sentry (Mobile)** | Crash reporting | `sentry_flutter` in `lib/services/sentry_service.dart`; init skipped if no `SENTRY_DSN` dart-define; drops events with `Authorization`/`Cookie` headers; redacts keys containing `password`, `anon_key`, `api_key`, etc. |
| **Vercel Analytics** | Web Vitals (LCP, INP, CLS) | Auto-enabled via `@vercel/speed-insights` in `package.json` |
| **Vercel Speed Insights** | Real-user performance metrics | Auto-enabled |
| **Supabase Analytics** | Mobile user events | `AnalyticsService` in `lib/services/analytics_service.dart`; logs screen views, transactions, chat interactions to `app_events` table |
| **Supabase Logs** | Database/API errors, slow queries | Dashboard → Logs; daily review recommended |
| **Uptime Monitoring** | Health endpoint availability | `GET https://fajrak.com/api/health` → `{"ok":true}`; configure Pingdom/Better Uptime (1-min interval) <!-- VERIFY: uptime monitoring endpoint URL --> |

### Key Alerting Rules (from `observability/alerts/`)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| BYOK Proxy High Errors | Error rate > 5% over 5 min | `observability/runbooks/byok-proxy-high-errors.md` |
| BYOK Proxy High Latency | p95 latency > 2s over 5 min | `observability/runbooks/byok-proxy-high-latency.md` |
| BYOK Proxy SSE Stalled | No SSE chunk for > 30s | `observability/runbooks/byok-proxy-sse-stalled.md` |
| BYOK Proxy Rate Limit Spike | 429 rate > 20% over 5 min | `observability/runbooks/byok-proxy-rate-limit-spike.md` |
| MCP Server PAT Auth Failures | 401 rate > 10% over 10 min | `observability/runbooks/mcp-pat-auth-failures.md` |
| MCP Server Scope Violations | 403 rate > 5% over 10 min | `observability/runbooks/mcp-scope-violations.md` |
| Crypto Envelope Errors | Decrypt/unwrap failure rate > 1% | `observability/runbooks/crypto-envelope-errors.md` |
| PAT Rate Limit Exceeded | Per-key limit breached | `observability/runbooks/pat-rate-limit-capacity.md` |
| Proxy Rate Limit Exceeded | Global proxy limit breached | `observability/runbooks/proxy-rate-limit-capacity.md` |

**Rule**: An alert without a runbook is incomplete — add one when adding an alert.

---

## Post-Release Checklist

- [ ] `VERSION`, `mobile/fajrak_flutter/pubspec.yaml`, `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md` aligned
- [ ] `PROJECT_CONTEXT.md` §4 updated with new version and test counts (the `HANDOFF_REPORT.md` it replaced is intentionally untracked since the 2026-10-29 scrub — do not recreate it)
- [ ] `CHANGELOG.md` has `[x.y.z]` section with Fixed/Security/Internal entries
- [ ] Mobile `README.md` version updated to match `pubspec.yaml` (currently 3.47.8+74)
- [ ] Vercel deployment healthy (check Functions, Edge, Analytics tabs) — **currently paused until 2026-11-30**
- [ ] Sentry receiving test events (trigger a test error in staging)
- [ ] Cron jobs executed (check Vercel Cron Jobs dashboard)
- [ ] Supabase backup completed (check Supabase Dashboard → Database → Backups)

---

## Quick-Start Commands

```bash
# 1. Full local health check (web)
npm run doctor
# Runs: next info → audit → lint → typecheck → test:coverage → build

# 2. Full local health check (mobile)
cd mobile/fajrak_flutter && make analyze && make test

# 3. Build production artifacts
npm run build                                    # Web
cd mobile/fajrak_flutter && make build-bundle   # Android AAB

# 4. Deploy web (after Vercel connected to main branch)
git push origin main  # triggers Vercel auto-deploy

# 5. Upload Android bundle to Play Console
# Upload: mobile/fajrak_flutter/build/app/outputs/bundle/release/app-release.aab

# 6. Monitor
# - Sentry: https://sentry.io/organizations/abdullah/projects/fajrak/
# - Vercel Analytics: https://vercel.com/abdullah/financetracker/analytics
# - Supabase Dashboard: https://supabase.com/dashboard/project/ujwcvtpwsaidljecqbaa
```