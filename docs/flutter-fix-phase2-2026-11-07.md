# Flutter Fix Phase 2 — 2026-11-07

**Fixed:** 2 remaining P0 critical bugs from `docs/flutter-bug-report-2026-11-07.md`

---

## Summary of Changes

### Fix 1: RPC 504 Retry Coverage (P0 #4)
**File:** `lib/services/finance_service.dart`

**Problem:** 3 of 5 RPC methods lacked retry logic — `fetchMonthlyFinancialSummary`, `fetchZakatSummary`, and `fetchZakatHauls` called Supabase directly without exponential backoff. Only `fetchFinancialDashboard` and `syncZakatHaulState` used the `_rpcWithRetry` wrapper.

**Fix:** Wrapped all three unprotected RPCs inside the existing `_rpcWithRetry` helper (max 2 retries, 500ms/1s/2s exponential backoff, catches 504/gateway timeout/socket exception/timeout).

| Method | Before | After |
|--------|--------|-------|
| `fetchMonthlyFinancialSummary` | Direct `_db.rpc()` | `_rpcWithRetry` |
| `fetchZakatSummary` | Direct `_db.rpc()` | `_rpcWithRetry` |
| `fetchZakatHauls` | Direct `_db.rpc()` | `_rpcWithRetry` |

---

### Fix 2: SQLite/SQLCipher Conflict (P0 #5)
**Files:** 
- `pubspec.yaml` — removed conflicting dependency
- `lib/database/connection/native.dart` — added runtime encryption verification

**Problem:** Both `sqlite3_flutter_libs: ^0.6.0+eol` and `sqlcipher_flutter_libs: ^0.7.0+eol` were bundled. This caused:
- Native crashes (SIGSEGV, `FAJRAK-MOBILE-2`, 3 occurrences on x86_64 Android 11)
- Risk of plain SQLite loading first, making `PRAGMA key` a silent no-op → unencrypted database

**Fix A (pubspec.yaml):** Removed `sqlite3_flutter_libs` entirely. SQLCipher bundles its own SQLite; keeping both causes symbol conflicts and load-order issues.

**Fix B (native.dart):** Added runtime assertion in the database `setup` callback to verify encryption is active:
```dart
final result = rawDb.select('PRAGMA cipher_version;');
if (result.isEmpty) {
  throw Exception('CRITICAL: SQLCipher is not active. Database is unencrypted!');
}
```
This fails fast at startup if SQLCipher isn't properly loaded, rather than silently storing unencrypted data.

---

## Verification

| Check | Result |
|-------|--------|
| `flutter analyze` | ✅ No issues |
| `flutter test` | ✅ 347/347 passing |
| i18n parity (en/ar) | ✅ Unchanged (1056 keys identical) |
| Makefile Firebase grep | ✅ Unchanged (Rule #9 respected) |
| Zakat logic in RPCs only | ✅ Unchanged |
| No hardcoded strings added | ✅ Verified |

---

## Files Modified (3)

| File | Lines | Purpose |
|------|-------|---------|
| `lib/services/finance_service.dart` | ~12 | Wrap 3 RPCs with retry |
| `lib/database/connection/native.dart` | +7 | Runtime SQLCipher verification |
| `pubspec.yaml` | -1 | Remove `sqlite3_flutter_libs` |
| `pubspec.lock` | auto | Lock file update |

---

## Complete P0 Status (All Fixed)

| P0 Bug | Issue ID | Phase | Status |
|--------|----------|-------|--------|
| SyncService crash on pull-to-refresh | FAJRAK-MOBILE-R | Phase 1 | ✅ Fixed |
| Firebase init crash on Android | FAJRAK-MOBILE-D | Phase 1 | ✅ Fixed |
| Auth refresh token cascade | FAJRAK-MOBILE-8/J/N | Phase 1 | ✅ Fixed |
| **504 Gateway Timeouts on unprotected RPCs** | FAJRAK-MOBILE-F/E/Q/P | **Phase 2** | **✅ Fixed** |
| **SIGSEGV native crash + unencrypted DB risk** | FAJRAK-MOBILE-2 | **Phase 2** | **✅ Fixed** |

---

## Remaining Issues (P2/P3 from Bug Report)

| Issue | Priority | Notes |
|-------|----------|-------|
| Sync design gaps (missing tables, multi-currency loss) | P2 | 6 entity types vs 4 in sync |
| Offline queue never fed | P2 | `enqueueCreate/Update/Delete` not called |
| Transfer sheet RangeError/StateError | P2 | Single-account edge case |
| Sentry fallback version stale | P2 | 3.45.0 vs 3.47.7 |
| DNS/network noise | P3 | FAJRAK-MOBILE-S/T |
| Test account noise | P3 | FAJRAK-MOBILE-V |
| ByokChatException unauthorized | P3 | FAJRAK-MOBILE-K (user config) |
| Hardcoded strings missing i18n | P3 | ~6 occurrences |