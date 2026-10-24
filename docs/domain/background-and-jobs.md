# Domain: Background and Jobs (Push, Crons, Offline Sync, Gamification)

> Layer 2 deep dive. Entry points: `AGENTS.md` → `PROJECT_CONTEXT.md` → this file.
> Last verified 2026-10-24.

## 1. Push pipeline

One entry point, one queue table, one delivery function:

1. Any producer (cron route, DB trigger, AI generator, achievement award) calls
   `sendPushToUser()` in `lib/push-send.ts`. It **never sends**: it maps the tag to a
   category (`TAG_TO_CATEGORY`), pre-checks `notification_preferences`
   (`enabled`, quiet hours in the **user's** timezone, default `Asia/Amman`),
   requires at least one row in `push_subscriptions`, checks the daily
   `fingerprint` dedupe, and inserts into `notification_history`
   (fingerprint unique index rejects races as `23505`, treated as success).
2. A DB webhook fires the Supabase Edge Function
   `supabase/functions/push-notification/index.ts` on `INSERT` into
   `notification_history` (it rejects any other table or operation).
3. The function re-checks `notification_preferences` (defense in depth): disabled
   category or active quiet window → `200 {skipped}`; `mask_sensitive_data` →
   digits in the body become `***`.
4. Delivery: subscriptions whose `endpoint` starts with `fcm:` go to **FCM v1**
   (OAuth JWT minted from `FIREBASE_SERVICE_ACCOUNT_KEY`); the rest go to
   **Web Push** via `web-push` + VAPID keys. Payload carries `title`, `message`,
   `url`, `tag`, and `badgeCount` (unread `alerts` + 1).
5. Stale tokens (`UNREGISTERED`/`INVALID_ARGUMENT` on FCM, `410`/`404` on Web Push)
   are deleted from `push_subscriptions`.
6. **The Edge Function writes the `alerts` row BEFORE quiet-hours and
   subscription checks** (since A.2b, commit 9214c2ef). The insert happens at
   line 116-135 of `supabase/functions/push-notification/index.ts`. If the
   insert succeeds (or hits the fingerprint unique index `23505`), the function
   proceeds to delivery but returns `alert_written: true` regardless of push
   outcome. The `type` is derived from `TAG_TO_ALERT_TYPE` (extended in
   `push-notification/index.ts:21-32` to include `SystemUpdate`, `debt-reminder`,
   `debt-paid`, `debt-auto`, `weekly`).
7. Stale tokens (`UNREGISTERED`/`INVALID_ARGUMENT` on FCM, `410`/`404` on Web Push)
   are deleted from `push_subscriptions`.
8. **Fingerprint self-heal (F22, v15):** if the webhook payload omits
   `fingerprint` (custom Dashboard template), the function queries
   `notification_history` by `historyId` to recover it (lines 85-94).

Golden rule 7: **any new notification path must go through `sendPushToUser`** so
quiet hours, masking, dedupe, and `alerts` display are honored exactly once.
**Distinction:** "delivery" (push, may fail or be skipped) vs "data record"
(alerts row, always written for eligible categories).

## 2. Crons

All schedules are **UTC** (Amman is UTC+3; the workflow comments show local time).

| Where | Schedule (UTC) | Target |
|---|---|---|
| `vercel.json` | `0 3 * * *` | `/api/auto-debt` |
| `vercel.json` | `0 3 * * *` | `/api/auto-recurring` |
| `vercel.json` | `0 4 * * *` | `/api/budget-alerts` |
| `vercel.json` | `0 8 * * *` | `/api/zakat-autopilot` |
| `.github/workflows/smart-notifications.yml` | `0 3,5,6,7,9,15,16 * * *` (7 separate entries) | morning/evening reminders, auto-salary + weekly report, debt deduction + recurring, zakat reminder, new-user nudge, daily lesson + wealth tip |
| `.github/workflows/supabase-backup.yml` | `0 2 * * *` | DB backup to Cloudflare R2 |

- Cron-authenticated routes call `verifyCronAuth()` (`lib/cron-auth.ts`) and compare
  the `Bearer` token against `CRON_SECRET`. It **throws when `CRON_SECRET` is
  unset**, so a misconfigured deployment fails fast instead of opening the route.
- Route-level flow: the workflow sends `Authorization: Bearer $CRON_SECRET`
  (see `app/api/smart-notifications/route.ts`, which fans out to the reminder
  routes with its own secret header).
- Adding a cron: add the schedule in `vercel.json` or the workflow **and** guard the
  route with `verifyCronAuth`; update the table above.

## 3. Offline sync (mobile)

- **Local DB**: Drift over SQLite, encrypted with SQLCipher
  (`lib/database/app_database.dart`). `SyncQueueTable` (`sync_queue`) records pending
  operations per entity; `entityType` documents 6 kinds
  (`transaction`, `debt`, `goal`, `account`, `budget`, `recurring`).
- **Engine**: `lib/services/sync_service.dart` (604 lines).
  `fullSync` = `pullWithPagination` → `pushPendingChanges`.
- **Conflict resolution**: version compare per row. `remoteVersion > localVersion`
  → the remote wins (local row updated with the server's version); local row missing
  → insert with `syncStatus: 'synced'`; delete op → applied locally; otherwise
  `MergeResult.conflict` is counted and reported in `SyncResult`
  (last-write-wins by version plus server timestamps, per `docs/REPO_INDEX.md` §12.5).
- **Retry**: per-item failure goes through `ErrorHandler` and
  `getBackoffDuration()`; `attemptCount >= 3` marks the item permanently failed.
  `TransactionRepository.enqueueCreate` cancels a pending `delete` for the same
  `entityId` (and vice versa) so opposite ops never both run.
- `_applyDelete` currently handles only 4 entity types
  (`transactions`, `debts`, `savings_goals`, `budgets`) although the queue documents
  6. Do not assume a queued `recurring` delete is applied.

## 4. Gamification

- `app/api/gamification/route.ts`: **POST** verifies the caller's JWT (user must
  match `user_id`), reads `transactions`, `debts`, `investments`, `savings_goals`,
  `user_stats`, and `profiles`, recomputes stats (savings rate, streaks, net worth,
  emergency fund), awards any of the **18 badges** in `BADGES` that newly pass
  (each with points and a new `alerts` row of `type: 'achievement'`), derives the
  level via `getLevel` (6 levels, 50/150/350/700/1200 thresholds), and upserts
  `user_stats`. **GET** just returns current `user_stats` + level.
- **Callers trigger the recompute on demand**: web `dashboard`, `learn`,
  `onboarding` pages and the mobile achievements screen
  (`screens/achievements/achievements_screen.dart`). No cron route calls this
  endpoint; `docs/REPO_INDEX.md` §12.6's "recalculates nightly" is not backed by
  code, trust the code.
- Mobile level display mirrors the ladder in `utils/level_ladder.dart`; keep it
  aligned with `getLevel` when thresholds change.

## 5. Gotchas

- **Edge functions are Deno, not Node**: URL-based imports, `Deno.env.get`,
  `Deno.serve`, `// @ts-ignore` typing. There is no `node_modules`, no `npm` test
  path, and Node APIs will not run. Deploy with the Supabase CLI, not Vercel.
- **Timezones**: cron schedules are UTC; quiet hours are user-local wall clock
  (`profiles.timezone`, default `Asia/Amman`). Use `getHHMMInTimeZone()` from
  `lib/push-send.ts` (or `Intl.DateTimeFormat` in the Edge Function) instead of
  `Date.getHours()`, which runs in the server's zone.
- **Background sync must not block the UI**: run it after writes or on app
  resume, keep per-item failures inside the queue's backoff loop, and never let a
  sync exception escape into `build`.
- **`user_stats` has no `CREATE TABLE` migration** (prod drift, gotcha 1). The
  gamification route upserts into it anyway; diff against prod before touching its
  shape, never `supabase db reset`.
- The gamification POST reads several whole tables per invocation through the
  admin client. Do not turn it into a per-user cron loop without an owner decision.

## 6. Where the code lives

| Piece | Location |
|---|---|
| Push queue entry | `lib/push-send.ts` |
| Delivery Edge Function | `supabase/functions/push-notification/index.ts` |
| Cron guards | `lib/cron-auth.ts`, `app/api/smart-notifications/route.ts` |
| Vercel crons | `vercel.json` |
| GitHub Actions crons | `.github/workflows/smart-notifications.yml`, `supabase-backup.yml` |
| Sync engine | `mobile/fajrak_flutter/lib/services/sync_service.dart` |
| Local DB + queue | `mobile/fajrak_flutter/lib/database/app_database.dart` |
| Gamification | `app/api/gamification/route.ts`, `components/dashboard/GamificationCard.tsx`, mobile `utils/level_ladder.dart` |
| Preferences table | `notification_preferences` (+ `profiles.timezone`) |

## 7. Checklist before touching this domain

- [ ] New notifications go through `sendPushToUser` only (quiet hours, masking,
      fingerprint dedupe, `alerts` display preserved).
- [ ] New cron route guarded by `verifyCronAuth` and added to `vercel.json` or a
      workflow; schedule documented in §2 with the UTC/Amman distinction.
- [ ] Edge Function changes written in Deno style and deployed via Supabase CLI.
- [ ] Sync changes keep failures in the backoff path and never block the UI thread.
- [ ] `user_stats` changes diffed against prod (no migration is authoritative).
- [ ] Level or badge thresholds updated in **both** `getLevel`/`BADGES` (web) and
      `level_ladder.dart` (mobile).
