# Flutter Fix Phase 1 — 2026-11-07

**Fixed:** 3 P0 critical bugs from `docs/flutter-bug-report-2026-11-07.md`

---

## Summary of Changes

### Fix 1: Firebase Initialization Crash on Android (P0 #2)
**File:** `lib/main.dart:82-95`

**Problem:** `await Firebase.initializeApp()` without options crashed on Android when `google-services.json` was missing or didn't generate `values.xml` (3 users affected, `FAJRAK-MOBILE-D`).

**Fix:** Wrapped in try-catch; on failure, logs error via `debugPrint` and captures in Sentry, but **continues booting**. App functions without FCM push notifications.

---

### Fix 2: Auth Refresh Token Cascade (P0 #3)
**Files:** 
- `lib/screens/splash_screen.dart` — removed explicit `refreshSession()` calls
- `lib/services/notification_service.dart:118-131` — debounced `onAuthStateChange` listener

**Problem:** Three concurrent refresh triggers on boot:
1. GoTrue auto-refresh (configured in main.dart)
2. `NotificationService.onAuthStateChange` firing un-awaited `saveToken()`
3. Splash screen explicit `refreshSession()` calls
→ "refresh_token_already_used" → 401 on profile fetch → stuck on splash (`FAJRAK-MOBILE-8/J/N`, same user).

**Fix A (Splash):** Removed all `refreshSession()` calls. Relies on GoTrue auto-refresh. Added graceful retry on 401/42501/refresh_token_already_used with 1s delay.

**Fix B (NotificationService):** Changed listener to `async`, awaits `saveToken()`, debounces with `lastSavedToken` guard using cached FCM token from `onRegistered` stream. No more concurrent calls.

---

### Fix 3: SyncService Crash on Pull-to-Refresh (P0 #1)
**Files:**
- `lib/services/sync_service.dart` — added `initializeForUser()`, `isInitialized`, encryption key derivation
- `lib/screens/splash_screen.dart` — calls `SyncService.initializeForUser(user.id)` after auth
- `lib/screens/transactions/transactions_screen.dart:92-100` — guards `_triggerSync()` with `SyncService.isInitialized`
- `lib/widgets/settings/export_delete_section.dart` — disposes DB on logout/account delete

**Problem:** `SyncService.initialize()` was **never called** (only a stale comment in main.dart). Pull-to-refresh called `fullSync()` → `localDb` getter hit assertion failure (`FAJRAK-MOBILE-R`).

**Fix:**
- Added `_deriveEncryptionKey(userId)` using SHA-256 with app salt → stable per-user encryption key
- Added `SyncService.initializeForUser(userId)` — idempotent, initializes both `AppDatabase` and `SyncService`
- Called from `SplashScreen._checkUser()` after user confirmed
- Added `SyncService.isInitialized` guard in `_triggerSync()` — logs and skips if not ready
- Added `AppDatabase.disposeInstance()` + `SyncService.resetSyncState()` on logout/account delete

---

### Additional
- **pubspec.yaml:** Added `crypto: ^3.0.3` for SHA-256 key derivation

---

## Verification

| Check | Result |
|-------|--------|
| `flutter analyze` | ✅ No issues |
| `flutter test` | ✅ 347/347 passing |
| i18n parity (en/ar) | ✅ 1056 keys identical |
| Makefile Firebase grep | ✅ Unchanged (Rule #9 respected) |
| Zakat logic in RPCs only | ✅ Unchanged |
| No hardcoded strings added | ✅ Verified |

---

## Files Modified (10)

| File | Lines | Purpose |
|------|-------|---------|
| `lib/main.dart` | +13 | Firebase init try-catch |
| `lib/screens/splash_screen.dart` | +52 | Auth flow fix + SyncService init |
| `lib/screens/transactions/transactions_screen.dart` | +6 | Sync guard in pull-to-refresh |
| `lib/services/notification_service.dart` | +7 | Debounced auth state listener |
| `lib/services/sync_service.dart` | +24 | `initializeForUser`, key derivation, `isInitialized` |
| `lib/widgets/settings/export_delete_section.dart` | +6 | DB dispose on logout/delete |
| `pubspec.yaml` | +1 | crypto dependency |
| `pubspec.lock` | +2 | Lock file update |
| `.gitignore` | +1 | (pre-existing) |

---

## Remaining P0/P1 from Bug Report (Not Fixed in Phase 1)

| Issue | ID | Priority |
|-------|----|----------|
| 504 Gateway Timeouts on unprotected RPCs | FAJRAK-MOBILE-F/E/Q/P | P0 #4 |
| SIGSEGV native crash | FAJRAK-MOBILE-2 | P0 #5 |
| Sync design gaps (missing tables, multi-currency loss) | — | P2 #6 |
| Offline queue never fed | — | P2 #7 |
| SQLCipher + sqlite3 conflict | — | P2 #8 |
| Transfer sheet RangeError | — | P2 #9 |
| Sentry fallback version stale | — | P2 #10 |

Phase 2 should address the 504 retry coverage and native crash investigation.