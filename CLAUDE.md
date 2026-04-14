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
  api/            # API routes (alerts, cron, push)
components/
  ui/             # shadcn components
  dashboard/      # StatsCards, BudgetChart, DebtProgress, InvestmentTracker
  layout/         # Sidebar, Header
lib/
  supabase/       # client.ts, server.ts, middleware.ts
  *.ts            # utilities, hooks, i18n, firebase, currencies
types/            # shared TypeScript types
supabase/
  migrations/     # SQL migrations (numbered)
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
- **Current version**: `3.32.3+27` — الموقع: `mobile/fajrak_flutter/pubspec.yaml`

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

- **State (Web)**: TanStack Query v5 for server state
- **State (Mobile)**: Flutter built-in + Supabase realtime
- **Charts**: Recharts (web), fl_chart (Flutter)
- **Styling**: Tailwind CSS
- **i18n**: custom i18n (`lib/i18n.tsx`) — Arabic/English support, easy_localization (Flutter)
- **Database migrations**: `supabase/migrations/` — numbered sequentially

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
