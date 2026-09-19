# AGENTS.md - Fajrak Flutter App

## Architecture Overview
Fajrak is a Flutter finance tracker with 22 screens, sharing Supabase backend and Firebase with a Next.js web app for real-time sync. Core logic uses Supabase RPCs for accurate calculations across platforms.

- **State Management**: Provider with `AppState` class for theme, language, and unread alerts (`lib/app_state.dart`)
- **Navigation**: Named routes in `main.dart` (now also imports chat screen for BYOK AI feature) + IndexedStack in `MainScreen` for bottom tabs
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
- **Cross-Platform Sync**: Shared user data; mobile triggers web updates via Supabase real-time

## Onboarding 2026-09 (New Agent Notes)
### Testing Conventions
- `flutter test` runs 13 files under `test/`; plain `group()`/`test()` from `flutter_test`, no mocking framework (inline constants/maps; helpers declared inside `group()`)
- English descriptions for services/i18n tests; Arabic for repository tests (e.g., `'10 تحديثات على نفس المعاملة ينتج payload مدمج'`)
- Raw timeouts accepted in service tests (no `fake_async`); `TestWidgetsFlutterBinding.ensureInitialized()` + `setUp` with `late Map<String, dynamic>` in i18n test
- `test/i18n_keys_test.dart`: const `I18n` class asserts `ar.json`/`en.json` parse, identical key sets, non-empty strings, exact BYOK wording; `byokChatKeys` (28) + `byokSettingsKeys` (4) + `more_ai_chat`
- `test/` mirrors `lib/`; model/repository tests run without live Supabase/Firebase

### Error Handling
- `ErrorHandler.handle(e, context)` in `lib/utils/error_handler.dart`: logs via `dev.log(name: 'ErrorHandler')`, sends `AnalyticsService.logError`, shows SnackBar (`Icons.wifi_off`/`Icons.error_outline`) only when `context?.mounted`
- `_isNetworkError`: matches `SocketException` or `'socketexception' | 'failed host lookup' | 'no address associated' | 'authretryablefetchexception' | 'network is unreachable' | 'connection refused'` (case-insensitive) → `'error_no_internet'.tr()` else `'error_generic'.tr()`

### Git / Naming Conventions
- Commit prefixes observed (`git log --oneline -20`): `fix:`, `fix(build):`, `chore:`, `chore(deps):`, `docs:`, `docs(router):`, `feat:`, `feat(byok):`, `merge:` — follow per-scope style
- Feature subfolders under `lib/screens/` and `lib/widgets/`; classes `XxxScreen`/`XxxService`/`XxxRepository`
- Arabic comments in code; English for technical terms and guide feedback; app UI strings localized via `.tr()`

### Sync & BYOK Details
- Sync merge in `SyncService`: `remoteVersion = (data['local_version'] as int?) ?? 1`; `localVersion = local?.localVersion ?? 0`; op `'delete'` → local delete; local null → insert with `syncStatus: 'synced'` + `localVersion: remoteVersion`; `remoteVersion > localVersion` → drift update; else `MergeResult.conflict`
- `_applyDelete` handles only 4 entity types (`transactions`, `debts`, `savings_goals`, `budgets`) though `SyncQueue.entityType` comment lists 6 (incl. `'recurring'`)
- `pushPendingChanges`: per-item failure → `ErrorHandler.handle` + backoff (`getBackoffDuration`); `attemptCount >= 3` → permanent failure; `fullSync` = `pullWithPagination` → `pushPendingChanges` → `SyncResult`
- `TransactionRepository` queues: `enqueueCreate` cancels pending `'delete'` for same `entityId` (and vice versa), `entityType: 'transaction'`
- BYOK (`LlmService.clientDirect` only): vault keys in secure storage prefixes `byok_key_` / `llm_key_`, device-only via `flutter_secure_storage` + `webcrypto`; `kTemperature = 0.2`; default Ollama base URL `http://10.0.2.2:11434/v1` on Android emulator else `http://localhost:11434/v1`
- BYOK proxy envelope `(env, payload, keyId)`: payload = `base64(IV(12) || AES-256-GCM ciphertext)`; env = `base64(RSA-OAEP-SHA256(ephemeral AES key))`; POST `{providerId, keyId, env, payload, body, stream}` to `{proxyBaseUrl}/api/byok/proxy` with session JWT
- `NotificationService` (3 Android channels: `budget_alerts` high, `debt_reminders` max, `saving_goals` default) early-returns on `kIsWeb`
- `PdfReportService.shareMonthlyReport(ReportData)`: palette `_green 0xFF10B981`, `_red 0xFFEF4444`, `_blue 0xFF3B7EF6`, `_bg 0xFFF8FAFC`, `_text 0xFF0F172A`, `_muted 0xFF64748B`, `_border 0xFFE2E8F0`
- Account colors sent as `'#${_color.toARGB32().toRadixString(16).substring(2).toUpperCase()}'`
- `MainScreen` IndexedStack: 5 tabs (0=More, 1=Accounts, 2=Debts, 3=Transactions, 4=Dashboard default) + deep-link `{'tab': int}`