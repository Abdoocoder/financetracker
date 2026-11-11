# Flutter DevEx Fix — 2026-11-09

**Fixed:** the wrong `google-services.json` path (and other false statements) in
`docs/DEPLOYMENT.md`, the wrong mobile `.env` template reference in the same file, and the
absence of a fast failure for missing release build inputs in
`mobile/fajrak_flutter/Makefile`.

**Origin:** the `make build-bundle` failure that ended with:

```
Execution failed for task ':app:processReleaseGoogleServices'.
> File google-services.json is missing.
BUILD FAILED in 12m 15s
```

The build was never broken. Three gitignored files were absent from this checkout, and the
first missing one is only detected after Gradle has compiled the app.

---

## Change 1 — `docs/DEPLOYMENT.md`

### 1a. Wrong path in the targets table (line 11)

`mobile/fajrak_flutter/google-services.json` does not exist and never has (empty
`git log --all` for that path). The Google Services Gradle plugin, applied at
`mobile/fajrak_flutter/android/app/build.gradle.kts:8`, defaults to
`android/app/google-services.json`. Anyone following the old table put the file one
directory too high and got the identical Gradle error. Line 11 now matches the
`Environment Setup → Mobile` table in the same file, `mobile/fajrak_flutter/firebase.json`
(`fileOutput`), and `docs/guides/getting-started.md:102`.

### 1b. Wrong `.env` template reference (pre-change line 93, now line 102)

The doc said the mobile env file is copied from the **root** `.env.example`. That template
is the web/server one: `NEXT_PUBLIC_*`, `BYOK_*`, `CRON_SECRET`. It carries only
`FIREBASE_API_KEY` and `FIREBASE_PROJECT_ID` (root `.env.example:86-87`), so it is missing
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` and `FIREBASE_MEASUREMENT_ID`. Building
from it ships a release with empty credentials — the failure `CHANGELOG.md` records under
`[3.42.2+57]`.

The authoritative template is `mobile/fajrak_flutter/.env.example`. `make setup` copies it
only when neither `.env` nor `.env.local` exists
(`Makefile:76-79`); otherwise the Makefile reads whichever is present
(`ENV_FILE = $(if $(wildcard .env),.env,.env.local)`, `Makefile:9`). The section now says
that.

### 1c. All three release inputs documented

"Also required" named only `google-services.json`. The section now lists all three
gitignored files with their source, and says that `build-apk` / `build-bundle` depend on
`check-secrets` — and what the late failure looks like for each input.

### 1d. Other false statements found while auditing the file

The spec asked whether other paths in the document were wrong. Three more were:

| Line (pre-change) | Claim | Reality | Action |
|---|---|---|---|
| 20 | "No GitHub Actions workflows are currently configured (`.github/workflows/` does not exist)" | Four workflows exist: `lint-test-build.yml`, `supabase-validate.yml`, `neon-preview-branch.yml`, `supabase-backup.yml` | Section rewritten as a table plus which steps remain manual |
| 160 | "PR preview DB from `supabase-preview.yml`" | File does not exist; the PR-branch workflow is `.github/workflows/neon-preview-branch.yml` | Reference corrected |
| 207 | Checklist item "`HANDOFF_REPORT.md` header updated" | File is not in this checkout and is not tracked by git | **Not changed** — `AGENTS.md` also routes to `HANDOFF_REPORT.md`, so this is a repo-wide absence, not a bad path in this doc |

---

## Change 2 — `mobile/fajrak_flutter/Makefile`

### New target `check-secrets`

Verifies the three gitignored inputs used by the release build:

```
android/app/google-services.json
android/key.properties
android/app/upload-keystore.jks
```

For each missing file it prints `❌ Missing release build input: <path>`, then a block naming
the source of all three and pointing at `docs/DEPLOYMENT.md` (Environment Setup → Mobile)
and `docs/guides/getting-started.md` (Android Setup). Exits non-zero, so make stops before
Flutter starts.

The keystore path is the repo's configured `storeFile` value: `android/key.properties` has
`storeFile=upload-keystore.jks`, which `android/app/build.gradle.kts:58` resolves relative to
`android/app`. A comment in the target says to update the list if that property changes. The
target only checks existence, not contents — an empty or malformed JSON still fails later in
Gradle, by design (the point is to remove the multi-minute wait, not to validate JSON).

### Wiring

```make
build-apk: check-secrets
build-bundle: check-secrets
```

Prerequisite only — the recipes are byte-for-byte unchanged (verified with
`make -f <old Makefile from HEAD> -n build-bundle` vs `make -n build-bundle`).
`check-secrets` is also in `.PHONY` (line 3) and in the `make help` Building section.

### Rule #9 respected

`SUPABASE_DEFINES`, `FIREBASE_DEFINES`, `DART_DEFINES` and `SENTRY_DEFINE` are untouched.
The `FIREBASE_*` greps stay unanchored so `.env` aliases like `FLUTTER_FIREBASE_API_KEY`
keep resolving. The full recipe printed by `make build-bundle` confirms this.

`build-web`, `run`, `run-web`, `run-web-with-proxy`, `run-device`, `test`, `analyze` and
`clean` do not depend on `check-secrets`; web builds and desktop runs are unaffected.

---

## Verification

All commands run from `mobile/fajrak_flutter/` unless noted.

| # | Command | Result |
|---|---------|--------|
| 1 | `make check-secrets` (all three files present) | `✅ Release build inputs present.` — exit 0 |
| 2 | `mv android/app/google-services.json …bak` then `make check-secrets` | `❌ Missing release build input: android/app/google-services.json` + restore block — `make: *** [Makefile:150: check-secrets] Error 1`, exit 2 |
| 3 | same rename, then `make build-bundle` | Same error, **elapsed 0s**, no `flutter build` or Gradle output. File restored afterwards; `ls` confirms 668 bytes. |
| 4 | `make build-bundle` after restore, full log | `✅ Release build inputs present.` at log line 1, `Running Gradle task 'bundleRelease'` at line 51, `✓ Built build/app/outputs/bundle/release/app-release.aab (86.4MB)` — exit 0 |
| 5 | `flutter analyze` | `No issues found! (ran in 12.3s)` |
| 6 | `flutter test` | `01:33 +347: All tests passed!` (347 tests) |
| 7 | `git status --porcelain` (repo root) | only `M docs/DEPLOYMENT.md`, `M mobile/fajrak_flutter/Makefile`, `M CHANGELOG.md` (+ this new doc). The three restored inputs stay ignored. |

Evidence that the preflight does not disturb credential injection — every `--dart-define`
is still present and the greps are still unanchored:

```
flutter build appbundle --release --dart-define=SUPABASE_URL=$(grep -m1 '^SUPABASE_URL=' .env.local …)
  --dart-define=FIREBASE_API_KEY=$(grep -m1 'FIREBASE_API_KEY' .env.local …) …
  --dart-define=API_BASE_URL=https://fajrak.com --dart-define=SENTRY_DSN=$(grep -m1 '^SENTRY_DSN=' .env.local …)
```

Not re-runnable from this document: the Gradle failure itself. It takes 12+ minutes and needs
the three inputs removed. The preflight rows above are the substitute, and are the reason
nobody needs to reproduce it again.

---

## Not changed (deliberately)

- **`docs/guides/getting-started.md:98`** — still says "The Flutter app reads the same `.env`
  file from the repo root … Do not create a separate `.env` inside `mobile/fajrak_flutter/`."
  That is the same false advice corrected at `DEPLOYMENT.md:102`, and it is contradicted by
  `Makefile:9` and the existence of `mobile/fajrak_flutter/.env.example`. It is a different
  file from the one this task scoped, so it is left for a follow-up one-line fix.
  `docs/guides/development.md:77` ("no `.env.example` exists") is wrong for the same reason.
- **`docs/DEPLOYMENT.md:233` references `HANDOFF_REPORT.md`**, which is absent and untracked.
  `AGENTS.md` uses the same pointer, so the fix belongs in a repo-wide decision about that
  file, not here.
- **`docs/DEPLOYMENT.md` post-release checklist** says the mobile README is "currently
  3.47.6+72". `pubspec.yaml` is `3.47.8+74`; `mobile/fajrak_flutter/README.md:5` is actually
  `3.45.0+64`, two releases behind. Stale checklist text, unrelated to this fix.
- **`lib/main.dart` / Firebase initialization** — Android still calls implicit
  `Firebase.initializeApp()` (`lib/main.dart:86`), which reads only `google-services.json`;
  the `FIREBASE_*` dart-defines are ignored on Android. That is P0 #2 in
  `docs/flutter-bug-report-2026-11-07.md` and needs on-device FCM testing, so it stays a
  separate change.
- **Kotlin Gradle Plugin / Built-in Kotlin warnings** and 43 outdated pub packages — build
  noise, not failures.

## Restoring the three inputs

They are gitignored and cannot be recovered from git history
(`git log --all -- mobile/fajrak_flutter/android/app/google-services.json` is empty). Copy
them from a working checkout of the same Firebase project (`fajrak-f7df1`, package
`com.fajrak.app`, app ID `1:621650342599:android:cb4b1204b40349c7b844e2`) or download
`google-services.json` from Firebase Console → Project Settings → Your Android App. Keep the
existing release keystore: Play Store uploads must be signed with the same certificate.
