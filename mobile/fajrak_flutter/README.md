# Fajrak Flutter - Smart Finance Tracker

A Flutter finance tracking app with Supabase backend and Firebase integration.

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
make run-web-proxy
```

This starts a local proxy on port 33964 that forwards requests to Supabase with proper CORS headers.

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

# With CORS proxy (workaround)
make run-web-proxy
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
- **BYOK AI Chat** - Bring your own LLM key
- **Smart notifications** with Firebase
- **PDF reports** with charts
- **Zakat & FIRE calculators**
- **Arabic/English** localization with RTL support
- **Material 3** theming with Cairo font

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

## 🤝 Contributing

1. Follow `flutter_lints` style guide
2. Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
3. Add tests for new features
4. Update localization files (`assets/i18n/ar.json`, `en.json`)

## 📄 License

Proprietary - All rights reserved.