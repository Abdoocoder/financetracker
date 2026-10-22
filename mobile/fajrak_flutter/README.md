# Fajrak Flutter - Smart Finance Tracker

A Flutter finance tracking app with Supabase backend and Firebase integration.

**Version:** 3.45.0+64

## 🚀 Quick Start

### Prerequisites
- Flutter SDK 3.22+
- Dart SDK 3.4+
- Android Studio / Xcode (for mobile)
- Chrome (for web)

### Setup
```bash
cd mobile/fajrak_flutter
make setup
```

This will:
1. Install Flutter dependencies
2. Create `.env` from `.env.example` (edit with your credentials)

### Required Environment Variables

Edit `.env` with your credentials:
```env
# Supabase (get from Supabase Dashboard > Settings > API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Firebase (get from Firebase Console > Project Settings)
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🌐 Web Development & CORS Issue

### The Problem
When running `flutter run -d chrome`, the app runs on `http://localhost:33963` and makes requests to Supabase. Supabase blocks these requests due to CORS policy because `localhost:33963` is not in the allowed origins.

### Solution 1: Add to Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ujwcvtpwsaidljecqbaa/auth/url-configuration)
2. Add to **Additional Redirect URLs**:
   ```
   http://localhost:33963/**
   http://127.0.0.1:33963/**
   ```
3. Save changes

### Solution 2: Use Development Proxy (Alternative)
```bash
make run-web-with-proxy
```

This starts a local proxy on port 33964 that forwards `/api/*` to
`https://fajrak.com` and everything else to Supabase, with CORS headers your
browser will accept. It needs `make run-proxy` running in another terminal.

## 🏃 Running the App

### Mobile
```bash
# Run on connected device/emulator
make run

# Or specific device
flutter run -d <device_id>
```

### Web
```bash
# Basic web run (requires Supabase CORS fix)
make run-web

# With CORS proxy (run `make run-proxy` in another terminal first)
make run-web-with-proxy
```

### Web with Custom Environment
```bash
flutter run -d chrome \
  --web-port=33963 \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

## 📦 Building

### Web (Production)
```bash
make build-web
# Output: build/web/
```

### Android
```bash
# APK for direct install
make build-apk
# Output: build/app/outputs/flutter-apk/app-release.apk

# App Bundle for Play Store
make build-bundle
# Output: build/app/outputs/bundle/release/app-release.aab
```

> **⚠️ Important:** The `make build-apk` and `make build-bundle` commands now automatically embed Supabase/Firebase credentials from your `.env` file using `--dart-define`. This fixes authentication issues in production builds.
> 
> **Do NOT run** `flutter build appbundle --release` **directly** — it won't include credentials and will cause login failures.

### ⚠️ Android 13+ Advertising ID
If targeting Android 13+ with Firebase Analytics, add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="com.google.android.gms.permission.AD_ID"/>
```

### ⚠️ Kotlin Gradle Plugin Migration
Current plugins (`firebase_analytics`, `firebase_core`, `flutter_app_badge_control`) use legacy KGP.
Migrate to Built-in Kotlin before Flutter drops support:
- [Migration Guide](https://docs.flutter.dev/release/breaking-changes/migrate-to-built-in-kotlin/for-app-developers)

### ⚠️ Android 15 Edge-to-Edge (API 35)
App uses `enableEdgeToEdge()` in `MainActivity.kt` with transparent system bar colors in themes.
This resolves Play Console warnings about deprecated `setStatusBarColor`/`setNavigationBarColor` APIs.

### iOS
```bash
flutter build ios --release
# Then archive in Xcode
```

## 🧪 Testing

```bash
# Run all tests
make test

# With coverage report
make test-coverage
# View: coverage/html/index.html
```

## 🔧 Development Commands

```bash
# Update dependencies
make deps

# Static analysis
make analyze

# Clean build artifacts
make clean
```

## 📁 Project Structure

```
lib/
├── main.dart                 # App entry point
├── app_state.dart            # Global state (theme, locale, alerts)
├── core/                     # Core theme & styling
├── database/                 # Database connections
├── models/                   # Data models
├── providers/                # State providers
├── screens/                  # Feature screens (22 screens)
│   ├── auth/                 # Login, register, onboarding
│   ├── dashboard/            # Main dashboard
│   ├── accounts/             # Account management
│   ├── transactions/         # Transaction management
│   ├── debts/                # Debt tracking
│   ├── budgets/              # Budget management
│   ├── goals/                # Savings goals
│   ├── investments/          # Investment tracking
│   ├── alerts/               # Smart alerts
│   ├── chat/                 # BYOK AI chat
│   ├── more/                 # Calculators, settings
│   └── settings/             # App settings
├── services/                 # Business logic & API calls
│   ├── accounts_service.dart
│   ├── currency_service.dart
│   ├── notification_service.dart
│   ├── sync_service.dart
│   └── byok/                 # Bring Your Own Key AI
├── utils/                    # Helpers & utilities
└── widgets/                  # Reusable UI components
```

## 🔑 Key Features

- **Multi-currency support** with real-time exchange rates
- **Offline-first** with Supabase sync
- **BYOK AI Chat v3.42.0** — Bring your own LLM key with 3 providers (Ollama clientDirect, OpenRouter + NVIDIA NIM via proxy), SSE streaming, key rotation UI, vault-aware filtering
- **ClientDirect Ollama** — Local LLM on `http://localhost:11434/v1` (Android emulator: `http://10.0.2.2:11434/v1`)
- **Network Security Config** — LAN CIDR allowances for local Ollama (no blanket cleartext)
- **Smart notifications** with Firebase
- **PDF reports** with charts
- **Zakat & FIRE calculators** — with **Zakat Autopilot**: DB-side Hawl state machine (`sync_zakat_haul_state` RPC), dashboard countdown card, Zakat-page banner, and due-date push reminders
- **Arabic/English** localization with RTL support
- **Material 3** theming with Cairo font

## 🔮 Recent Updates (Unreleased)
- **Zakat Autopilot**: dashboard "حالة الحول" countdown card (`ZakatHawlCard`) + Zakat-page banner, both rendered purely from the `sync_zakat_haul_state` RPC (no local Hawl math); daily `/api/zakat-autopilot` cron pushes a reminder when the Hawl is ≤ 7 days out
- **Stability**: `make run-web` passes the shared `DART_DEFINES` credentials; live gold/silver prices parsed defensively (`_parsePrice` accepts `num` or `String` — fixes the Flutter Web crash)

## 🆕 Recent Updates (v3.44.0)
- **AI Assistant**: proper Markdown rendering (migrated to `flutter_markdown_plus`), Arabic prompt tuning, JOD 3-decimal formatting
- **Alerts**: timezone-aware morning greeting (05:00–10:59 local) + zero-budget trigger guard
- **Security**: 11 `currentUser!` force-unwraps replaced with null-safe early returns
- **Android**: Firebase FID registration manifest flag added (`firebase_messaging_installation_id_enabled`)
- **Dependency**: migrated `flutter_markdown` → `flutter_markdown_plus ^1.0.12`

## 🔐 Security

- **Never commit** `.env`, `google-services.json`, or keystore files
- API keys stored in `--dart-define` at build time
- BYOK keys encrypted in secure storage (device only)
- Supabase RLS policies enforce data isolation

## 📱 Platform Support

| Platform | Status |
|----------|--------|
| Android  | ✅     |
| iOS      | ✅     |
| Web      | ✅     |
| Linux    | ✅     |
| macOS    | ⚠️     |
| Windows  | ⚠️     |

### Linux desktop build

The `sentry_flutter` plugin vendors the `sentry-native` C++ SDK and builds it via CMake on
the Linux target. That CMake step requires the **libcurl and zlib development packages** —
the runtime packages alone are not enough, and the failure looks unrelated to Sentry.

There are two distinct error signatures. They have different causes, and fixing one does
not fix the other.

**1. The development package is missing entirely**

```
Could NOT find CURL (missing: CURL_LIBRARY CURL_INCLUDE_DIR AsynchDNS)
```

No `curl/curl.h`, no link-time `libcurl.so`, no `libcurl.pc`.

**2. The library was found but the feature list is empty**

```
Could NOT find CURL (missing: AsynchDNS) (found version "8.18.0")
```

`CURL_INCLUDE_DIR` and `CURL_LIBRARY` were already cached from an earlier configure, but
`pkg-config` could not resolve `libcurl`, so CMake fell back to `curl-config` — which the
runtime package does not ship. Cached values hide the real problem, so the build reports
only the missing feature.

Install the prerequisites once per machine:

```bash
cd mobile/fajrak_flutter
make setup-linux        # clang cmake ninja-build pkg-config libgtk-3-dev \
                        # libstdc++-12-dev liblzma-dev libcurl4-openssl-dev zlib1g-dev
```

or directly:

```bash
sudo apt-get install -y libcurl4-openssl-dev zlib1g-dev
```

Verify the install:

```bash
pkg-config --variable=supported_features libcurl | tr ' ' '\n' | grep -x AsynchDNS
command -v curl-config
```

Both commands must succeed. Then drop the stale cache — a failed configure keeps the
resolved paths:

```bash
rm -rf build/linux
```

> Do not work around this by exporting a hand-extracted libcurl prefix through
> `PKG_CONFIG_PATH`. It only works in shells that export it, and every other terminal
> reproduces signature 2 above.

> `sentry_flutter` 8.14.2 vendors `sentry-native` 0.7.20, which still contains
> `find_package(CURL REQUIRED COMPONENTS AsynchDNS)`. Upstream removed that check in
> `sentry-native` 0.8.5 ([PR #1206](https://github.com/getsentry/sentry-native/pull/1206)),
> so upgrading `sentry_flutter` to 9.x/10.x drops the requirement altogether.

## 🤝 Contributing

1. Follow `flutter_lints` style guide
2. Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
3. Add tests for new features
4. Update localization files (`assets/i18n/ar.json`, `en.json`)

## 📄 License

Proprietary - All rights reserved.