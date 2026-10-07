# BYOK Save Crash Investigation

> Review date: 2026-09-16 · Mode: **MINIMAL SCOPE** · Implementation approach: **NO PATCH**

> Focus: `mobile/fajrak_flutter/lib/widgets/settings/byok_keys_section.dart` (`_handleSave` L180–284) + pinned Supabase libs (postgrest-2.9.1, supabase_flutter-2.18.0, gotrue-2.27.2, supabase-2.16.2)

> Verdict: **NO_PATCH** — root cause unproven by static analysis; no provably-throwing `!` frame present on the crash stack.

## Symptom

1. Reproduction described in the DEBUG REPORT: crash when saving a BYOK API key via the settings screen.
2. Native app reproduction only — web hypothesis eliminated.
3. No regression introduced; `flutter analyze` reports "No issues found!" (exit 0).

## Static sweep findings

1. **App `!` sites near the save path** — only two, both safe:
   - `mobile/fajrak_flutter/lib/services/byok/key_save_error.dart` L58 (`match.group(0)!`) — guarded by a `Match` null-check.
   - `mobile/fajrak_flutter/lib/widgets/settings/byok_keys_section.dart` L216 (`throw res.error!`) — inside a guarded rollback branch; not on the success path.
2. **Pinned-lib `!` sites swept** — none reference auth/session state on the `_handleSave` stack:
   - postgrest-2.9.1 `postgrest_builder.dart` L462, L552, L591, L680–681.
   - supabase_flutter-2.18.0 `supabase_auth.dart` L90, `supabase.dart` L111, `hot_restart_cleanup_web.dart` L38.
   - gotrue-2.27.2 `gotrue_client.dart` L452.
   - supabase-2.16.2 `supabase_client.dart` L201.
3. **App-wide sweep** — zero `.session!` / `.accessToken!` / `.refreshToken!` in `lib/`.
4. **Correlation only** — 12 `Supabase.instance.client.auth.currentUser!` sites exist app-wide, but none appear on the `_handleSave` stack.

## Root cause

1. **Unproven.** Static analysis found no provably-throwing forced-unwrap frame on the crash stack.
2. Possible leads for a runtime investigation (not pursued under MINIMAL SCOPE): the session null-guard path in `_handleSave` (L189–192) and the guarded `res.error!` rollback at L216.

## Actions taken

1. No code patch — no directive-sanctioned defensive fix against an unproven root cause.
2. Full static sweep of the byok save path, pinned package sources, and app-wide `!`/session access.
3. `flutter analyze` → "No issues found!" (exit 0); no regression.
4. DEBUG REPORT delivered with root cause marked "unproven".

## Coverage note

1. `coverage/coverage-final.json` is empty (0/0 lines).
2. Coverage check reports 0.0% — below the 80% target.
3. Threshold check cannot identify low-coverage files from an empty report.