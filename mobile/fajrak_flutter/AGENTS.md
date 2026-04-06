# AGENTS.md - Fajrak Flutter App

## Architecture Overview
Fajrak is a Flutter finance tracker with 22 screens, sharing Supabase backend and Firebase with a Next.js web app for real-time sync. Core logic uses Supabase RPCs for accurate calculations across platforms.

- **State Management**: Provider with `AppState` class for theme, language, and unread alerts (`lib/app_state.dart`)
- **Navigation**: Named routes in `main.dart` + IndexedStack in `MainScreen` for bottom tabs
- **Data Flow**: Services (`lib/services/`) call Supabase directly; screens consume via Provider or direct calls
- **Localization**: `easy_localization` with JSON files (`assets/i18n/ar.json`, `assets/i18n/en.json`); use `.tr()` for keys like `'nav_dashboard'.tr()`

## Key Patterns
- **Feature-Based Structure**: Organize by domain - `screens/`, `services/`, `widgets/` with subfolders (e.g., `screens/auth/`, `widgets/dashboard/`)
- **Service Layer**: Static methods in services like `AccountsService.fetchAccounts()` using Supabase client and RPCs (e.g., `get_account_balances`)
- **UI Components**: Custom widgets in `widgets/`; reuse across screens (e.g., `MainBottomNavBar` in `widgets/main_screen/`)
- **Error Handling**: Global in `main.dart` with `ErrorHandler.handle()`; catch in async operations
- **Notifications**: Firebase FCM for remote, local for foreground; handle in `NotificationService` with deep linking
- **Theming**: Material 3 with Cairo font; light/dark/system modes via `AppState.themeMode`

## Developer Workflows
- **Setup**: `flutter pub get`; copy `.env.example` to `.env` with Supabase/Firebase keys; place `google-services.json` in `android/app/`
- **Run**: `flutter run` (auto-detects device); `flutter run -d <id>` for specific; `flutter devices` to list
- **Build**: `flutter build apk --release` for direct install; `flutter build appbundle --release` for Play Store
- **Test**: `flutter test` in `test/` directory; services tested with mocks (e.g., `currency_service_test.dart`)
- **Web Build**: `flutter build web` outputs to `build/web/`; served via Firebase Hosting (shared with Next.js)

## Conventions
- **Imports**: Relative paths within lib/; absolute for external packages
- **Naming**: Arabic comments in code; English for technical terms; camelCase for variables, PascalCase for classes
- **RTL Support**: Automatic via `easy_localization`; test with Arabic locale
- **Secrets**: Never commit `.env`, `google-services.json`, or keystore files
- **Dependencies**: Pin versions in `pubspec.yaml`; use `flutter pub outdated` to check updates
- **Code Style**: Follow `flutter_lints`; use `intl` for date/currency formatting (e.g., `CurrencyService.formatAmount()`)

## Integration Points
- **Supabase**: Auth, database, real-time subscriptions; RPCs for calculations (e.g., `get_account_balances` in `AccountsService`)
- **Firebase**: Messaging for notifications; Analytics via `AnalyticsService`
- **External APIs**: Currency rates via `CurrencyService` (Yahoo Finance + FreeGoldAPI)
- **Platform-Specific**: Android keystore in `android/app/`; web config in `web/`
- **Cross-Platform Sync**: Shared user data; mobile triggers web updates via Supabase real-time</content>
<parameter name="filePath">C:\Users\user\Projects\financetracker\mobile\fajrak_flutter\AGENTS.md
