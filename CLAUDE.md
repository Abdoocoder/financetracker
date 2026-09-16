# Claude Instructions — FinanceTracker (Fajrak)

## Project Overview

تطبيق مالي شخصي يتكون من:
- **Web**: Next.js 16 + React 19 + TypeScript (App Router)
- **Mobile**: Flutter (`mobile/fajrak_flutter/`) — اسم التطبيق: Fajrak
- **Database**: Supabase (PostgreSQL) مع RLS مفعّل
- **Auth**: Supabase Auth
- **Push Notifications**: Firebase + Web Push
- **Monitoring**: Sentry

## Project Structure

```
app/
  (auth)/         # login, register, forgot-password, reset-password, onboarding
  (dashboard)/    # dashboard, transactions, debts, investments, alerts, budgets, goals
  api/            # API routes (alerts, cron, push, webhook, byok/proxy, api-keys, mcp)
  robots.ts       # disallows /api/, /dashboard/, /onboarding, /forgot-password, /reset-password
  sitemap.ts      # 6 public pages
# SEO page-split pattern: 'use client' pages that need metadata are split into
#   page.tsx        → thin server wrapper: generateMetadata() + render <XClient />
#   x-client.tsx    → the original client component body (named export) — never edit page.tsx for UI
components/
  ui/             # shadcn components
  dashboard/      # StatsCards, BudgetChart, DebtProgress, InvestmentTracker
  investments/    # WealthSimulator
  layout/         # Sidebar, Header
  settings/       # api-keys-section, byok-keys-section, sections, section-common
lib/
  supabase/       # client.ts, server.ts, middleware.ts
  byok/           # BYOK: envelope.ts (server-only), providers.ts (SSRF allowlist), types.ts, client.ts
  locales/        # translations: lib/locales/{ar,en}/<domain>.ts merged in index.ts; i18n key prefixes below
  *.ts            # utilities, hooks, i18n, firebase, currencies
types/            # shared TypeScript types
supabase/
  migrations/     # SQL migrations (numbered: legacy/ has 001–041, top-level has 042/043 + dated 2026-09xx)
mobile/fajrak_flutter/
  lib/
    screens/      # accounts, dashboard, transactions, debts, investments, goals, budgets, alerts, settings, help
    widgets/      # reusable widgets per feature (dashboard, transactions, investments, goals, budgets, debts, common)
    services/     # AccountsService, InvestmentsService, CurrencyService, etc. (+ byok/, repositories/)
  assets/i18n/    # ar.json, en.json
  AGENTS.md       # mobile-specific agent instructions (architecture, patterns, conventions)
  Makefile        # make doctor (analyze + test), make build-apk, make clean
# NEW (codebase-onboarding, Sep 2026) — additional top-level areas not listed above:
hooks/            # useAccounts, useDashboardData, useDashboardLayout, useFinancialSummary, useTransactions
docs/             # technical/ (api_integration_guide, onboarding_guide, notification_system_design, loading_states_ux_guidelines), projects/, superpowers/
__tests__/        # Jest unit tests: {api,hooks,lib,types}/ + helpers/supabase-mock.ts (chainProxy pattern)
e2e/              # Playwright: setup/global-setup.ts builds e2e/.auth/user.json; specs below
e2e/  spec files  # smoke.spec.ts, auth-flow.spec.ts, transaction-management.spec.ts
```

## Commands

### Web

```bash
npm run dev           # development server
npm run build         # production build
npm run lint          # ESLint
npm run typecheck     # TypeScript check (strict)
npm run test          # Jest unit tests
npm run test:coverage # Jest with coverage
npm run test:e2e      # Playwright E2E tests
npm run doctor        # full health check (lint + typecheck + coverage + build)
```

### Mobile (Flutter)

```bash
cd mobile/fajrak_flutter
flutter pub get
flutter run
flutter test
make doctor      # flutter analyze + flutter test (zero issues required)
make build-apk   # release APK
```

## App Info

- **Support email**: `support@fajrak.com` — لا تستخدم `abdooraf3@gmail.com` أبداً
- **Current version**: `3.40.0+52` — الموقع: `mobile/fajrak_flutter/pubspec.yaml`
  - `pubspec.yaml` `X.Y.Z+N` === `package.json` `X.Y.Z` — حافظ على التطابق

## Security & Auth

- **RLS** on every table — لا تعطّل أبداً. Server-only work uses `lib/supabase/admin.ts` (service-role) sparingly.
- **Cron endpoints** (`app/api/cron-*`) authenticate via `Authorization: Bearer <CRON_SECRET>` compared with `timingSafeEqual` (`lib/cron-auth.ts`).
- **External agents / MCP / webhook** use per-user PATs `fjk_live_…` (`/api/api-keys/*`): SHA-256 hash storage (only the 12-char prefix is stored/shown), scopes `create_transaction|read_transactions|read_balances`, max **5 active**, rate-limit 10/min per key, audited in `api_audit_log`. See `docs/technical/api_integration_guide.md`.
- **BYOK proxy** (`app/api/byok/proxy`): thin pass-through only — accepts web session cookie **or** `Authorization: Bearer <supabase JWT>`; providers SSRF-allowlisted in `lib/byok/providers.ts` (never dials arbitrary URLs); body passed as base64, never parsed; per-user rate limit 30/min via `bump_proxy_usage()`.
- **BYOK envelope** (`lib/byok/envelope.ts` is **server-only** — throws on `typeof window !== 'undefined'`): client sends `payload` = AES-GCM(provider_key, ephemeral key) + `env` = RSA-OAEP(ephemeral key, server public key) + `keyId`; server unwraps with RSA private key (env `BYOK_PRIVATE_KEY`, selected by `BYOK_KEK_ID`), decrypts, zeroes key bytes in `finally`. Never log key material or `payload`.
- **CSP hardening**: webpages enforce a Content-Security-Policy served via a nonce proxy (`proxy.ts`) — Supabase REST/realtime, Firebase FCM googleapis, and `va.vercel-scripts.com` allowed under `connect-src`; Sentry Session Replay blob worker allowed under `worker-src`/`child-src`. `/monitoring` (Sentry tunnel) and service workers are excluded from the matcher. Web API auth also uses `timingSafeEqual` via `lib/cron-auth.ts` (`verifyCronAuth`).

## Version Update Checklist

عند تحديث رقم الإصدار يجب تعديل **جميع** هذه الملفات:

| الملف | ما يتغير |
|-------|----------|
| `mobile/fajrak_flutter/pubspec.yaml` | `version: X.Y.Z+N` |
| `package.json` | `"version": "X.Y.Z"` |
| `README.md` | إضافة قسم `### vX.Y.Z` في الـ changelog |
| `README.ar.md` | نفس القسم بالعربية |
| `mobile/fajrak_flutter/README.md` | نفس القسم |
| `app/download/page.tsx` | رقم الإصدار في الـ badge + رابط الـ APK + نص الزر |
| `CLAUDE.md` | تحديث سطر **Current version** أعلاه |

- **Default currency**: JOD — يتغير حسب إعدادات المستخدم في جدول `profiles`

## CSS Variables (Web)

```
النصوص:   --text-primary  --text-secondary  --text-muted
الخلفية:  --bg-card  --bg-elevated  --bg-secondary
الحدود:   --border
الألوان:  --accent-blue  --accent-blue-light  --accent-blue-dim
          --accent-green-light  --accent-green-dim
          --accent-red-light  --accent-red-dim
الظل:     --shadow-card
```

## i18n Key Naming

```
dash_*          # لوحة التحكم
tx_*            # المعاملات
debts_*         # الديون
budget_*        # الميزانية
goals_*         # الأهداف
invest_*        # الاستثمار
alerts_*        # التنبيهات
settings_*      # الإعدادات
help_faq_<section>_title/q1/a1  # صفحة المساعدة
```

## Tech Stack Details

- **UX Standards**:
  - **Data Safety**: Use `ConfirmDialog` component for ALL destructive actions (Delete, Reset, Cancel).
  - **Accessibility**: Every icon-only button MUST have a descriptive `aria-label`.
  - **Smart Focus**: Always set `autoFocus` on the primary input of any new form.
- **State Management**: TanStack Query v5 (Web), Flutter Provider + Supabase (Mobile)
- **Styling**: Tailwind CSS
- **i18n**: custom i18n (`lib/i18n.tsx`) — Arabic/English support, easy_localization (Flutter). Translations live in `lib/locales/{ar,en}/` as per-domain files (e.g. `alerts.ts`, `transactions.ts`) merged in `index.ts`; `lib/locales/{ar,en}.ts` are re-export shims. Add/update the per-domain file, never the shim.
- **Database migrations**: `supabase/migrations/` — legacy/ holds 001–041; top-level has 042/043 and newer dated `202609HSMMSS_name.sql`. Add a new migration, never edit existing.

## Rules

### Database

- كل جداول قاعدة البيانات تستخدم RLS — لا تعطّل هذا أبداً
- الـ migrations مرقّمة تسلسلياً — أضف migration جديد بدلاً من تعديل الموجودة
- استخدم `lib/supabase/server.ts` في Server Components و `lib/supabase/client.ts` في Client Components

### Code

- TypeScript strict mode — لا `any` إلا عند الضرورة القصوى
- لا تعدّل ملفات `.next/` أو `coverage/`
- الـ hooks في `hooks/` وليس داخل المكونات مباشرة
- استخدم TanStack Query لكل fetch من Supabase في الـ client
- دالة `fmt` للأرقام تُعرَّف على مستوى الـ module وليس داخل الـ component لتجنب إعادة الإنشاء في كل render
- الصور تستخدم `<Image>` من `next/image` وليس `<img>` مباشرة
- كل dynamic import يجب أن يحتوي على `loading:` fallback (skeleton)

### Testing

- اختبارات الـ unit في `__tests__/`
- اختبارات E2E في `e2e/`
- لا تستخدم mocks لقاعدة البيانات في اختبارات التكامل
- كل test يُنشئ async hooks يجب أن ينتهي بـ `await act(async () => {})` لتصريف الـ pending effects وتجنب act() warnings
- استخدم `chainProxy` pattern للـ Supabase method chaining في الـ mocks (موجود في `__tests__/hooks/`)

### UX

- كل صفحة تحتاج loading state → استخدم skeleton (`className="skeleton"`) وليس نصاً أو spinner فقط
- أزرار الحذف → modal تأكيد وليس `confirm()` المتصفح
- كل زر icon-only → `aria-label` وصفي
- كل نموذج → `autoFocus` على أول حقل إدخال
- أزرار الحفظ أثناء التحميل → `⏳ ...` أو نص يدل على الانتظار + `disabled` + `cursor: not-allowed`

### Mobile

- اتبع نفس منطق الـ web عند تعديل ميزة موجودة في الاثنين معاً
- المشروع يستخدم Supabase Flutter SDK وليس REST مباشرة
- كل نموذج (form) يجب أن يحتوي على:
  - guard: `if (_saving) return;` كأول سطر في دالة الحفظ
  - `_saving = true; setState(() {});` بشكل متزامن قبل أي `await`
  - `try/catch/finally` مع `setState(() => _saving = false)` في الـ `finally`
- كل `TextEditingController` يجب أن يُستدعى عليه `dispose()` في `dispose()`
- كل `showModalBottomSheet` يجب أن يحتوي على `useSafeArea: true`

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Verified Facts — Live Audit (Sep 2026)

Fresh facts from a live Supabase/GitHub audit performed Sep 2026. Trust these over assumptions below.

### Live DB drift (live DB ≠ migrations)
The live schema has prod additions made via the Supabase SQL editor that are **NOT in `supabase/migrations/`** (repo schema lags production — risk for `supabase db reset`):
- `profiles` extra cols: `opening_balance`, `salary_day` (check 1–28), `asset_real_estate`, `asset_vehicles`, `asset_jewelry`, `asset_other`, `assets_updated_at`, `phone`, `job_title`, `birth_date`, `avatar_url`, `onboarding_done`, `lang` (check ar/en, default 'ar'), `lesson_streak`, `last_lesson_date`, `monthly_income`, `timezone` (default Asia/Amman), `plan` (check free/pro), `currency` (default **JOD**).
- Prod tables with no migration file: `user_stats`, `testimonials`, `saving_challenges`, `health_score_history`.
- Default currency on live profiles is **JOD, not KWD** (KWD below is stale). Always read `profiles.currency` per user.
- Live scale: 49 profiles, 1,025 transactions, 51 debts, 9,663 alerts, 21,483 notification_history rows. Postgres 17.6.1.084, region ap-northeast-1.

### Security audit (advisor output, Sep 2026)
- 6 WARN: `authenticated` role can execute the **owner-guarded** SECURITY DEFINER RPCs — intentional per migration `20260907083248_verify_owner_in_user_rpcs.sql` (functions verify `auth.uid() = owner` internally). `delete_user_account`, `get_account_balances`, `get_financial_dashboard`, etc. Do NOT remove the owner guards.
- Leaked-password protection is **disabled** on the auth config.
- No performance advisories flagged.

### Verified health (ran this session)
- lint ✓ · typecheck ✓ · `next build` 54/54 ✓ · Jest 531 tests / 58 suites (stmts 48.04% / br 31.46% / fn 31.54%, 156 files) ✓ · Playwright 6 pass + 1 flaky (auth-flow nav race) ✓ · Flutter `make doctor` ✓.
- `npm audit`: 8 moderate @opentelemetry/* transitive advisories (GHSA-8988-4f7v-96qf). Next.js 16.3.5 (installed; also React 19.2.8, TS 5.9.3, `@supabase/ssr` 0.5.2, `@tanstack/react-query` 5.101.4).
- Jest exits via `--forceExit` (worker force-exit after run) — acceptable.
- Web dev server verified live at fajrak.com + local :3000; Flutter app runs on Chrome.
- **Supabase performance advisories** (6 WARN): RLS initplan — `user_stats`, `testimonials` (3), `saving_challenges`, `health_score_history` policies use `auth.uid()` per-row; wrap with `(select auth.uid())` for performance. 21 unused indexes on `debt_payments`, `investment_transactions`, `saving_challenges`, `testimonials`, `transactions`, `debts`, `user_byok_keys`, `budget_alert_log`, `user_api_keys`, `investments`, `budgets`, `proxy_usage`, `api_audit_log`, `chats`, `messages`.

### Git / identity
- Solo dev: `Abdoocoder` (Abdallah Abu Saghierh, Amman/JO). Commits occasionally authored as `abdooraf3@gmail.com` (still never use that as the support email).
- Remote: `https://github.com/Abdoocoder/financetracker.git`. Convention: conventional commits (`feat:` `fix:` `docs:` `chore:` `refactor:` `test:` `style:`), `feat/*` branches, tags up to `v2.1.0-android`.

## CI/CD Pipeline

- **GitHub Actions** (`lint-test-build.yml`): runs on push to `main` and PRs
  - Steps: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test`
  - Node 22, ubuntu-latest
- **Supabase validation** (`supabase-validate.yml`): DRY-RUN migration lint on isolated local stack (never touches live DB)
- **Smart notifications** (`smart-notifications.yml`): separate workflow
- **Deploy**: Vercel auto-deploys from `main`; Flutter builds via `make build-apk`

## Git Conventions

- **Commits**: Conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `style:`, `ci:`
- **Branches**: `feat/*` pattern (e.g., `feat/flutter-byok-chat`, `feat/v3.36.0-security-hardening`)
- **Tags**: Semantic versioning (e.g., `v1.0.0`, `v2.1.0-android`)
- **PR workflow**: Merge commits to `main`

## Testing Architecture

- **Jest** (`jest.config.js`): 58 suites, 531 tests; coverage via `--forceExit` (acceptable — worker force-exit after run)
- **Playwright** (`playwright.config.ts`): Chromium only; global auth setup via `e2e/setup/global-setup.ts`
  - `baseURL: localhost:3000`; retries: 2 on CI, 1 locally; workers: 1 on CI, 2 locally
  - Dev server: `npx next dev --webpack` (avoids Linux inotify limit)
  - Trace on first retry; HTML reporter
  - Specs: `e2e/{smoke,auth-flow,transaction-management}.spec.ts`; auth specs use the shared storageState built at `e2e/.auth/user.json`
- **Coverage gaps**: All `app/(dashboard)/` pages at 0%; hooks `useDashboardData.ts` and `useDashboardLayout.ts` at 0%

## Environment Variables

Full `.env.example` with 20+ vars across 7 groups:
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **E2E**: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` (dedicated test account — never use a real user)
- **Firebase** (client + admin): `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- **Push/VAPID**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- **Market data**: `TWELVE_DATA_KEY`, `NEXT_PUBLIC_EXCHANGE_RATE_KEY`
- **BYOK**: `BYOK_PRIVATE_KEY` (server-only pkcs8 PEM), `NEXT_PUBLIC_BYOK_PUBLIC_KEY` (safe for browser), `NEXT_PUBLIC_BYOK_KEK_ID`
- **Cron**: `CRON_SECRET` (used with `timingSafeEqual` in `lib/cron-auth.ts`)
- **Sentry**: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
