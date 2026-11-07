# Flutter Bug Report — Fajrak Mobile App
**Date:** 2026-11-07  
**App Version:** 3.47.7+73 (release `com.fajrak.app@3.47.7+73`)  
**Flutter:** 3.47.8 • Dart: 3.13.7  
**Environment:** Android 11-16 (production)  
**Investigation:** Read-only — no code changes made

---

## Executive Summary

| Category | Count | Notable Issues |
|----------|-------|----------------|
| **P0/P1 (Critical)** | 5 | SyncService crash on pull-to-refresh, Firebase init crash on Android, Auth refresh token cascade, 504 Gateway Timeouts on multiple RPCs, SIGSEGV native crash |
| **P2 (Medium)** | 7 | Sync design gaps (missing tables, multi-currency data loss), Offline queue never fed, SQLCipher+sqlite3 conflict, Transfer sheet RangeError/StateError, Sentry fallback version stale |
| **P3 (Minor)** | 4 | DNS/network noise, Test account noise, ByokChatException unauthorized (user config), Hardcoded strings missing i18n |

**Static Analysis:** `flutter analyze` → **No issues found**  
**Test Suite:** `flutter test` → **347/347 tests passing**  
**i18n Parity:** `en.json` (1056 keys) = `ar.json` (1056 keys) — zero diff

---

## P0/P1 — Critical Issues (Crashes, Auth Failures, Data Loss Risks)

### 1. SyncService Crash on Pull-to-Refresh — **FAJRAK-MOBILE-R**
- **Error:** `TypeError: Null check operator used on a null value`
- **Stack Trace:**
  ```
  RefreshIndicatorState._show (refresh_indicator.dart:579)
  _TransactionsScreenState._triggerSync (transactions_screen.dart:94)
  SyncService.fullSync (sync_service.dart:570)
  SyncService.pullWithPagination (sync_service.dart:95)
  SyncService._mergeRecord (sync_service.dart:186)
  SyncService._mergeTransaction (sync_service.dart:203)
  SyncService.localDb (sync_service.dart:56)  ← ASSERTION FAILURE
  ```
- **Affected Files:**
  - `lib/services/sync_service.dart:56` — `localDb` getter asserts `_localDb != null`
  - `lib/services/sync_service.dart:49-51` — `initialize()` never called
  - `lib/main.dart:108` — Comment claims "initialized in auth state listener" but no such listener exists
  - `lib/screens/transactions/transactions_screen.dart:94` — Calls `SyncService.fullSync()` on pull-to-refresh
- **Root Cause:** `SyncService.initialize(AppDatabase)` is **never called** anywhere in the codebase. The comment in `main.dart:108` promises an auth-state listener that doesn't exist. The only `onAuthStateChange` listener is in `notification_service.dart:119` which only saves FCM tokens.
- **Impact:** App becomes fully unusable on pull-to-refresh after any remote transaction row returns — user must restart app.
- **Conceptual Fix:** Call `AppDatabase.initialize(encryptionKey)` + `SyncService.initialize(db)` after successful login (e.g., in splash screen after auth check, or in a dedicated auth-state listener). Guard `fullSync()` with `if (SyncService.maybeInstance == null) return;`.

---

### 2. Firebase Initialization Crash on Android — **FAJRAK-MOBILE-D**
- **Error:** `java.lang.Exception: Failed to load FirebaseOptions from resource. Check that you have defined values.xml correctly.`
- **Stack Trace:**
  ```
  main.dart:57 → SentryService.init → SentryFlutter.init → _bootstrapApp:82
  Firebase.initializeApp (firebase.dart:79)
  MethodChannelFirebase.initializeApp
  FirebaseCoreHostApi.optionsFromResource (messages.pigeon.dart:391)
  ```
- **Affected Files:**
  - `lib/main.dart:82` — `await Firebase.initializeApp();` (non-web branch, no options)
  - `mobile/fajrak_flutter/Makefile:21-27` — `FIREBASE_DEFINES` passed but only consumed by web branch
  - `android/app/google-services.json` — Gitignored, must be present at build time
- **Root Cause:** Android build uses implicit `Firebase.initializeApp()` via `google-services.json`. If the file is missing or the Gradle plugin fails to generate `values.xml`, the native crash occurs at startup. The Makefile passes `FIREBASE_*` dart-defines but the **Android branch doesn't use them**.
- **Impact:** Fatal crash on app start for affected users (3 users, 3 occurrences on build 73).
- **Conceptual Fix:** On Android, pass explicit `FirebaseOptions` from dart-defines (same as web branch) and wrap init in try-catch so failure degrades notifications instead of aborting boot.

---

### 3. Auth Refresh Token Cascade — **FAJRAK-MOBILE-8 / J / N** (Same user: `4cc9fd18d579...`)
Three intertwined issues affecting the same user on splash screen:

| Issue | Error | Trigger |
|-------|-------|---------|
| **FAJRAK-MOBILE-8** | `AuthApiException: Invalid Refresh Token: Already Used` | `NotificationService.saveToken()` called from `onAuthStateChange` (un-awaited) + GoTrue auto-refresh |
| **FAJRAK-MOBILE-J** | `AuthRetryableFetchException: Software caused connection abort` | Concurrent refresh token requests during splash |
| **FAJRAK-MOBILE-N** | `PostgrestException: permission denied for table profiles (42501)` | 401/42501 during `/splash` profile fetch after auth failure |

- **Affected Files:**
  - `lib/services/notification_service.dart:119-124` — `onAuthStateChange` listener calls `saveToken()` **un-awaited**
  - `lib/services/notification_service.dart:235` — `saveToken()` does Supabase upsert
  - `lib/screens/splash_screen.dart:48,74-78` — `refreshSession()` called, then profile fetch
  - `lib/main.dart:88` — `NotificationService.initialize()` called before auth state stabilizes
- **Root Cause:** Race condition between:
  1. GoTrue client auto-refreshing token in background
  2. `NotificationService.onAuthStateChange` firing `saveToken()` (un-awaited)
  3. Splash screen explicitly calling `refreshSession()`
  All three can trigger concurrent refresh requests → "refresh_token_already_used" → auth failure → profile fetch fails with 401.
- **Impact:** User stuck on splash screen, cannot enter app.
- **Conceptual Fix:**
  - Make `saveToken()` idempotent and await it in the listener, or debounce auth state events.
  - Remove explicit `refreshSession()` from splash — rely on GoTrue's auto-refresh.
  - Add a guard: only call `saveToken()` if token actually changed.

---

### 4. 504 Gateway Timeouts on Unprotected RPCs — **FAJRAK-MOBILE-F/E/Q/P** (12+ occurrences, 6 users)
- **Error:** `PostgrestException: code: 504, details: Gateway Timeout`
- **Affected Files:**
  - `lib/services/finance_service.dart` — Only `fetchFinancialDashboard` and `sync_zakat_haul_state` use `_rpcWithRetry` wrapper
  - **Unprotected RPCs (no retry):**
    - `fetchMonthlyFinancialSummary` (line 41)
    - `fetchZakatSummary` (line 68)
    - `fetchZakatHauls` (line 82)
  - `lib/main.dart:92-95` — Supabase client configured with `retryEnabled: true, retryCount: 3` but **Postgrest retries only apply to GET/HEAD** — RPC calls use POST and are **not retried**.
- **Root Cause:** Postgrest's built-in retry only works for GET/HEAD requests. RPC calls use POST and bypass the client-level retry. Only the custom `_rpcWithRetry` wrapper handles 504s, and it's only applied to 2 of 5 RPC methods.
- **Impact:** Intermittent failures on dashboard load, Zakat calculator, monthly summary — user sees error snackbar, data doesn't load.
- **Conceptual Fix:** Wrap **all** Supabase RPC calls in `_rpcWithRetry` (or a shared retry utility). Consider adding `retryableStatusCodes: {504, 502, 503, 408, 429}` to a custom Postgrest client that retries POST.

---

### 5. SIGSEGV Native Crash — **FAJRAK-MOBILE-2** (3 occurrences, 2 users)
- **Error:** `SIGSEGV: Segfault` (no Dart stack trace, `mechanism: signalhandler`)
- **Device Context:** OnePlus8Pro, Android 11, **x86_64 arch**, screen 288×448 @106dpi — **emulator-like device**
- **Affected Files:** Native layer (SQLCipher, sqlite3, or Flutter engine)
- **Hypothesis:** Conflict between `sqlite3_flutter_libs: ^0.6.0+eol` and `sqlcipher_flutter_libs: ^0.7.0+eol` both bundled (see P2 #3). The x86_64 architecture on a physical OnePlus8Pro suggests an emulator or test lab device. SQLCipher's native library may not have x86_64 symbols, or plain SQLite loads first making `PRAGMA key` a silent no-op.
- **Impact:** Fatal native crash, app terminates instantly.
- **Conceptual Fix:**
  - Remove `sqlite3_flutter_libs` dependency (SQLCipher includes its own SQLite).
  - Upload native symbols to Sentry for symbolicated stack traces.
  - Test on x86_64 emulator explicitly; verify `PRAGMA cipher_version` returns non-null at runtime.

---

## P2 — Medium Issues (Sync Gaps, Data Loss, UI Bugs)

### 6. Sync Design Gaps — Missing Tables & Multi-Currency Data Loss
**A. `_fetchDeletedRecords` only covers 4 of 6 syncable entity types**
- **File:** `lib/services/sync_service.dart:155` — `tables = ['transactions', 'debts', 'savings_goals', 'budgets']`
- **Missing:** `accounts`, `recurring_transactions` (defined in `SyncQueueTable.entityType` at `app_database.dart:194`)
- **Impact:** Soft deletes on accounts/recurring transactions never synced to local DB → stale local data.

**B. Multi-currency fields omitted in UPDATE branch of `_mergeTransaction`**
- **File:** `lib/services/sync_service.dart:246-260` — Update branch writes only basic fields
- **Missing on update:** `originalAmount`, `originalCurrency`, `exchangeRate`, `transferToAccountId`, `transferPairId`, `sourceRecurringId`, `recurringDay`
- **Impact:** Remote updates to multi-currency transactions lose currency metadata silently.

**C. Same issue in `_mergeDebt` update branch** — `originalAmountForeign`, `remainingAmountForeign`, `currency` not updated (lines 314-330).

**D. `_pushOperation` uses entityType as table name directly** (line 550)
- **Mapping mismatch:** `entityType='transaction'` → table should be `'transactions'`, etc.
- **Impact:** Push operations for accounts/recurring/budgets may target wrong table names.

---

### 7. Offline Sync Queue Never Fed
- **Files:** `lib/services/repositories/transaction_repository.dart` has `enqueueCreate/Update/Delete` but **no screen calls them**
- **Evidence:** Grep shows zero call sites for `enqueueCreate`/`enqueueUpdate`/`enqueueDelete` outside the repository itself
- **Impact:** "Offline-first" feature is unimplemented — all UI writes go directly to Supabase. If network fails, user sees error but nothing is queued for later sync.
- **Conceptual Fix:** Wire enqueue calls in transaction/add/edit dialogs, debt/goal/account screens. Add connectivity listener to trigger `fullSync()` on reconnect.

---

### 8. SQLCipher + sqlite3_flutter_libs Conflict
- **File:** `pubspec.yaml:63-64` — Both dependencies declared:
  ```yaml
  sqlite3_flutter_libs: ^0.6.0+eol
  sqlcipher_flutter_libs: ^0.7.0+eol
  ```
- **Risk:** Gradle/CocoaPods may pick plain `sqlite3` native library first. If so, `PRAGMA key` in `native.dart:16` becomes a silent no-op → **unencrypted database**.
- **Verification:** Add runtime check: `await db.customStatement('PRAGMA cipher_version');` — must return non-null.
- **Conceptual Fix:** Remove `sqlite3_flutter_libs`; SQLCipher bundles SQLite.

---

### 9. Transfer Sheet RangeError / StateError
- **File:** `lib/screens/accounts/accounts_screen.dart:378-379`
  ```dart
  _fromId = widget.accounts.firstWhere((a) => a['is_default'] == true, orElse: () => widget.accounts[0])['id'];
  _toId   = widget.accounts.firstWhere((a) => a['id'] != _fromId, orElse: () => widget.accounts[1])['id'];  // RangeError if only 1 account
  ```
- **File:** Line 431 — `widget.accounts.firstWhere((a) => a['id'] != _fromId)` — **StateError** if only 1 account (no `orElse`)
- **Impact:** Crash when opening transfer sheet with exactly 1 account, or changing dropdown when only 1 account exists.
- **Conceptual Fix:** Validate `widget.accounts.length >= 2` before showing transfer sheet. Add `orElse` with fallback or disable transfer UI for single-account users.

---

### 10. Sentry Fallback Release Version Stale
- **File:** `lib/services/sentry_service.dart:27` — `_fallbackRelease = 'com.fajrak.app@3.45.0+64'`
- **Actual:** `VERSION` = `3.47.7+73`, `pubspec.yaml` = `3.47.7+73`
- **Impact:** If `PackageInfo.fromPlatform()` times out (3s), Sentry events tagged with wrong release version (3.45.0 vs 3.47.7), breaking release tracking.
- **Conceptual Fix:** Update fallback to current version, or generate it from `pubspec.yaml` at build time.

---

## P3 — Minor Issues (Noise, Config, Polish)

### 11. DNS / Network Noise — **FAJRAK-MOBILE-S/T**
- **Error:** `OSError: No address associated with hostname, errno = 7`
- **Classification:** Transient network/DNS resolution failure — handled by `ErrorHandler._isNetworkError()` → shows "no internet" snackbar.
- **Action:** Monitor; no code change needed unless frequency increases.

---

### 12. Test Account Noise — **FAJRAK-MOBILE-V**
- **Error:** `AuthApiException: Email address "test@example.com" is invalid`
- **Classification:** User (or automated test) attempting invalid email signup. Not a bug.
- **Action:** None.

---

### 13. ByokChatException Unauthorized — **FAJRAK-MOBILE-K**
- **Error:** `ByokChatException(unauthorized)` — proxy returned 401/403
- **Classification:** User's BYOK API key rejected by provider (invalid/expired key). Correctly surfaced via `chat_error_unauthorized` i18n key.
- **Action:** None — user must update their API key.

---

### 14. Hardcoded Strings Missing i18n
- **Files:**
  - `lib/screens/learn/learn_screen.dart:368` — `'فجرك'` (brand name, arguably OK)
  - `lib/screens/learn/learn_screen.dart:431` — `'fajrak.com'`
  - `lib/screens/learn/learn_screen.dart:451` — `'Lesson link copied to clipboard'`
  - `lib/screens/transactions/transactions_screen.dart:284` — `'CSV copied to clipboard...'`
  - `lib/widgets/settings/byok_keys_section.dart:974` — Dynamic provider/model string
  - `lib/widgets/settings/export_delete_section.dart:71` — Duplicate CSV message
- **Action:** Move user-facing strings to `assets/i18n/{en,ar}.json` and use `.tr()`.

---

## Verification Checklist

| Check | Status |
|-------|--------|
| `flutter analyze` | ✅ No issues |
| `flutter test` | ✅ 347/347 passing |
| i18n key parity (en vs ar) | ✅ 1056 keys identical |
| Git status clean | ✅ (on main @ 88ac7b0a) |
| Zakat logic in RPCs only | ✅ Verified — no local Nisab/2.5% math |
| Makefile Firebase grep unanchored | ✅ Verified — `grep 'FIREBASE_API_KEY'` not anchored |

---

## Recommended Fix Priority Order

1. **P0 #1** — SyncService crash (blocks pull-to-refresh entirely)
2. **P0 #2** — Firebase init crash (blocks app startup for some users)
3. **P0 #3** — Auth refresh cascade (blocks splash screen entry)
4. **P0 #4** — 504 retry coverage (affects multiple high-traffic RPCs)
5. **P0 #5** — SIGSEGV (native crash, needs symbol upload + lib audit)
6. **P2 #6** — Sync design gaps (data integrity)
7. **P2 #7** — Offline queue (feature gap)
8. **P2 #8** — SQLCipher conflict (security risk)
9. **P2 #9** — Transfer sheet crash (edge case)
10. **P2 #10** — Sentry version (observability)
11. **P3 #14** — Hardcoded strings (polish)

---

## Files to Investigate Further (Not Modified in This Pass)

- `lib/screens/splash_screen.dart` — Auth flow, refreshSession, profile fetch
- `lib/services/notification_service.dart` — onAuthStateChange listener
- `lib/services/sync_service.dart` — Full sync logic, merge operations
- `lib/services/finance_service.dart` — RPC retry coverage
- `lib/main.dart` — Firebase/Supabase/Sentry init order
- `lib/database/connection/native.dart` — SQLCipher pragma setup
- `pubspec.yaml` — Native library dependencies
- `mobile/fajrak_flutter/Makefile` — Build defines (DO NOT MODIFY per Rule #9)