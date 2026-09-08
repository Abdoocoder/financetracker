# Push Pre-Insert Filtering (Fix #3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop writing `notification_history` rows (and therefore firing the DB webhook → Edge Function) for users who have disabled a notification category, are inside quiet hours, or have no push subscription. Filtering moves from *after* insert (currently done by the Edge Function) to *before* insert, in the single choke point `sendPushToUser`.

**Architecture:** Add a lightweight pre-insert guard in `lib/push-send.ts` that (1) reads the user's `notification_preferences` row for the category and skips if `enabled === false`, (2) skips if the current local time (computed from `profiles.timezone`, IANA, default `Asia/Amman`) falls inside `quiet_start`/`quiet_end`, (3) skips if the user has zero `push_subscriptions`. On any skip, return `0` with **no DB write → no webhook → no Edge invocation**. The Edge Function keeps its checks as a backstop for non-cron triggers, but its quiet-hours comparison is fixed to be timezone-aware so both paths agree.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Supabase (`@supabase/supabase-js` via `createAdminClient`), Jest (unit tests using the existing chainable-mock pattern), Deno Edge Function (`supabase/functions/push-notification`). No new dependencies — timezone math uses `Intl.DateTimeFormat`.

---

## Context (verified against the live database)

- Supabase project id: `ujwcvtpwsaidljecqbaa` (`fajrak`, ACTIVE_HEALTHY).
- `notification_history`: 21,291 rows. `notification_preferences`: 160 rows across 49 profiles (~3.3 rows/user; missing category row = default enabled). `push_subscriptions`: 48 rows. `profiles.timezone`: IANA string, default `'Asia/Amman'`.
- `notification_preferences` columns used: `enabled` (bool, default true), `quiet_start` / `quiet_end` (`time without time zone` — user-local wall clock), `updated_at`.
- Current flow (to be changed): cron endpoints → `sendPushToUser` → dedupe → INSERT `notification_history` → DB webhook → Edge Function checks prefs/quiet-hours (waste: insert + webhook + Edge call for every skipped user).
- New flow: cron endpoints → `sendPushToUser` → pref/quiet/subscription guard (RETURN 0 on skip) → dedupe → INSERT (only for actually-sendable notifications).
- Edge Function currently compares quiet hours against **UTC** (`getUTCHours`) — a bug: users pick local times in settings but the check runs in UTC. This plan fixes the Edge backstop to be timezone-aware too.
- Existing `__tests__/lib/push-send.test.ts` uses a chainable mock (`from/select/eq/... return this`, mocked `.then` resolves the awaited query result). The new flow adds `.order(...)` / `.limit(1)` to the chain and a second `select` on `push_subscriptions`, so every existing test must be updated to resolve the extra awaited queries in order.

## File Structure

| File | Responsibility | Action |
| --- | --- | --- |
| `lib/push-send.ts` | `sendPushToUser` + new pure helpers `getHHMMInTimeZone`, `isInQuietHours` | Modify (helpers + pre-insert guard) |
| `__tests__/lib/push-send.test.ts` | Unit tests for helpers + all `sendPushToUser` paths | Rewrite (add helper tests; update chain mocks) |
| `supabase/functions/push-notification/index.ts` | Edge backstop; timezone-aware quiet hours | Modify (pref select join + quiet-hours block only) |

---

## Task 1: Add pure helpers `getHHMMInTimeZone` and `isInQuietHours`

**Files:**
- Create: n/a
- Modify: `lib/push-send.ts` (append helpers after `toCategory`, before `sendPushToUser`)
- Test: `__tests__/lib/push-send.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/lib/push-send.test.ts` (after the imports line `import { sendPushToUser } ...`):

```ts
import { sendPushToUser, getHHMMInTimeZone, isInQuietHours } from '../../lib/push-send'

describe('getHHMMInTimeZone', () => {
  it('returns UTC minutes at a fixed instant', () => {
    const d = new Date('2026-09-07T12:30:00Z')
    expect(getHHMMInTimeZone(d, 'UTC')).toBe(12 * 60 + 30)
  })

  it('applies the timezone offset (Asia/Amman = UTC+3)', () => {
    const d = new Date('2026-09-07T12:30:00Z')
    expect(getHHMMInTimeZone(d, 'Asia/Amman')).toBe(15 * 60 + 30)
  })

  it('handles hour 23 in an offset timezone (America/New_York = UTC-4, DST off)', () => {
    const d = new Date('2026-01-15T03:30:00Z')
    expect(getHHMMInTimeZone(d, 'America/New_York')).toBe(22 * 60 + 30)
  })
})

describe('isInQuietHours', () => {
  it('is true inside a normal window and false at its end (end-exclusive)', () => {
    expect(isInQuietHours('12:00', '13:00', 12 * 60 + 30)).toBe(true)
    expect(isInQuietHours('12:00', '13:00', 13 * 60)).toBe(false)
  })

  it('is true inside an overnight window and false outside it', () => {
    expect(isInQuietHours('22:00', '07:00', 23 * 60)).toBe(true)
    expect(isInQuietHours('22:00', '07:00', 3 * 60)).toBe(true)
    expect(isInQuietHours('22:00', '07:00', 12 * 60)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/push-send.test.ts`
Expected: FAIL — `getHHMMInTimeZone is not defined` (function does not exist yet).

- [ ] **Step 3: Implement the helpers**

Insert into `lib/push-send.ts` between `toCategory` and `sendPushToUser`:

```ts
/**
 * Returns the current minutes-of-day (0–1439) for `date` in an IANA `timeZone`.
 * Dependency-free: uses Intl.DateTimeFormat. Falls back to 0 on parse failure.
 */
export function getHHMMInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour   = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

/**
 * Quiet-hours check. `quietStart`/`quietEnd` are "HH:MM" local wall-clock times
 * stored as `time without time zone`. Overnight windows (start > end) wrap.
 * The window is end-exclusive (`now === quietEnd` is NOT quiet).
 */
export function isInQuietHours(quietStart: string, quietEnd: string, nowHHMM: number): boolean {
  const [sh, sm] = quietStart.split(':').map(Number)
  const [eh, em] = quietEnd.split(':').map(Number)
  const start = sh * 60 + sm
  const end   = eh * 60 + em
  return start <= end
    ? nowHHMM >= start && nowHHMM < end
    : nowHHMM >= start || nowHHMM < end
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/push-send.test.ts`
Expected: the 6 new helper tests PASS (existing `sendPushToUser` tests still fail/unchanged — they are updated in Task 2).

- [ ] **Step 5: Commit**

```bash
git add lib/push-send.ts __tests__/lib/push-send.test.ts
git commit -m "feat(push): add timezone-aware quiet-hours helpers"
```

---

## Task 2: Add the pre-insert guard to `sendPushToUser`

**Files:**
- Modify: `lib/push-send.ts:81-125` (the whole `sendPushToUser` body)
- Test: `__tests__/lib/push-send.test.ts` (rewrite the `sendPushToUser` describe block; add `order`/`limit` to the mock)

- [ ] **Step 1: Update the mock chain and rewrite the tests**

Replace the entire content of `__tests__/lib/push-send.test.ts` with:

```ts
const mockSupabaseInstance = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  insert: jest.fn(),
  then: jest.fn(),
}

jest.mock('../../lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseInstance)
}))

import { sendPushToUser, getHHMMInTimeZone, isInQuietHours } from '../../lib/push-send'

describe('getHHMMInTimeZone', () => {
  it('returns UTC minutes at a fixed instant', () => {
    const d = new Date('2026-09-07T12:30:00Z')
    expect(getHHMMInTimeZone(d, 'UTC')).toBe(12 * 60 + 30)
  })

  it('applies the timezone offset (Asia/Amman = UTC+3)', () => {
    const d = new Date('2026-09-07T12:30:00Z')
    expect(getHHMMInTimeZone(d, 'Asia/Amman')).toBe(15 * 60 + 30)
  })

  it('handles hour 23 in an offset timezone (America/New_York = UTC-4, DST off)', () => {
    const d = new Date('2026-01-15T03:30:00Z')
    expect(getHHMMInTimeZone(d, 'America/New_York')).toBe(22 * 60 + 30)
  })
})

describe('isInQuietHours', () => {
  it('is true inside a normal window and false at its end (end-exclusive)', () => {
    expect(isInQuietHours('12:00', '13:00', 12 * 60 + 30)).toBe(true)
    expect(isInQuietHours('12:00', '13:00', 13 * 60)).toBe(false)
  })

  it('is true inside an overnight window and false outside it', () => {
    expect(isInQuietHours('22:00', '07:00', 23 * 60)).toBe(true)
    expect(isInQuietHours('22:00', '07:00', 3 * 60)).toBe(true)
    expect(isInQuietHours('22:00', '07:00', 12 * 60)).toBe(false)
  })
})

describe('sendPushToUser', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    mockSupabaseInstance.from.mockReturnThis()
    mockSupabaseInstance.select.mockReturnThis()
    mockSupabaseInstance.eq.mockReturnThis()
    mockSupabaseInstance.order.mockReturnThis()
    mockSupabaseInstance.limit.mockReturnThis()
    mockSupabaseInstance.insert.mockReturnThis()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.useRealTimers()
    consoleErrorSpy.mockRestore()
  })

  const resolveNext = (result: any) =>
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn(result)))

  it('should insert and return 1 when prefs allow, subscription exists, fingerprint is new', async () => {
    resolveNext({ data: null, error: null })                       // notification_preferences
    resolveNext({ count: 1, error: null })                          // push_subscriptions
    resolveNext({ count: 0, error: null })                          // dedupe fingerprint
    resolveNext({ error: null })                                    // insert

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(1)
    const fromCalls = mockSupabaseInstance.from.mock.calls.map(c => c[0])
    expect(fromCalls).toEqual(['notification_preferences', 'push_subscriptions', 'notification_history'])
    expect(mockSupabaseInstance.select).toHaveBeenCalledWith('enabled, quiet_start, quiet_end, profiles(timezone)')
    expect(mockSupabaseInstance.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should return 0 without insert when the category is disabled in preferences', async () => {
    resolveNext({ data: [{ enabled: false, quiet_start: null, quiet_end: null }], error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should return 0 without insert when now is inside quiet hours (explicit timezone)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T12:30:00Z'))
    resolveNext({ data: [{ enabled: true, quiet_start: '12:00', quiet_end: '13:00', profiles: { timezone: 'UTC' } }], error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should default timezone to Asia/Amman when profile join is missing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T09:30:00Z')) // 12:30 in Amman (UTC+3)
    resolveNext({ data: [{ enabled: true, quiet_start: '12:00', quiet_end: '13:00', profiles: null }], error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should return 0 without insert when the user has no push subscriptions', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 0, error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should skip insert when the fingerprint was already sent today', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 1, error: null }) // dedupe hit

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should proceed to insert when the dedupe check fails', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 0, error: { code: '500', message: 'Server error' } })
    resolveNext({ error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(1)
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should return 0 on duplicate insert error (23505)', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 0, error: null })
    resolveNext({ error: { code: '23505' } })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
  })

  it('should return 0 on other database errors', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 0, error: null })
    resolveNext({ error: { code: '500', message: 'Server error' } })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/push-send.test.ts`
Expected: FAIL — new assertions fail because `sendPushToUser` does not yet query `notification_preferences`/`push_subscriptions`.

- [ ] **Step 3: Implement the pre-insert guard**

Replace the whole `sendPushToUser` function in `lib/push-send.ts` (lines 81–125) with:

```ts
export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url?: string,
  tag = 'finance-alert',
  supabaseClient?: any,
  customFingerprint?: string
) {
  const supabase = supabaseClient || getSupabase()
  const category = toCategory(tag)

  // fingerprint يومي افتراضي — أو مخصص لمطابقة DB Trigger
  const fingerprint = customFingerprint
    ?? `${userId}:${tag}:${new Date().toISOString().slice(0, 10)}`

  const finalUrl = url || CATEGORY_DEFAULT_URL[category] || '/dashboard/alerts'

  // ── فلترة مسبقة قبل الـ insert (تقلّل webhook/Edge calls) ─────────────
  // 1) تفضيل الفئة + المنطقة الزمنية (سطر واحد عبر join)
  const { data: prefRows, error: prefError } = await supabase
    .from('notification_preferences')
    .select('enabled, quiet_start, quiet_end, profiles(timezone)')
    .eq('user_id', userId)
    .eq('category', category)
    .order('updated_at', { ascending: false })
    .limit(1)

  const pref = prefError ? undefined : prefRows?.[0]

  if (pref?.enabled === false) return 0 // الفئة معطّلة

  if (pref?.quiet_start && pref?.quiet_end) {
    const timeZone = (pref as any)?.profiles?.timezone ?? 'Asia/Amman'
    const nowHHMM  = getHHMMInTimeZone(new Date(), timeZone)
    if (isInQuietHours(pref.quiet_start, pref.quiet_end, nowHHMM)) return 0 // ساعات هادئة
  }

  // 2) يجب أن يملك المستخدم اشتراك push واحد على الأقل
  const { count: subCount, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (!subError && subCount === 0) return 0 // لا يوجد جهاز للإشعار

  // ── فحص مسبق للـ fingerprint قبل insert — يمنع رحلة insert فاشلة ──────
  const { count, error: dedupeError } = await supabase
    .from('notification_history')
    .select('id', { count: 'exact', head: true })
    .eq('fingerprint', fingerprint)

  if (!dedupeError && count) return 0 // مكرر — أُرسل اليوم بالفعل

  const { error } = await supabase.from('notification_history').insert({
    user_id:     userId,
    category,
    title,
    body:        message,
    data:        { url: finalUrl, tag },
    fingerprint,
  })

  if (error) {
    if (error.code === '23505') return 0 // مكرر — تجاهل بصمت
    console.error('[push-send] notification_history insert error:', error.message)
    return 0
  }

  return 1
}
```

**Notes:**
- Default preference (missing row) stays enabled — `pref?.enabled === false` only skips an explicit `false`; missing `quiet_start/end` skips the quiet-hours branch. This matches the Edge backstop's current semantics.
- `prefError` is swallowed on purpose: a preference-read error must not block a legitimate push (defensive default = send). Same rationale as the existing dedupe fallback.
- `.order('updated_at', { ascending: false }).limit(1)` guards against duplicate (user, category) rows; `maybeSingle()` would 406 on duplicates.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/push-send.test.ts`
Expected: ALL 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/push-send.ts __tests__/lib/push-send.test.ts
git commit -m "feat(push): skip insert for disabled/quiet-hours/subscription-less users"
```

---

## Task 3: Make the Edge Function backstop timezone-aware

**Files:**
- Modify: `supabase/functions/push-notification/index.ts:81-109` (pref select + quiet-hours block only)
- Test: manual verification (no Deno test harness in this repo)

The Edge Function remains the backstop for non-cron inserts (e.g. DB triggers), so its quiet-hours logic must match the new pre-filter. Currently it compares against UTC (`getUTCHours`) while users pick local times — fix it to use `profiles.timezone`.

- [ ] **Step 1: Update the preference select to join the user timezone**

Replace lines 82–87:

```ts
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('enabled, quiet_start, quiet_end, mask_sensitive_data')
      .eq('user_id', user_id)
      .eq('category', category)
      .maybeSingle()
```

with:

```ts
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('enabled, quiet_start, quiet_end, mask_sensitive_data, profiles(timezone)')
      .eq('user_id', user_id)
      .eq('category', category)
      .maybeSingle()
```

- [ ] **Step 2: Replace the quiet-hours comparison with a timezone-aware one**

Replace lines 94–109:

```ts
    // تحقق من الساعات الهادئة
    if (pref?.quiet_start && pref?.quiet_end) {
      const now = new Date()
      const hhmm = now.getUTCHours() * 60 + now.getUTCMinutes()
      const [qsh, qsm] = pref.quiet_start.split(':').map(Number)
      const [qeh, qem] = pref.quiet_end.split(':').map(Number)
      const quietStart = qsh * 60 + qsm
      const quietEnd   = qeh * 60 + qem
      const inQuiet = quietStart <= quietEnd
        ? hhmm >= quietStart && hhmm < quietEnd
        : hhmm >= quietStart || hhmm < quietEnd
      if (inQuiet) {
        console.log(`[push] user=${user_id} in quiet hours`)
        return new Response(JSON.stringify({ skipped: 'quiet_hours' }), { status: 200 })
      }
    }
```

with:

```ts
    // تحقق من الساعات الهادئة — حسب المنطقة الزمنية للمستخدم (وليس UTC)
    if (pref?.quiet_start && pref?.quiet_end) {
      const timeZone = (pref as any)?.profiles?.timezone ?? 'Asia/Amman'
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date())
      const hh   = Number(parts.find((p: any) => p.type === 'hour')?.value ?? '0')
      const mm   = Number(parts.find((p: any) => p.type === 'minute')?.value ?? '0')
      const hhmm = hh * 60 + mm
      const [qsh, qsm] = pref.quiet_start.split(':').map(Number)
      const [qeh, qem] = pref.quiet_end.split(':').map(Number)
      const quietStart = qsh * 60 + qsm
      const quietEnd   = qeh * 60 + qem
      const inQuiet = quietStart <= quietEnd
        ? hhmm >= quietStart && hhmm < quietEnd
        : hhmm >= quietStart || hhmm < quietEnd
      if (inQuiet) {
        console.log(`[push] user=${user_id} in quiet hours`)
        return new Response(JSON.stringify({ skipped: 'quiet_hours' }), { status: 200 })
      }
    }
```

- [ ] **Step 3: Deploy and verify**

```bash
cd supabase
supabase functions deploy push-notification --project-ref ujwcvtpwsaidljecqbaa
```

Expected: deploy succeeds. To spot-check, insert a `notification_history` row for a test user whose `notification_preferences` has `quiet_start`/`quiet_end` bracketing the current time (with their `profiles.timezone`) and confirm the function returns `200 {"skipped":"quiet_hours"}`. (Optional — the pre-filter in Task 2 is the primary guard; this is backstop parity.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/push-notification/index.ts
git commit -m "fix(push): timezone-aware quiet hours in edge backstop"
```

---

## Task 4: Full validation and final review

**Files:**
- Validate: all modified files
- No further code changes unless a check fails

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test`
Expected: all tests pass, including the 14 in `__tests__/lib/push-send.test.ts`.

- [ ] **Step 2: Run typecheck and lint**

Run: `npm run typecheck`
Expected: no type errors.

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 3: Confirm no other callers need changes**

Run: `grep -rn "sendPushToUser(" app components lib --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: all callers pass the same positional args (`userId, title, message, url?, tag?`). The new guard is fully interior to `sendPushToUser` — no caller signature changes. Callers that intentionally send high-priority/security notifications are unaffected because skipping only happens for explicitly-disabled categories, quiet hours, or zero subscriptions (matching the Edge backstop that previously filtered them anyway).

- [ ] **Step 4: Commit any leftover fixes**

```bash
git add -A
git commit -m "chore: push pre-filter validation fixes"
```

(Only run if Step 1–3 required fixes; otherwise skip.)

- [ ] **Step 5: Report expected impact**

Expected: retention of meaningful pushes only. Disabled-category, quiet-hours, and subscription-less users no longer produce `notification_history` rows, DB webhook calls, or Edge Function invocations for cron-driven pushes. The daily fan-out in `/api/smart-notifications` (hour === 6) and the other ~9 push cron endpoints all benefit with no per-endpoint changes.

---

## Self-Review

**Spec coverage:**
- Pre-insert preference check → Task 2 (pref select + `enabled === false` skip). ✅
- Pre-insert quiet-hours check with user timezone → Task 2 + helpers in Task 1 + Edge parity in Task 3. ✅
- Pre-insert subscription check → Task 2 (sub-count skip). ✅
- Preserve default-enabled semantics for missing pref rows → Task 2 notes + tests (`data: null` → insert). ✅
- Keep Edge Function as backstop → Task 3 (parity fix, no removal). ✅
- No new deps → `Intl.DateTimeFormat` only. ✅
- Tests for all paths → 9 `sendPushToUser` cases + 6 helper cases = 14 tests. ✅

**Placeholder scan:** no TBD/TODO; every code step shows full code; every command shows expected output. ✅

**Type consistency:** helpers named `getHHMMInTimeZone` / `isInQuietHours` used identically in Task 1 and Task 2; `pref.quiet_start/quiet_end` and `profiles(timezone)` naming consistent across Task 2 and Task 3; mock chain order documented via comment `// notification_preferences` etc. in tests. ✅