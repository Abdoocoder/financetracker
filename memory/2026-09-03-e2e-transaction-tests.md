# DEBUG REPORT — 2026-09-03

**Component:** E2E auth fixture + `transaction-management` spec (previously skipped)

**Status:** DONE

---

## Symptom
The `transaction-management.spec.ts` authenticated tests were permanently skipped
(`test.skip`) and had never been run. After enabling them, 3 tests failed/timed out:
1. `should open add transaction form` — timeout clicking add button
2. `should show validation errors on invalid transaction` — timeout clicking add / expecting save errors
3. `should allow searching transactions` — timeout on search placeholder

Even after the auth fixture was built (global-setup login), the tests still failed.

## Root cause (4 distinct)
1. **Env vars not loaded in Playwright globalSetup.** globalSetup runs in plain Node
   and does NOT auto-load `.env.local` (Next.js-only convention). So
   `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` were `undefined` and the fixture couldn't login.
2. **Wrong storageState path.** global-setup wrote the session to a mis-resolved path
   that didn't match the test's `storageState: 'e2e/.auth/user.json'`, so tests had no session.
3. **Wrong language.** i18n (lib/i18n.tsx) falls back to `navigator.language` (en-US in
   headless Chromium), so the login page and app rendered English while the spec used
   Arabic selectors — nothing matched.
4. **Stale, never-validated selectors + two real blocking overlays + a real product bug.**
   - Add button was `إضافة معاملة`; real accessible name is `+ + إضافة`.
   - Search placeholder was `بحث...`; real is `🔍 ابحث عن معاملة...`.
   - Full-screen **WelcomeModal** (`fajrak_welcome_shown`) and **OnboardingTour**
     (`tour_transactions`) overlays block interaction on first visit.
   - Modal save button is `إضافة` (trans_add), not `حفظ`.
   - Modal title is `+ إضافة`, not `معاملة جديدة`.
   - **Real bug:** `TransactionFormModal` never received or rendered the `errors` map, so
     validation errors (`المبلغ مطلوب` / `الفئة مطلوبة`) never displayed — clicking save on
     an empty form did nothing visible.

## Fix
- `e2e/setup/global-setup.ts`:
  - `import { config as loadEnv } from 'dotenv'` + `loadEnv({ path: path.join(ROOT, '.env.local'), override: true })`.
  - `ROOT = path.resolve(__dirname, '..', '..')`; `AUTH_FILE = path.join(ROOT, 'e2e', '.auth', 'user.json')`.
  - `addInitScript` sets `localStorage.lang = 'ar'` before login (Arabic UI).
- `package.json`: added `dotenv ^16.6.1` devDependency.
- `e2e/transaction-management.spec.ts`: rewrote with correct locators and
  `beforeEach` `addInitScript` setting `lang='ar'` + `fajrak_welcome_shown='true'` +
  `tour_transactions='true'` (suppresses the two first-visit overlays).
- `components/transactions/TransactionFormModal.tsx`: added `errors` prop and rendered
  `error={errors.amount}` / `error={errors.category}` on the amount + category FormFields.
- `app/(dashboard)/dashboard/transactions/page.tsx`: passed `errors={tx.errors}` to the modal.

## Evidence
`npx playwright test` → **7 passed** (4 auth + 3 transaction-management). `npx tsc --noEmit` clean.
Prior state: 3 of these tests failed/timed out; the transaction spec was skipped entirely.

## Regression test
`e2e/transaction-management.spec.ts` — 3 tests now assert: modal opens with correct
title; save on empty form shows `المبلغ مطلوب` + `الفئة مطلوبة`; search collapses list to
`لا توجد معاملات`. Auth fixture covered by the 4 spec files using `storageState`.

## Related
- `components/ui/welcome-modal.tsx` (key `fajrak_welcome_shown`)
- `components/ui/onboarding-tour.tsx` (key `tour_transactions`)
- `hooks/useTransactions.ts` — `saveTransaction()` sets `errors`; modal now displays them
- The error-display gap was a real UX bug surfaced by the previously-unrun test.
