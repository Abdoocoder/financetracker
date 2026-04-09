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
  lib/screens/    # accounts, dashboard, transactions, debts, investments, goals, budgets, alerts, settings, help
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
```

## Tech Stack Details
- **State (Web)**: TanStack Query v5 for server state
- **State (Mobile)**: Flutter built-in + Supabase realtime
- **Charts**: Recharts (web) 
- **Styling**: Tailwind CSS
- **i18n**: custom i18n (`lib/i18n.tsx`) — Arabic/English support
- **Database migrations**: `supabase/migrations/` — numbered sequentially

## Rules

### Database
- كل جداول قاعدة البيانات تستخدم RLS — لا تعطّل هذا أبداً
- الـ migrations مرقّمة تسلسلياً — أضف migration جديد بدلاً من تعديل الموجودة
- استخدم `lib/supabase/server.ts` في Server Components و `lib/supabase/client.ts` في Client Components

### Code
- TypeScript strict mode — لا `any` إلا عند الضرورة القصوى
- لا تعدّل ملفات `.next/` أو `coverage/`
- الـ hooks في `lib/` وليس داخل المكونات مباشرة
- استخدم TanStack Query لكل fetch من Supabase في الـ client

### Testing
- اختبارات الـ unit في `__tests__/`
- اختبارات E2E في `e2e/`
- لا تستخدم mocks لقاعدة البيانات في اختبارات التكامل

### Mobile
- اتبع نفس منطق الـ web عند تعديل ميزة موجودة في الاثنين معاً
- المشروع يستخدم Supabase Flutter SDK وليس REST مباشرة
