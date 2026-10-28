<!-- generated-by: gsd-doc-writer -->

# Getting Started with Fajrak

This guide walks you through setting up the Fajrak (فجرك) finance tracker locally — both the Next.js 16 web app and the Flutter mobile app — so you can run, test, and develop against the shared Supabase backend.

---

## Prerequisites

| Tool | Required Version | Notes |
|------|------------------|-------|
| **Node.js** | >= 20.0.0 | LTS recommended (tested on v26.12.0) |
| **npm** | >= 10.0.0 | Bundled with Node.js |
| **Flutter** | 3.47.7 (stable) | Dart 3.13.5; run `flutter --version` to verify |
| **Android SDK** | API level 35 (targetSdk) | `flutter doctor -v` will flag missing components |
| **Supabase CLI** | 2.116.0 | `supabase --version` |
| **JDK** | 17 or newer | Required for Android builds |
| **Git** | Any recent version | For cloning the repo |

### Linux Desktop Build Dependencies (Flutter)

Only needed for `flutter run -d linux` or `flutter build linux`:

```bash
sudo apt-get install -y \
  clang cmake ninja-build pkg-config \
  libgtk-3-dev libstdc++-12-dev liblzma-dev \
  libcurl4-openssl-dev zlib1g-dev
```

The last two are required by `sentry_flutter` (vendors `sentry-native` via CMake). After installing, delete any stale cache before rebuilding:

```bash
rm -rf build/linux
```

---

## Installation Steps

### 1. Clone the Repository

```bash
git clone git@github.com:Abdoocoder/financetracker.git
cd financetracker
```

### 2. Install Web Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
# Edit .env with your credentials (see CONFIGURATION.md for the full list)
<!-- VERIFY: .env.example exists at repo root -->
```

**Minimum required variables for local development:**

```bash
# Supabase (get from your Supabase project dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase (for push notifications)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# VAPID (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your@email.com
```

> **Never commit real secrets.** `.env` is in `.gitignore`.

### 4. Fetch Mobile Dependencies

```bash
cd mobile/fajrak_flutter
flutter pub get
```

> The Flutter app reads the same `.env` file from the repo root for Supabase and Firebase credentials via the Makefile's `grep` logic. Do not create a separate `.env` inside `mobile/fajrak_flutter/`.

### 5. Android Setup (for mobile development)

1. Place `google-services.json` in `mobile/fajrak_flutter/android/app/` (download from Firebase Console → Project Settings → Your Android App).
2. Ensure `android/app/build.gradle.kts` uses the Flutter-pinned `targetSdk = flutter.targetSdkVersion` (currently API 35).

---

## First Run

### Web App (Next.js)

```bash
# From repo root
npm run dev
```

Open `http://localhost:3000` — you should see the Fajrak landing page. Sign up or sign in to access the dashboard.

**Health check endpoint:**

```bash
curl http://localhost:3000/api/health
# → {"ok":true}
```

### Mobile App (Flutter)

```bash
# From mobile/fajrak_flutter
make run
# or equivalently:
flutter run $(DART_DEFINES) $(SENTRY_DEFINE)
```

The `make run` command injects Supabase and Firebase credentials from the root `.env` via `--dart-define` flags. **Never run `flutter build appbundle --release` directly** — it bypasses the credential injection and produces a build that cannot authenticate (see `mobile/fajrak_flutter/PLAY_STORE_RELEASE.md` v3.42.2 and `HANDOFF_REPORT.md`). <!-- VERIFY: PLAY_STORE_RELEASE.md documents the credential injection fix -->

**Run Flutter Web (for rapid iteration):**

```bash
# Terminal 1: Start CORS proxy
make run-proxy

# Terminal 2: Run Flutter web against proxy
make run-web-with-proxy
```

- Flutter web: `http://localhost:33963`
- Proxy: `http://localhost:33964` (forwards `/api/*` to production, other calls to local Supabase)

---

## Common Setup Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Supabase connection fails** | Missing or incorrect `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Verify values in `.env` match your Supabase project dashboard (Settings → API). |
| **Flutter build fails with "Could NOT find CURL"** | Missing `libcurl4-openssl-dev` (Linux desktop) | Run `make setup-linux`, then `rm -rf build/linux && flutter run -d linux`. |
| **Firebase auth fails on mobile** | `google-services.json` missing or wrong package name | Ensure file is at `mobile/fajrak_flutter/android/app/google-services.json` and package name matches `com.fajrak.app` (or your configured ID). |
| **Push notifications don't arrive** | VAPID keys or Firebase config missing | Verify all `NEXT_PUBLIC_FIREBASE_*`, `VAPID_*`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` are set. Check `notification_preferences` quiet hours in the app. |
| **Zakat calculations show stale prices** | RPC defaults ($30/0.35/1.0) used instead of live prices | The app fetches live gold/silver/FX via `lib/zakat-prices.ts` (web) or `metal_price_service.dart` (mobile) and passes them to `sync_zakat_haul_state`. Ensure network access for price APIs. |
| **TypeScript errors on `npm run typecheck`** | Generated types out of sync | Run `npx supabase gen types typescript --project-id <ref> > types/supabase.ts` (or pull from Supabase dashboard). <!-- VERIFY: types/supabase.ts is a generated file, not committed to repo --> |
| **E2E tests fail to authenticate** | `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` not set | Create a dedicated test user in Supabase Auth and add credentials to `.env`. |

---

## Next Steps

After your first successful run:

- **Development workflow:** See [docs/guides/development.md](docs/guides/development.md) for local setup, build commands, code style, branch conventions, and PR process.
- **Testing:** See [docs/testing/testing.md](docs/testing/testing.md) for running unit, integration, and E2E tests on web and mobile.
- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md) for system overview, component diagram, data flow, and key abstractions.
- **Configuration:** See [CONFIGURATION.md](CONFIGURATION.md) for the complete environment variable reference and config file details.
- **Deployment:** See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment targets, CI/CD pipeline, and rollback procedures.
- **Domain guides:**
  - Islamic Finance (Zakat, Hawl, FIRE): [`docs/domain/islamic-finance.md`](docs/domain/islamic-finance.md)
  - BYOK AI + MCP: [`docs/domain/byok-ai.md`](docs/domain/byok-ai.md)
  - Data Model & RLS: [`docs/domain/data-model.md`](docs/domain/data-model.md)
  - Observability & Security: [`docs/domain/observability-and-security.md`](docs/domain/observability-and-security.md)
  - Push, Offline Sync, Gamification: [`docs/domain/background-and-jobs.md`](docs/domain/background-and-jobs.md)
  - UI / Mobile / Alerts: [`docs/domain/ui-and-mobile.md`](docs/domain/ui-and-mobile.md)

---

## Verification Checklist

- [ ] `npm run dev` starts without errors on `http://localhost:3000`
- [ ] `curl localhost:3000/api/health` returns `{"ok":true}`
- [ ] `make run` (or `flutter run`) launches the mobile app on a device/emulator
- [ ] You can sign up and sign in on both platforms
- [ ] Supabase Realtime works: changes in web appear instantly on mobile (and vice versa)
- [ ] `npm test` passes (756 tests / 82 suites)
- [ ] `cd mobile/fajrak_flutter && flutter test` passes (260 tests)