# Flutter Fix Phase 3 — 2026-11-07

**Fixed:** 5 P2/P3 bugs from `docs/flutter-bug-report-2026-11-07.md`

---

## Summary of Changes

### Fix 1: Transfer Sheet Crash (P2 #9)
**File:** `lib/screens/accounts/accounts_screen.dart`

**Problem:** `RangeError` (accessing `widget.accounts[1]`) and `StateError` (no `orElse` in `firstWhere`) when user has only 1 account.

**Fix:**
- Added validation in `_TransferSheet.initState()`: if `accounts.length < 2`, set `_toId = _fromId`
- Added `orElse` fallback in the "To" dropdown: `(avail.isNotEmpty ? avail.first['id'] as String : _fromId)`
- Disabled the "To" dropdown when only 1 account: `onChanged: avail.isNotEmpty ? ... : null`
- Added early return in `_save()` showing localized snackbar: `accounts_need_two_to_transfer.tr()`

**I18n Keys Added:**
- `accounts_need_two_to_transfer` (EN: "You need at least 2 accounts to transfer between them", AR: "تحتاج إلى حسابين على الأقل للتحويل بينهما")

---

### Fix 2: Sync Design Gaps (P2 #6)
**File:** `lib/services/sync_service.dart`

**Problem A (Missing Tables):** `_fetchDeletedRecords` only covered 4 of 6 entity types.

**Fix A:** Added `'accounts'` and `'recurring_transactions'` to the tables array.

**Problem B (Multi-currency Data Loss):** UPDATE branch in `_mergeTransaction` and `_mergeDebt` omitted multi-currency/transfer fields.

**Fix B:** Added missing fields to UPDATE branches:
- `_mergeTransaction`: `originalAmount`, `originalCurrency`, `exchangeRate`, `transferToAccountId`, `transferPairId`, `sourceRecurringId`, `recurringDay`
- `_mergeDebt`: `originalAmountForeign`, `remainingAmountForeign`, `currency`

**Problem C (Table Name Mismatch):** `_pushOperation` used `entityType` directly as table name.

**Fix C:** Added `_tableNameForEntityType()` helper mapping:
- `transaction` → `transactions`
- `debt` → `debts`
- `goal` → `savings_goals`
- `account` → `accounts`
- `budget` → `budgets`
- `recurring` → `recurring_transactions`

**Problem D (Missing Delete Handlers):** `_applyDelete` didn't handle `accounts` and `recurring_transactions`.

**Fix D:** Added delete cases for both tables.

---

### Fix 3: Feed the Offline Queue (P2 #7)
**Files:** 
- `lib/widgets/transactions/add_transaction_dialog.dart`
- `lib/main.dart` (connectivity listener)

**Problem:** Offline queue methods (`enqueueCreate/Update/Delete`) existed but were never called.

**Fix A (Transaction Dialog):** Modified `_save()` to:
1. Check connectivity via `Connectivity().checkConnectivity()`
2. If online: attempt Supabase operation; on network error, fall back to offline queue
3. If offline: directly queue via `TransactionRepository.enqueueCreate/Update`
4. Show localized toast: `toast_offline_queued` or `toast_offline_unavailable`

**Fix B (Connectivity Listener):** Added `Connectivity().onConnectivityChanged` listener in `MyApp.initState()` that triggers `SyncService.fullSync()` when network is restored and sync is initialized.

**I18n Keys Added:**
- `toast_offline_queued` (EN: "Saved offline — will sync when online", AR: "تم الحفظ دون اتصال — سيتم المزامنة عند الاتصال")
- `toast_offline_unavailable` (EN: "Offline mode unavailable — please check connection", AR: "الوضع غير المتصل غير متاح — يرجى التحقق من الاتصال")

---

### Fix 4: Sentry Fallback Version (P2 #10)
**File:** `lib/services/sentry_service.dart:27`

**Problem:** Fallback release version was stale (`3.45.0+64` vs actual `3.47.7+73`).

**Fix:** Updated `_fallbackRelease` to `'com.fajrak.app@3.47.7+73'`.

---

### Fix 5: Hardcoded Strings (P3 #14)
**Files:**
- `lib/screens/learn/learn_screen.dart` (3 strings)
- `lib/screens/transactions/transactions_screen.dart` (1 string)
- `lib/widgets/settings/export_delete_section.dart` (1 string)

**Problem:** User-facing strings hardcoded instead of using i18n.

**Fix:** Moved all to `assets/i18n/{en,ar}.json` with `.tr()` calls:
- `"فجرك"` → `'learn_app_name'.tr()`
- `"fajrak.com"` → `'learn_app_url'.tr()`
- `"Lesson link copied to clipboard"` → `'learn_link_copied'.tr()`
- `"CSV copied to clipboard — paste into a .csv file"` → `'transactions_csv_copied'.tr()`
- Duplicate in export_delete_section → uses same key

**I18n Keys Added (6 new keys):**
| Key | English | Arabic |
|-----|---------|--------|
| `learn_app_name` | Fajrak | فجرك |
| `learn_app_url` | fajrak.com | fajrak.com |
| `learn_link_copied` | Lesson link copied to clipboard | تم نسخ رابط الدرس إلى الحافظة |
| `transactions_csv_copied` | CSV copied to clipboard — paste into a .csv file | تم نسخ CSV إلى الحافظة — الصقه في ملف .csv |
| `toast_offline_queued` | Saved offline — will sync when online | تم الحفظ دون اتصال — سيتم المزامنة عند الاتصال |
| `toast_offline_unavailable` | Offline mode unavailable — please check connection | الوضع غير المتصل غير متاح — يرجى التحقق من الاتصال |
| `accounts_need_two_to_transfer` | You need at least 2 accounts to transfer between them | تحتاج إلى حسابين على الأقل للتحويل بينهما |

---

## Verification

| Check | Result |
|-------|--------|
| `flutter analyze` | ✅ No issues |
| `flutter test` | ✅ 347/347 passing |
| i18n parity (en/ar) | ✅ 1063 keys identical |
| Makefile Firebase grep | ✅ Unchanged (Rule #9 respected) |
| Zakat logic in RPCs only | ✅ Unchanged |
| Phase 1/2 fixes preserved | ✅ Verified |

---

## Files Modified (12)

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `lib/screens/accounts/accounts_screen.dart` | ~20 | Transfer validation & dropdown fix |
| `lib/services/sync_service.dart` | ~60 | Sync design gaps (4 sub-fixes) |
| `lib/widgets/transactions/add_transaction_dialog.dart` | ~80 | Offline queue support |
| `lib/main.dart` | ~30 | Connectivity listener |
| `lib/services/sentry_service.dart` | 1 | Version bump |
| `lib/screens/learn/learn_screen.dart` | 5 | Hardcoded strings → i18n |
| `lib/screens/transactions/transactions_screen.dart` | 3 | CSV toast → i18n |
| `lib/widgets/settings/export_delete_section.dart` | 3 | CSV toast → i18n |
| `assets/i18n/en.json` | +7 keys | New translations |
| `assets/i18n/ar.json` | +7 keys | New translations |
| `pubspec.lock` | auto | Lock file update |
| `.gitignore` | auto | (pre-existing) |

---

## Complete P0/P1/P2 Status

| Bug | ID | Phase | Status |
|-----|----|-------|--------|
| SyncService crash on pull-to-refresh | FAJRAK-MOBILE-R | Phase 1 | ✅ Fixed |
| Firebase init crash on Android | FAJRAK-MOBILE-D | Phase 1 | ✅ Fixed |
| Auth refresh token cascade | FAJRAK-MOBILE-8/J/N | Phase 1 | ✅ Fixed |
| 504 Gateway Timeouts on unprotected RPCs | FAJRAK-MOBILE-F/E/Q/P | Phase 2 | ✅ Fixed |
| SIGSEGV native crash + unencrypted DB risk | FAJRAK-MOBILE-2 | Phase 2 | ✅ Fixed |
| **Transfer sheet RangeError** | — | **Phase 3** | **✅ Fixed** |
| **Sync design gaps (data loss)** | — | **Phase 3** | **✅ Fixed** |
| **Offline queue never fed** | — | **Phase 3** | **✅ Fixed** |
| **Sentry fallback version stale** | — | **Phase 3** | **✅ Fixed** |
| **Hardcoded strings missing i18n** | — | **Phase 3** | **✅ Fixed** |

---

## Remaining Issues (P3)

| Issue | Priority | Notes |
|-------|----------|-------|
| DNS/network noise | P3 | FAJRAK-MOBILE-S/T (transient) |
| Test account noise | P3 | FAJRAK-MOBILE-V (invalid email) |
| ByokChatException unauthorized | P3 | FAJRAK-MOBILE-K (user config) |

All critical and high-priority bugs from the original bug report are now fixed.