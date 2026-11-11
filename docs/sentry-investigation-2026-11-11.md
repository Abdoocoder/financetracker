# Sentry Investigation Report — 2026-11-11

## Executive Summary

Investigated two regressed Sentry issues for the Fajrak Flutter app:

| Issue | Status | Resolution |
|-------|--------|------------|
| **FAJRAK-MOBILE-S** — `OSError: Software caused connection abort, errno = 103` in `notification_service.dart:235` | **Fixed** — Applied defensive network error handling | Added specific `try-catch` for `SocketException`, `PostgrestException`, and wrapped network errors; logs locally via `debugPrint`, returns silently (no Sentry noise) |
| **FAJRAK-MOBILE-2** — `SIGSEGV` native crash on OnePlus8Pro (emulator-like stats) | **Confirmed Fixed** — `sqlite3_flutter_libs` removed in v3.47.8+74 | The dependency was removed in commit `3142ac4f` (2026-11-07), replaced with `sqlcipher_flutter_libs` only |

---

## Issue 1: FAJRAK-MOBILE-S — Network Error in `saveToken`

### Sentry Details
- **Error**: `OSError: Software caused connection abort, errno = 103`
- **Location**: `notification_service.dart:235` (inside `saveToken` method)
- **Device**: Infinix X6858, Android 16, VPN active
- **Release**: `com.fajrak.app@3.47.7+73` (older than current `3.47.8+74`)
- **Stacktrace**:
  ```
  NotificationService.saveToken (notification_service.dart:235)
  PostgrestBuilder.then (postgrest_builder.dart:694)
  IOClient.send (io_client.dart:227)
  ```

### Root Cause
The `saveToken` method performs a Supabase upsert to `push_subscriptions` table. When the network drops (e.g., VPN disconnect on Android 16), a `SocketException` (errno 103 = `ECONNABORTED`) is thrown. Previously, this was caught by a generic `catch (e, st)` block that passed it to `ErrorHandler.handle()`, which sends errors to Sentry. Since this is a **background sync that retries on the next auth state change** (`signedIn`/`tokenRefreshed`), these transient network errors should **not** clutter Sentry.

### Fix Applied
Modified `lib/services/notification_service.dart` — `saveToken` method (lines 251–300):

1. **Added `import 'dart:io';`** for `SocketException`
2. **Added specific catch blocks** in order:
   - `on SocketException` — catches raw Dart socket errors (VPN disconnect, errno 103)
   - `on PostgrestException` — catches Supabase PostgREST errors; inspects message for network-related keywords
   - `catch (e, st)` — generic fallback; also inspects error message for network keywords (`socketexception`, `connection abort`, `connection refused`, `connection reset`, `network is unreachable`, `failed host lookup`, `no address associated`, `timeout`, `clientexception`)
3. **Behavior for network errors**: Log locally via `debugPrint` (only in debug mode), return silently — **no Sentry reporting**
4. **Behavior for non-network errors** (RLS policy, schema issues, etc.): Report via `ErrorHandler.handle()` → Sentry

### Code Change Summary
```dart
try {
  await Supabase.instance.client.from('push_subscriptions').upsert(...);
} on SocketException catch (e) {
  // Network interruption — log locally, retry on next auth change
  if (kDebugMode) debugPrint('[NotificationService] Network error saving FCM token (will retry): $e');
  return;
} on PostgrestException catch (e) {
  if (_isNetworkError(e.toString())) {
    if (kDebugMode) debugPrint('[NotificationService] Network error (Postgrest) saving FCM token (will retry): $e');
    return;
  }
  ErrorHandler.handle(e, developerMessage: '...');
} catch (e, st) {
  if (_isNetworkError(e.toString())) {
    if (kDebugMode) debugPrint('[NotificationService] Network error (wrapped) saving FCM token (will retry): $e');
    return;
  }
  ErrorHandler.handle(e, st: st, developerMessage: '...');
}
```

---

## Issue 2: FAJRAK-MOBILE-2 — SIGSEGV Native Crash

### Sentry Details
- **Error**: `SIGSEGV: Segfault` (native crash)
- **Device**: OnePlus8Pro with emulator-like stats (288×448 screen, 106 dpi)
- **OS**: Android 11
- **Release**: `com.fajrak.app@3.47.2+68` (older than current `3.47.8+74`)
- **Occurs**: Right after login

### Root Cause
The `sqlite3_flutter_libs` package (v0.6.0+eol) was conflicting with `sqlcipher_flutter_libs` (v0.7.0+eol), both providing native SQLite implementations. This caused a native crash (SIGSEGV) during database initialization after login.

### Fix Confirmed
The fix was already applied in **commit `3142ac4f`** (2026-11-07, "fix(mobile): resolve all P0-P3 bugs (offline sync, SQLCipher, auth, i18n)"):
- **Removed**: `sqlite3_flutter_libs: ^0.6.0+eol`
- **Kept**: `sqlcipher_flutter_libs: ^0.7.0+eol` (only SQLCipher-backed SQLite)

This aligns with the Drift + SQLCipher architecture and eliminates the duplicate native library conflict.

### Current `pubspec.yaml` (verified)
```yaml
dependencies:
  # Local Database (Drift/SQLCipher)
  drift: ^2.18.0
  sqlcipher_flutter_libs: ^0.7.0+eol
  # sqlite3_flutter_libs REMOVED ✓
```

---

## Verification

### Static Analysis
```bash
$ cd mobile/fajrak_flutter && flutter analyze
Analyzing fajrak_flutter...
No issues found!
```

### Unit Tests
```bash
$ cd mobile/fajrak_flutter && flutter test
00:30 +347: All tests passed!
```
All **347 tests pass** (same count as before the fix).

### Regression Checks
- ✅ Phase 1-3 fixes intact (SQLCipher, Auth, offline sync)
- ✅ Zakat logic untouched (per hard rules)
- ✅ Makefile unchanged (per Rule #9)
- ✅ No PII sent to Sentry (network errors filtered locally)

---

## Files Modified

| File | Change |
|------|--------|
| `mobile/fajrak_flutter/lib/services/notification_service.dart` | Added defensive network error handling in `saveToken` method (lines 251–300) |

---

## Recommendation

Monitor Sentry for the next release (`3.47.8+74` or later) to confirm:
1. **FAJRAK-MOBILE-S** — No new occurrences (or only non-network errors reaching Sentry)
2. **FAJRAK-MOBILE-2** — No new SIGSEGV crashes on any device

The defensive fix ensures that transient network interruptions (VPN, mobile handoff, errno 103) during background FCM token sync are handled gracefully without polluting Sentry, while genuine errors (RLS, schema) still surface for investigation.

---

## Update — 2026-11-11T08:01Z (post-release monitoring result)

The monitoring above was carried out against the live Sentry project (`abdoocoder-m2`, org-level
search on 2026-11-11). Result: **the `-2` verdict did not hold on build 74.**

| Issue | Verdict at the time | What Sentry shows on 2026-11-11 |
|---|---|---|
| **FAJRAK-MOBILE-S** | Fixed | **Holds** — last event 2026-11-08T17:53:58Z (`3.47.7+73`); no new occurrences after the release |
| **FAJRAK-MOBILE-2** | Confirmed fixed | **Did not hold** — status `regressed`, new **fatal** SIGSEGV at **2026-11-11T08:01:06Z** on `com.fajrak.app@3.47.8+74` (dist 74), OnePlus8Pro / Android 11, installed from Play (`com.android.vending`). 5 occurrences / 4 users total |
| **FAJRAK-MOBILE-W** | — | **New** — `_Exception: Failed to generate alerts: 402` in `alerts_screen.dart` → `_AlertsScreenState._generateAlerts`, 2026-11-11T08:00:44Z, `3.47.8+74`, same device |
| **FAJRAK-MOBILE-X** | — | **New** — `PostgrestException code: 504 (Gateway Timeout)` in `postgrest_builder.dart`, 2026-11-11T07:55:59Z, `3.47.8+74`, same device |

Reading:

- The `sqlite3_flutter_libs` removal (commit `3142ac4f`) is still the correct change and removed one
  known cause of the native crash, but it did **not** eliminate SIGSEGV on build 74. One device
  (OnePlus8Pro / Android 11, `device.class=low`, emulator-like stats) still produces a fatal crash
  4 days after the release. Treat this as an **open P0** until a build with a native stack trace
  symbolication confirms the remaining crash site.
- The three 2026-11-11 events all come from the same device/OS within six minutes of each other,
  which is consistent with one tester session on build 74 rather than a fleet-wide regression — but
  it is the *current* build, so it cannot be dismissed as stale.
- `-W` (402) and `-X` (504) are new signatures not covered by this investigation. The 402 is an
  alerts-generation failure surfaced to the user; the 504 is a PostgREST gateway timeout. Neither
  is the network-abort class that `-S` fixed, so the `notification_service.dart` change is not
  expected to suppress them.

Do not restate the "Confirmed Fixed" verdict for `-2` without re-checking Sentry; `PROJECT_CONTEXT.md`
§4 carries the current status.