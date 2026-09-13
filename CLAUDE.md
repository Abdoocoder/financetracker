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
  (auth)/         # login, register
  (dashboard)/    # dashboard, transactions, debts, investments, alerts, budgets, goals
  api/            # API routes (alerts, cron, push, webhook, byok/proxy, api-keys, mcp)
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
    services/     # AccountsService, InvestmentsService, CurrencyService, etc.
  assets/i18n/    # ar.json, en.json
  Makefile        # make doctor (analyze + test), make build-apk, make clean
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
- **Current version**: `3.40.0+51` — الموقع: `mobile/fajrak_flutter/pubspec.yaml`
  - `pubspec.yaml` `X.Y.Z+N` === `package.json` `X.Y.Z` — حافظ على التطابق

## Security & Auth

- **RLS** on every table — لا تعطّل أبداً. Server-only work uses `lib/supabase/admin.ts` (service-role) sparingly.
- **Cron endpoints** (`app/api/cron-*`) authenticate via `Authorization: Bearer <CRON_SECRET>` compared with `timingSafeEqual` (`lib/cron-auth.ts`).
- **External agents / MCP / webhook** use per-user PATs `fjk_live_…` (`/api/api-keys/*`): SHA-256 partial-hash storage, scopes `create_transaction|read_transactions|read_balances`, max **5 active**, rate-limit 10/min per key, audited in `api_audit_log`. See `docs/technical/api_integration_guide.md`.
- **BYOK proxy** (`app/api/byok/proxy`): thin pass-through only — accepts web session cookie **or** `Authorization: Bearer <supabase JWT>`; providers SSRF-allowlisted in `lib/byok/providers.ts` (never dials arbitrary URLs); body passed as base64, never parsed; per-user rate limit 30/min via `bump_proxy_usage()`.
- **BYOK envelope** (`lib/byok/envelope.ts` is **server-only** — throws on `typeof window !== 'undefined'`): client sends `payload` = AES-GCM(provider_key, ephemeral key) + `env` = RSA-OAEP(ephemeral key, server public key) + `keyId`; server unwraps with RSA private key (env `BYOK_PRIVATE_KEY`, selected by `BYOK_KEK_ID`), decrypts, zeroes key bytes in `finally`. Never log key material or `payload`.

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

- **Default currency**: KWD — يتغير حسب إعدادات المستخدم في جدول `profiles`

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
