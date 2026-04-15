# PRD: Bank-Level Biometric Auth & Security Hardening (Fajrak Mobile)

## Overview

Harden the existing biometric authentication implementation in the Fajrak Flutter app
to reach bank-level UX and security standards. All improvements target
`mobile/fajrak_flutter/` and build on top of the `local_auth` + `flutter_secure_storage`
foundation already in place.

---

## Requirements

### 1. Strong PIN Hashing (Security Fix — Critical)

**Problem:** Current implementation hashes PIN with plain SHA-256 (no salt), making it
vulnerable to rainbow-table and brute-force attacks.

**Solution:**
- Replace SHA-256 with PBKDF2 (100,000 iterations, SHA-256) or use the `pointycastle`
  package for key derivation.
- Generate a cryptographically random 16-byte salt per device using `dart:math`
  `SecureRandom` and store it in `flutter_secure_storage` alongside the hash.
- Migration path: on first launch after upgrade, if old hash exists and no salt exists,
  force the user to re-enter and re-set their PIN.
- File: `lib/services/secure_storage_service.dart` + `lib/services/auth_gate_service.dart`
- Package to add: `pointycastle: ^3.9.1` or `cryptography: ^2.7.0`

---

### 2. Biometric Auto-Trigger UX Fix

**Problem:** Biometric prompt fires immediately on cold launch before the splash/lock
screen has fully rendered, creating a jarring OS dialog pop-up with no app context.

**Solution:**
- Add a 300 ms post-frame delay before calling `authenticate()` on initial launch.
  Use `WidgetsBinding.instance.addPostFrameCallback` + `Future.delayed`.
- Show the lock screen UI first (icon + "Unlock Fajrak" text), then trigger biometric.
- On subsequent foreground resumes (app lifecycle), delay 150 ms only.
- File: `lib/screens/lock_screen.dart`

---

### 3. App Lifecycle Lock (Background → Foreground)

**Problem:** App does not re-lock when sent to background and resumed. Any person who
picks up the phone after the user switches apps can access financial data.

**Solution:**
- Create `lib/services/app_lifecycle_service.dart` implementing `WidgetsBindingObserver`.
- On `AppLifecycleState.paused` → record timestamp in memory (not storage).
- On `AppLifecycleState.resumed` → if elapsed > grace period (default 30 s), set app
  state back to locked and show `LockScreen`.
- Grace period configurable via `SecureStorageService` (`lock_grace_seconds` key).
- Register observer in `main.dart` `_AppState.initState`.
- File: `lib/services/app_lifecycle_service.dart`, `lib/main.dart`

---

### 4. Idle Timeout Lock

**Problem:** If the user leaves the app open on a transactions screen and walks away,
data is exposed indefinitely.

**Solution:**
- Create `lib/services/idle_timeout_service.dart` using a `Timer` that resets on any
  pointer/gesture event detected via a root `Listener` widget wrapping `MaterialApp`.
- Default idle timeout: 5 minutes (configurable: 1 min / 3 min / 5 min / Never).
- On timeout → lock app (same lock state as lifecycle lock).
- Persist user's chosen timeout in `SecureStorageService` (`idle_timeout_seconds` key).
- Add idle timeout option to `BiometricSettingsScreen`.
- Files: `lib/services/idle_timeout_service.dart`, `lib/main.dart`,
  `lib/screens/settings/biometric_settings_screen.dart`

---

### 5. Screenshot Protection (Complete)

**Problem:** Current note about `FlutterWindowManager` is incomplete — not wired up,
iOS not covered, and flag is not toggled on/off with app state.

**Solution:**
- Add `flutter_windowmanager: ^0.3.0` to `pubspec.yaml`.
- Android: call `FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE)` in
  `main()` before `runApp`.
- iOS: use `MethodChannel` or `local_auth`'s existing iOS plumbing; alternatively note
  that iOS 17+ handles this via `UIApplicationProtectedDataAvailable`. Add a native
  Swift snippet in `AppDelegate.swift` setting `window?.makeSecure()` via a custom
  extension.
- Allow user to toggle screenshot protection in settings (some users need it for support).
- Files: `android/app/src/main/kotlin/.../MainActivity.kt` or Flutter side,
  `ios/Runner/AppDelegate.swift`, `lib/screens/settings/biometric_settings_screen.dart`

---

### 6. Biometric Strength Enforcement

**Problem:** `local_auth` defaults to allowing device-PIN/pattern as a fallback from
within the OS biometric dialog, which bypasses the app's own PIN flow and rate limiting.

**Solution:**
- Set `biometricOnly: true` in `AuthenticationOptions` for the "unlock app" call.
- Keep `biometricOnly: false` only for the "enable biometrics" confirmation call in
  settings (to allow enrollment confirmation).
- Document the distinction in code comments.
- File: `lib/services/biometric_service.dart`

---

### 7. Device Binding

**Problem:** If a backup of `flutter_secure_storage` is restored to a different device
(Android backup, iCloud backup), the tokens and PIN hash move with it.

**Solution:**
- Generate a unique `device_id` using `device_info_plus` + a UUID stored in secure
  storage on first launch.
- Derive a device-specific encryption key using PBKDF2(device_id + install_time_salt).
- Store this key in secure storage; use it to wrap (encrypt) the Supabase tokens before
  persisting, and unwrap on read.
- On restore to new device: decryption fails → `clearAll()` → force full login.
- Add `device_info_plus: ^10.1.0` and `uuid: ^4.4.0` to `pubspec.yaml`.
- Files: `lib/services/device_binding_service.dart` (new),
  `lib/services/secure_storage_service.dart`

---

### 8. Quick Balance View (Locked-State Widget)

**Problem:** Users want a fast glance at their account balance without fully unlocking
the app — common in banking apps (e.g., Revolut, Monzo).

**Solution:**
- Add a toggle in settings: "Show balance on lock screen" (default: off).
- When enabled: fetch and cache the total balance (assets − liabilities) in
  `flutter_secure_storage` after each successful unlock.
- On the `LockScreen`, show a blurred/masked balance card above the biometric button.
  Tapping the card reveals the exact figure (un-blurs) for 3 seconds then re-blurs.
- Balance is never fetched fresh from Supabase while locked (uses last-known cache).
- Files: `lib/screens/lock_screen.dart`,
  `lib/services/balance_cache_service.dart` (new),
  `lib/screens/settings/biometric_settings_screen.dart`

---

### 9. PIN Rate Limiting & Lockout

**Problem:** No rate limiting on PIN attempts allows unlimited brute-force guessing of
a 6-digit PIN (10^6 = 1,000,000 combinations, trivially automatable).

**Solution:**
- Track failed PIN attempts count + first-failure timestamp in `flutter_secure_storage`.
- Policy:
  - 3 failed attempts → 30-second cooldown (show countdown timer in UI).
  - 5 failed attempts → 5-minute cooldown.
  - 10 failed attempts → wipe session + force full Supabase login (data not wiped).
- On successful PIN entry → reset counters.
- Show remaining attempts ("2 attempts remaining before cooldown") in the PIN UI.
- Files: `lib/services/pin_rate_limiter.dart` (new),
  `lib/screens/lock_screen.dart`

---

## Out of Scope

- Server-side device registration / binding verification (future).
- Wearable / Watch unlock.
- Passkey (FIDO2) support.

## Acceptance Criteria (All Tasks)

- `make doctor` passes (flutter analyze zero issues, all tests green).
- No new `dynamic` or `Object` types introduced without justification.
- Every new screen/widget has a corresponding widget test.
- All user-visible strings are added to `assets/i18n/ar.json` and `assets/i18n/en.json`.
- All new `TextEditingController` instances are disposed in `dispose()`.
- All new `ModalBottomSheet` calls include `useSafeArea: true`.
