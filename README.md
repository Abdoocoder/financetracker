<div align="center">

<img
  src="public/icon-512.png"
  alt="Fajrak Logo"
  width="120"
  height="120"
  style="border-radius: 24px;"
/>

# Fajrak — فجرك

**The First Smart Arabic Personal Finance Manager**

*Your dawn toward financial freedom*

---

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-fajrak.com-FF6B35?style=for-the-badge)](https://fajrak.com)
[![Download APK](https://img.shields.io/badge/📱_Android_APK-Download-38ef7d?style=for-the-badge)](https://fajrak.com/download)
[![Google Play](https://img.shields.io/badge/🎯_Google_Play-Closed_Testing-4285F4?style=for-the-badge)](https://play.google.com/store/apps/details?id=com.fajrak.app)

[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FCM-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square)](https://fajrak.com)
[![Sentry](https://img.shields.io/badge/Sentry-Monitored-362D59?style=flat-square&logo=sentry)](https://sentry.io)

---

🇸🇦 [العربية](./README.ar.md) | 🇬🇧 English

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Financial Journey](#-financial-journey)
- [Features](#-features)
- [Technology Stack](#️-technology-stack)
- [Database Schema](#️-database-schema)
- [Automated Workflows](#-automated-workflows)
- [Mobile App](#-mobile-app)
- [Internationalization](#-internationalization)
- [Security](#-security)
- [Quick Start](#-quick-start)
- [Testing](#-testing)
- [Roadmap](#️-roadmap)
- [Changelog](#-changelog)

---

## ✨ Overview

**Fajrak** (فجرك — "Your Dawn") is a full-stack Arabic-first personal finance
platform that guides users from their very first transaction all the way to
financial independence.

> **Mission:** Every person deserves full awareness of their financial situation
> and a clear plan for improvement — regardless of income or level — until they
> achieve **financial freedom**.
>
> Inspired by Islamic values of **effort, work, and contentment** 🕌

**What makes Fajrak different:**

| | Fajrak | Generic Finance Apps |
|:--|:------:|:-------------------:|
| Arabic-first design & RTL | ✅ | ❌ |
| Centralized Core Logic | ✅ | ❌ |
| Dual-API Live Pricing | ✅ | ❌ |
| Islamic tools (Zakat, FIRE) | ✅ | ❌ |
| Financial journey roadmap | ✅ | ❌ |
| Native Android + PWA | ✅ | Varies |
| Gamification & streaks | ✅ | ❌ |
| Receivable debt tracking | ✅ | ❌ |
| Free, no ads | ✅ | ❌ |

---

## 🌅 Financial Journey

Fajrak walks users through 5 progressive financial stages:

```
🌅 Awareness  ──►  💳 Debt Repayment  ──►  🛡️ Emergency Fund
──►  📈 Investment  ──►  👑 Financial Freedom
```

Every feature — from alerts to gamification — is designed to move users forward
on this journey.

---

## 🚀 Features

### 🏠 Dashboard

The command center of your financial life.

| Feature | Description |
|:--------|:------------|
| **Financial Health Score** | 0–100 score with 30-day history (Recharts) |
| **Monthly Summary** | Income, expenses, debt payments, net balance |
| **Wealth Simulator** | Projects surplus growth with compound interest |
| **Saving Challenges** | 4 auto-tracked savings challenges |
| **Budget Progress** | Real-time category budget tracking |
| **Quick Add** | One-tap transaction entry with last-transaction repeat |
| **Gamification Card** | Badges, levels, and streaks |
| **Interactive Charts** | Bar chart for income vs. expenses trends |

---

### 💸 Transactions

| Feature | Description |
|:--------|:------------|
| Add / Edit / Delete | Full CRUD with modal form |
| **Recurring Transactions** | Monthly auto-execution via CRON |
| Multi-currency | Exchange rates fetched live |
| Search & Filter | Full-text + type / category / month / year |
| Swipe to Delete | Native gesture on mobile |
| CSV Export | Download your transaction history |
| 10 expense + 5 income categories | Localized in Arabic & English |

---

### 💳 Debt Management

| Feature | Description |
|:--------|:------------|
| **Two-way debt tracking** | Debts you owe + debts owed to you (receivable) |
| **Collapsible sections** | Separate expandable lists for owed vs. receivable |
| Visual progress bars | % paid per debt |
| Auto-deduction | Monthly CRON payment processing |
| Payment history | Full log per debt |
| Confetti celebration | Animation on full repayment |
| Multi-currency | Track debts in any currency |
| Debt-as-income | Record received loans as income |
| **Due date alerts** | Push notifications before receivable debt due dates |

---

### 📊 Smart Budgeting

| Feature | Description |
|:--------|:------------|
| Category budgets | Monthly spending limits per category |
| 50/30/20 Rule | Automatic allocation suggestion |
| Budget vs. actual | Real-time progress tracking |
| Overspend alerts | Notifications when approaching limits (80%, 100%) |
| **Smart Triggers** | Automated database-level monitoring and alerting |

---

### 📈 Investments

| Feature | Description |
|:--------|:------------|
| Asset types | Stocks, ETFs, 15+ cryptocurrencies, other |
| **Dual-API Live Prices** | Real-time market data (Yahoo + Fallback) |
| Halal flag | Islamic investment certification |
| P&L tracking | Profit/loss per holding |
| **Record Buy** | Log buy transactions with shares, price & commission |
| **Record Sell** | Log sell with live P&L preview before confirming |
| **Investment Cash** | Sell proceeds stored separately as portfolio cash |
| **Transfer to Wallet** | Move cash to main wallet with live exchange rate |
| Wealth Simulator | Interactive sliders for return rate, monthly savings |
| Purchase date | Track haul (Islamic year) per investment |

---

### 🔥 FIRE Calculator

Financial Independence, Retire Early simulation.

| Mode | Description |
|:-----|:------------|
| **Lean FIRE** | Minimal lifestyle target |
| **Full FIRE** | Comfortable independence |
| **Fat FIRE** | Abundant lifestyle target |

- Auto-fills from real data: investments + savings goals + debts = net worth
- Compound interest projection with years-to-freedom estimate
- Interactive sliders: return rate, monthly savings, annual expenses

---

### 🌙 Zakat Calculator

A fully automated Islamic obligatory charity calculator.

| Feature | Description |
|:--------|:------------|
| **Centralized Logic** | Calculations handled by Supabase RPC (PostgreSQL) |
| **Auto-fill** | Savings goals → cash, debts → liabilities, investments → assets |
| **Dual-API Metals** | Real-time Gold/Silver prices (Yahoo + FreeGoldAPI) |
| Correct standard | `shares × current_price` for investment valuation |
| Haul countdown | Color-coded per investment (overdue / <30d / <60d / far) |
| Push reminders | Notifications at 30, 7, and 0 days before haul date |
| Manual override | Gold/silver price, Nisab threshold |
| Payment history | Full zakat history log |

---

### 📈 Health Score History

- 30-day trend chart (Recharts on web, fl_chart sparkline on Flutter)
- Daily snapshots stored in `health_score_history`
- Min / avg / max stats below the chart
- CRON job captures snapshot nightly at 11:50 PM

---

### 📄 PDF Monthly Reports

- Print-ready financial report at `/dashboard/pdf-report`
- Month + year selector
- Sections: income/expense summary, category breakdown, transaction table,
  debts, savings goals
- Print CSS hides controls; optimized for A4

---

### 🔔 Smart Notifications

| Channel | Description |
|:--------|:------------|
| **Firebase FCM (Android)** | High-priority background notifications |
| **Web Push** | iOS Safari + desktop browsers |
| **Foreground Notifications** | In-app interactive alerts |
| **Deep Linking** | Direct navigation on notification tap |
| **Granular Control** | User-defined toggle for individual categories (Budget, Debt, Goal) |
| **Privacy Masking** | Optional data masking to hide financial amounts on lock screen |
| **Android Channels** | Native channel support for custom sounds and importance per category |

**Notification schedule:**

| Time | Notification |
|:----:|:------------|
| 6:00 AM | Morning reminder + smart financial alerts |
| 8:00 AM | Auto salary detection (silent) |
| 9:00 AM | Auto debt deduction (silent) |
| 10:00 AM | Zakat haul countdown check |
| 6:00 PM | Evening check-in (if needed) |
| 7:00 PM | Daily wealth tip |
| 11:50 PM | Health score snapshot |
| Friday | Weekly comparison report |

---

### 🎮 Gamification

**6 Levels:**

| Level | Name | Points |
|:-----:|:-----|:------:|
| 1 | Beginner 🌱 | 0–50 |
| 2 | Tracker 🔥 | 50–150 |
| 3 | Saver 💪 | 150–350 |
| 4 | Investor 📈 | 350–700 |
| 5 | Wealth Builder 💎 | 700–1200 |
| 6 | Financially Free 👑 | 1200+ |

**20+ Badges** across 6 categories: Tracking, Saving, Debt, Investment,
Learning, and Wealth.

---

### 📖 Daily Financial Lessons

- Educational financial insights tailored to your current stage
- Islamic lessons on provision and wealth
- Lesson streak tracking
- **Share Lessons 📤:** Dynamically generate styled images to share with one
  tap

---

## ⚙️ Technology Stack

| Layer | Technology | Version | Purpose |
|:------|:----------:|:-------:|:--------|
| **Framework** | Next.js | 16.x | SSR + API routes |
| **UI Library** | React | 19 | Component-based UI |
| **Logic Layer** | Supabase RPC | PL/pgSQL | Centralized Financial Logic |
| **Language** | TypeScript | 5.x | Type safety |
| **Styling** | Tailwind CSS | 3.4 | Utility-first CSS |
| **Database** | Supabase (PostgreSQL) | Latest | Data + Auth + RLS |
| **Push** | Firebase FCM | 12.x | Android notifications |
| **Push (Web)** | Web Push API | — | iOS/desktop notifications |
| **Mobile** | Flutter + Dart | 3.x | Native Android app |
| **Charts** | Recharts | 3.8 | Web charts |
| **Icons** | Lucide React | 0.577 | UI icons |
| **CRON** | GitHub Actions | — | Automated tasks (free) |
| **Hosting** | Vercel | Latest | Web deployment |
| **Monitoring** | Sentry | Latest | Error tracking |
| **Testing** | Jest 30 + Testing Library | — | Unit & integration tests |

---

## 🗄️ Database Schema

| Table | Description |
|:------|:------------|
| `profiles` | User profiles extending auth.users |
| `transactions` | Income & expense records |
| `debts` | Debts (owed + receivable) with `debt_type` field |
| `debt_payments` | Payment history log |
| `investments` | Portfolio holdings |
| `investment_transactions` | Buy/sell history |
| `investment_cash` | Portfolio cash balance from sell proceeds |
| `budgets` | Monthly category limits |
| `alerts` | Smart notification records |
| `savings_goals` | Financial targets |
| `testimonials` | User reviews (public read) |
| `push_subscriptions` | FCM + Web Push tokens |
| `health_score_history` | Daily score snapshots |

---

## 🔄 Automated Workflows

Powered by **GitHub Actions** (free tier):

| Workflow | Schedule | Description |
|:---------|:--------:|:------------|
| `smart-notifications.yml` | 6AM, 8AM, 9AM, 6PM (UTC+3) | Push notifications |
| `auto-salary.yml` | 8AM daily | Auto salary injection |
| `auto-debt.yml` | 9AM daily | Auto debt deduction |

---

## 📱 Mobile App

Native Android app built with Flutter, available on Google Play (Closed Testing).

[![Google Play](https://img.shields.io/badge/Google_Play-Closed_Testing-4285F4?style=for-the-badge&logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.fajrak.app)

**Flutter packages:**

| Package | Version | Purpose |
|:--------|:-------:|:--------|
| `supabase_flutter` 2.9 | — | Database + Auth |
| `firebase_messaging` 15.x | — | Push notifications |
| `fl_chart` 0.70 | — | Charts & graphs |
| `easy_localization` 3.0 | — | Arabic/English i18n |
| `provider` 6.1 | — | State management |
| `shimmer` 3.0 | — | Loading animations |
| `flutter_dotenv` 6.0 | — | Environment variables |

**22 screens** with 100% feature parity to the web app.

---

## 🌍 Internationalization

Full localization for **Arabic** (RTL) and **English** (LTR) across web and mobile.

### Web (Next.js)

Custom translation system in [`lib/i18n.tsx`](lib/i18n.tsx):

```typescript
import { useTranslation } from '@/lib/i18n';

const { t, lang } = useTranslation();

// Translate a key
<span>{t('dashboard_title')}</span>

// Conditional by language
<span>{lang === 'ar' ? 'مرحبا' : 'Hello'}</span>
```

To add a new key, update both `en` and `ar` objects in [`lib/i18n.tsx`](lib/i18n.tsx):

```typescript
export const en = { your_key: 'Your text' };
export const ar = { your_key: 'النص بالعربية' };
```

### Mobile (Flutter)

Uses `easy_localization` with JSON files:

```
assets/i18n/en.json   ← English
assets/i18n/ar.json   ← Arabic
```

```dart
Text('nav_dashboard'.tr())
```

---

## 🔐 Security

| Feature | Implementation |
|:--------|:--------------|
| **Row Level Security** | All Supabase tables — users see only their own data |
| **Auth Middleware** | `proxy.ts` protects all `/dashboard/*` routes |
| **CRON Secret** | API endpoints validate `Authorization` header |
| **Firebase Admin** | Server-only SDK for secure push notifications |
| **Environment Variables** | All secrets in `.env.local`, never committed |
| **No Hardcoded Keys** | All credentials removed from source code |
| **Error Monitoring** | Sentry for real-time error tracking |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Firebase](https://firebase.google.com) project (for push notifications)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Fill in your Supabase, Firebase, and Sentry credentials

# 4. Run database migrations
# Apply files in supabase/migrations/ in order via Supabase SQL editor

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Firebase (Web)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin (Server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# CRON Security
CRON_SECRET=

# External APIs
TWELVE_DATA_API_KEY=

# Sentry
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
```

### Flutter Setup

```bash
cd mobile/fajrak_flutter

# 1. Install dependencies
flutter pub get

# 2. Add Firebase config
# Download google-services.json from Firebase Console
# Place at: android/app/google-services.json

# 3. Configure environment
cp .env.example .env
# Fill in Supabase + Firebase credentials

# 4. Run on device
flutter run

# 5. Build release APK
flutter build apk --release
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

| Module | Coverage |
|:-------|:--------:|
| **Overall Coverage** | **80.26%** |
| `types/index.ts` | 100% |
| `lib/currencies.ts` | 100% |
| `lib/cron-auth.ts` | 100% |
| `lib/cache.ts` | 83.33% |
| `lib/currency.ts` | 82.35% |
| `lib/haptic.ts` | 83.33% |
| `lib/push-send.ts` | 96.77% |
| `lib/user-context.tsx` | 96.29% |
| `lib/i18n.tsx` | 72.97% |

Tests are located in [`__tests__/`](__tests__/) and use Jest + React Testing Library.

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Auth: Login, Register, Onboarding, Forgot Password
- [x] Transactions: Full CRUD, Recurring, Multi-currency, CSV Export
- [x] Debt Management: Auto-deduction, Progress, Confetti
- [x] **Receivable Debts: Two-way tracking with collapsible sections**
- [x] **Investment Sell: Record sell with P&L preview (Robinhood-style)**
- [x] **Investment Cash: Portfolio cash balance with transfer to main wallet**
- [x] **Investment Dashboard: Full page with live prices, portfolio stats & wealth simulator**
- [x] **Recurring Transactions: Automated execution with full CRUD and mobile screen**
- [x] **Net Worth Card: Real-time total assets vs liabilities tracking (web + mobile)**
- [x] **Budget Alerts: Overspend detection with push notifications**
- [x] **Auto Debt Deduction: payment_day scheduling with auto_deduct flag**
- [x] **Debt Enhancements: Auto-deduct badge, overdue indicator, days-until-payment countdown**
- [x] Smart Budgeting: 50/30/20 Rule, Category limits
- [x] Investments: Live prices, Halal flag, P&L
- [x] Savings Goals: Progress tracking, Icon/color
- [x] Smart Alerts: Warning, motivation, reminder, achievement
- [x] Push Notifications: FCM + Web Push + Deep linking
- [x] Financial Health Score + 30-day history
- [x] FIRE Calculator: Lean / Full / Fat FIRE
- [x] Zakat Calculator: Auto-fill + Haul countdown + Push reminders
- [x] Monthly PDF Reports: Print-ready A4
- [x] Gamification: 20+ badges, 6 levels, streaks
- [x] Islamic Daily Lessons
- [x] Native Flutter Android App
- [x] PWA: Installable on all platforms
- [x] Internationalization: Arabic + English, RTL support
- [x] Google Play: Submitted for Closed Testing
- [x] Sentry: Error monitoring
- [x] Dynamic Testimonials: Supabase-backed reviews
- [x] Download Page: Professional APK distribution page
- [x] GitHub Actions CRON: Replaced Vercel CRON (free tier)

### 📋 In Progress

- [ ] Subscription System (Paddle/Stripe)
- [ ] AI Financial Advisor (GPT integration)

---

## 📝 Changelog

### v3.35.4 — 2026-05-03 *(Auth Lock Fix)*

| Change | Description |
|:-------|:------------|
| 🔒 **Supabase Client Singleton** | `createClient()` now returns a single shared instance, preventing multiple `GoTrueClient` initializations from racing over the Navigator Lock on page load. |
| 🔒 **Auth Context Lock Fix** | Removed redundant `getUser()` call in `UserProvider` that competed with `onAuthStateChange` for the same auth lock; initial session is now sourced exclusively from the `INITIAL_SESSION` event. |

### v3.35.3 — 2026-05-03 *(Data Sync & UX Fixes)*

| Change | Description |
|:-------|:------------|
| 🐛 **Web Balance 0 Fix** | Dashboard now falls back to monthly net when all accounts show 0 balance (unlinked transactions or no opening balance), instead of displaying a misleading +0. |
| 🐛 **RPC Broken Column Fix** | Migration 038 ensures `deleted_at` columns exist on `transactions` and `accounts` before `get_account_balances` references them — fixes "column t.deleted_at does not exist" error. |
| 🔔 **Push Prompt Fix** | Notification banner no longer reappears after the user clicks "Later" — `useMemo` stabilises the Supabase client reference and the dismissed check runs first. |
| 📱 **Flutter Dashboard Resilience** | `fetchMonthlyFinancialSummary` extracted from `Future.wait` with a local fallback — a failing RPC no longer crashes the entire dashboard load. |
| ✏️ **Flutter Transaction Edit** | Auto-added transactions (e.g. recurring/debt) are now editable: added a visible edit icon, replaced `GestureDetector` with `InkWell` for tap feedback, and unified category lists so custom categories are preserved on edit. |
| 🔧 **RPC Error Logging** | `useAccounts` now logs `get_account_balances` failures to the console for easier debugging. |

### v3.35.2 — 2026-05-03 *(Splash Screen Fix)*

| Change | Description |
|:-------|:------------|
| 🐛 **Splash i18n Fix** | Fixed missing `easy_localization` import in `splash_screen.dart` that caused `tr()` to be undefined, breaking the app logo semantic label. |

### v3.35.1 — 2026-04-30 *(Debt Logic Parity & Bug Fixes)*

| Change | Description |
|:-------|:------------|
| 🔄 **Web Debt Parity** | Web debt form now matches Flutter: `auto_deduct` hidden for receivable debts; `paid_from_account` defaults to `true` for new receivable debts and resets correctly on type switch. |
| 📝 **Old Debt Hint** | Both web and Flutter now show a clear description when `paid_from_account` is unchecked: "No deduction — suitable for old debts before using the app". |
| 🐛 **Auto-Deduct Description** | `auto_deduct` toggle now shows a subtitle explaining it deducts monthly on the specified day (not immediately). |
| 🔧 **FCM Web Fix** | Prevented 401 FCM error on Flutter web by short-circuiting `saveToken()` when running on web. |
| 💥 **Splash Crash Fix** | Fixed `dependOnInheritedWidgetOfExactType` crash by deferring `_checkUser()` to `addPostFrameCallback`. |
| ⚡ **Auto-Debt Cron Fix** | Receivable debt repayments now correctly create `income` transactions (was incorrectly `expense`). |

### v3.35.0 — 2026-04-30 *(Smart Debt Source)*

| Change | Description |
|:-------|:------------|
| 💡 **Smart Debt Source** | When adding a new debt, users are now asked whether the amount was paid/received from their current account balance. If yes, a matching transaction is created automatically (expense for "receivable" debts, income for "owed" debts). Pre-app debts skip this and leave the balance unchanged. Available on both Web and Flutter. |

### v3.34.0 — 2026-04-28 *(Salary Sync Fix)*

| Change | Description |
|:-------|:------------|
| 🐛 **Salary Sync Fix** | When updating salary in Settings, the existing salary transaction for the current month is now updated to match — fixing the stale income shown on the Dashboard after onboarding. |
| 📱 **Flutter Parity** | Applied the same salary-sync fix to the Flutter app (`profile_form.dart`) — covers both Arabic and English categories, safe month-boundary calculation, and auto-creates a transaction if none exists for the current month. |

### v3.33.0 — 2026-04-26 *(Dashboard UI Redesign)*

| Change | Description |
|:-------|:------------|
| 🎨 **Dashboard UI Redesign** | Rebuilt `Cards`, `HeroBalanceCard`, and `NetWorthCard` components with modular CSS — cleaner structure and maintainable styles. |
| 🏠 **Landing Page Redesign** | Complete overhaul of `LandingPageClient` with new layout and modular CSS architecture. |
| 📄 **New Pages** | Added Debts and Investments dashboard pages with initial routing setup. |
| 🔐 **Supabase Middleware** | Added Supabase session middleware for secure authenticated route handling. |
| 📱 **Mobile: Investment Widget** | Enhanced `investment_list_item` with improved layout and clearer data display. |
| 🔧 **Proxy Refactor** | Updated proxy implementation for improved type safety. |

### v3.32.14 — 2026-04-23 *(Package Updates)*

| Change | Description |
|:-------|:------------|
| 📦 **Package Updates** | Updated 10 Flutter packages: `build_runner` 2.14.0, `flutter_dotenv` 6.0.1, `package_info_plus` 10.1.0, `share_plus` 13.1.0, and others. Flutter engine upgraded to 3.41.7. |

### v3.32.13 — 2026-04-19 *(UX & Error Handling)*

| Change | Description |
|:-------|:------------|
| 🔔 **User-Friendly Errors** | Auth errors (wrong credentials, unconfirmed email, rate limit) now show friendly inline messages instead of raw exception text. Removed "Error Details" button that exposed technical error strings to users. |
| 🎨 **Error Banner** | New `AuthErrorBanner` widget with Material 3 error colors and icon — used in Login and Register screens. |
| 🖼️ **Settings Share Icon** | Share section in Settings now shows the actual app logo (with rounded corners, dark/light adaptive) instead of a generic landscape icon. |
| 🔗 **Share Link** | Updated share message link to `https://fajrak.com/download` in both Arabic and English. |
| 📦 **Package Updates** | `supabase_flutter` → 2.12.4, `dart_jsonwebtoken` → 3.4.1. |

### v3.32.12 — 2026-04-19 *(Performance & Sync Badges)*

| Change | Description |
|:-------|:------------|
| ⚡ **Dashboard Performance** | Removed `force-dynamic` from 9 client pages, added `useMemo` to expensive components (`ChallengesCard`, `FinancialHealthCombined`, `HeroBalanceCard`). |
| 🔄 **Dashboard RPC** | Consolidated 3 separate Supabase queries (alerts count, goals target, debt commitments) into `get_financial_dashboard` RPC — 3 fewer network requests per dashboard load. |
| 📶 **Sync Status Badges** | Flutter transactions screen now shows real-time sync status badges (🟠 pending, 🔴 failed) per transaction, with pending count in AppBar and pull-to-refresh triggering full sync. |
| 🧪 **Test Fix** | Fixed failing alerts duplicate-prevention test — mock data was missing the "no transactions this week" alert title. |

### v3.32.11 — 2026-04-18 *(Bug Fixes & Accessibility)*

| Change | Description |
|:-------|:------------|
| 🐛 **Rage Click Fix** | Onboarding Step 1 "Next" button now shows loading state and is disabled during DB submission — prevents duplicate profile/transaction inserts on slow connections. |
| 🔒 **i18n-server Hardening** | `getServerLang` and `getServerTranslation` now guard against Turbopack dev-mode `cookieStore.get is not a function` and `ReferenceError: getServerLang is not defined` crashes. |
| ♿ **ARIA Fix** | Fixed `aria-pressed="{expression}"` warnings on month-selector and category buttons in budgets page — now renders literal `"true"`/`"false"` strings. |
| 🎨 **No Inline Styles** | Converted all `style={{}}` props to Tailwind in `budgets/page.tsx` and `onboarding/page.tsx`. |

### v3.32.10 — 2026-04-16 *(Flutter UI/UX Fixes)*

| Change | Description |
|:-------|:------------|
| 🎨 **ModalBottomSheet** | Fixed hardcoded background colors (`cardColor`, `AppColors.surface0`) → `colorScheme.surface` in accounts and investments screens. |
| 📊 **Charts Fix** | Fixed dashboard charts crash — `'expense'` key mismatch corrected to `'expenses'`, added `percentage` field to category data. |
| ⚠️ **Error States** | Added clear error UI with retry button in `transactions_screen` when network fails. |
| 💀 **Skeleton Loader** | Replaced manual loading containers in `recurring_screen` with `ListSkeleton` (shimmer animation). |

### v3.32.9 — 2026-04-16 *(Android Build & UX)*

| Change | Description |
|:-------|:------------|
| 🔧 **Android Build Fix** | Upgraded `compileSdk` to 36, `sqlcipher_flutter_libs` to 0.7.0, `package_info_plus` to 10.0.0, `share_plus` to 13.0.0 — resolves `lStar` AAPT error and SDK 36 plugin warnings. |
| 📱 **Edge-to-Edge** | Updated `MainActivity.kt` to use `WindowCompat.setDecorFitsSystemWindows` — removes deprecated `setStatusBarColor`/`setNavigationBarColor` Play Console warnings. |
| 🔐 **Password Checklist** | Added real-time password requirements indicator on register screen (uppercase, lowercase, number, symbol, character count) — matches web implementation. |

### v3.32.8 — 2026-04-15 *(Performance & UI Consistency)*

| Change | Description |
|:-------|:------------|
| 🎨 **AppColors System** | Added 12 new semantic color constants (surface0/1/2, successLight/Dark, sky, gold/silver/bronze, textTertiary/Disabled, warningDark) — 86 hardcoded `Color(0xFF...)` replaced across all files. |
| ⚡ **Layout Performance** | Replaced `GridView` + `shrinkWrap: true` with `Wrap` in BadgeGrid, BadgesGrid, ChallengesCard — eliminates double-layout pass inside scroll views. |
| 🔁 **Build Optimization** | `HelpScreen` FAQ list now built once in `didChangeDependencies` instead of on every `build()` call; same for `ChallengesCard` challenge list. |

### v3.32.7 — 2026-04-15 *(Performance & Android 15 Edge-to-Edge)*

| Change | Description |
|:-------|:------------|
| ⚡ **Startup Speed** | Parallelized `.env` + `EasyLocalization` init; deferred `NotificationService` after `runApp()`. |
| 🗂️ **Lazy Tab Loading** | `MainScreen` now builds each tab only on first visit — reduces cold-start memory by ~70%. |
| 🖼️ **Repaint Isolation** | Added `RepaintBoundary` around charts and heavy widgets to prevent unnecessary redraws. |
| 🤖 **Android 15 Compliance** | Full edge-to-edge support via `enableEdgeToEdge()` + `WindowInsetsController`; removed deprecated `setStatusBarColor`/`setNavigationBarColor` APIs. |
| 🎨 **UI Theming** | Replaced all remaining hardcoded colors across Debts, Budgets, Investments, Transactions, and Goals screens with `ColorScheme` tokens. |
| 📦 **Bundle Size** | Removed unused `google_fonts` and `cached_network_image` packages. |

### v3.32.6 — 2026-04-15 *(UX & Security Hardening)*

| Change | Description |
|:-------|:------------|
| 🎨 **UX & Security Hardening** | Implemented `ConfirmDialog` for all destructive actions (Budgets, Goals, Recurring). |
| 🛡️ **ARIA Accessibility** | 100% coverage for icon-only buttons with descriptive `aria-label` tags. |
| 🎯 **Smart Autofocus** | Automatic keyboard focus on primary inputs for all forms (Auth, Transactions, Management). |
| 🧪 **Test Stability** | Fixed cross-platform type mismatches in transaction test suites. |

### v3.32.5 — 2026-04-14 *(Internationalization)*

| Change | Description |
|:-------|:------------|
| 🌐 **100% i18n Coverage** | Refactored Help Center, FIRE Calculator, and Zakat Calculator to use the central `t()` translation function. |
| 🧹 **Cruft Removal** | Cleaned up duplicate keys in Arabic and English locale files to prevent TypeScript build failures. |
| 🛡️ **Type Safety** | Updated the `t()` signature to return `any`, unlocking robust support for localized arrays like Help Center FAQs. |

### v3.32.4 — 2026-04-14 *(Performance & Testing)*

| Change | Description |
|:-------|:------------|
| 🦴 **Unified Skeletons** | Implemented consistent pulse-loading states across all dashboard cards, charts, and transaction lists on both Web and Mobile. |
| 🧪 **Integration Testing** | Reached 100% pass rate on all 240+ tests, including critical serverless API routes (`budget-alerts`, `auto-debt`, `cron-auth`). |
| 🐛 **Logic Fix (Critical)** | Resolved a logical error in the `auto-debt` API where manual reminders were incorrectly skipped in specific scenarios. |
| 🛠️ **Dev Experience** | Integrated **Task Master AI** for streamlined goal tracking and development workflow automation. |
| 🔧 **TS Stability** | Fixed strict TypeScript type mismatches in core test suites and mocked Supabase chaining with `chainProxy`. |

### v3.32.3 — 2026-04-11 *(Dashboard Customization)*

| Change | Description |
|:-------|:------------|
| ⚙️ **Dashboard Customization (Web)** | Added toggle show/hide for all 14 dashboard cards — persisted to localStorage with smart defaults |
| ⚙️ **Dashboard Customization (Flutter)** | Ported to Flutter using `Provider` + `SharedPreferences` — bottom sheet with adaptive switches |
| 🔒 **Required Card Guard** | Quick Add is always visible; hiding the last optional card is prevented |
| 🌐 **i18n** | Added 20 new keys for customizer UI (`dash_customize_*`, `dash_card_*`) in both AR + EN |

### v3.32.2 — 2026-04-11 *(i18n & UX Fixes)*

| Change | Description |
|:-------|:------------|
| 🌐 **i18n Critical Fix** | Fixed 50+ Arabic strings appearing in English mode — `en` translation object had Arabic values for notification, roadmap, and recurring keys |
| 🛡️ **i18n Guard** | Added runtime fallback in `t()` that detects Arabic text in English translations and skips them |
| 🎯 **Goal Validation** | Goals form now shows field-specific error messages and maps Supabase errors to human-readable text |
| 📖 **Onboarding Fix** | Tour was always showing Arabic — fixed by using `currentLang` instead of `lang` (which can be `'system'`) |
| ⚠️ **Calculator Disclaimer** | Added dismissible disclaimer to FIRE and Zakat calculators (web + Flutter) with "don't show again" option |
| 🗑️ **Flutter Cleanup** | Removed stale Hive-generated `.g.dart` files (`debt`, `goal`, `profile`, `transaction`) that caused 40 analyzer errors |
| 📝 **Flutter i18n** | Added 5 missing keys in Flutter `en.json`: goal validation errors + debt FAQ |

### v3.32.1 — 2026-04-10 *(Security & Notifications Fix)*

| Change | Description |
|:-------|:------------|
| 🔒 **API Security** | Protected `stock-price`, `zakat/prices`, and `gamification` routes with Bearer token auth — previously open to unauthenticated access |
| 🔔 **Notifications Fix** | Fixed cron jobs blocked by 307 redirect — daily/evening reminders now deliver reliably |
| 🔑 **CRON_SECRET Hardened** | Replaced weak secret with 64-char random hex — eliminates brute-force risk |

### v3.32.0 — 2026-04-09 *(Latest — Stability & Enhancements)*

| Change | Description |
|:-------|:------------|
| 🚀 **Stability Boost** | Optimized app performance and general stability for upcoming store release |
| ⚖️ **Balance Accuracy** | Refined financial balance calculation logic for 100% accuracy across accounts |
| 🛡️ **Memory Management** | Full audit of auth screen controllers to prevent potential memory leaks |
| ✨ **UI Polish** | Minor user interface refinements and fix for various linting warnings |

### v3.32.0 — 2026-04-10 *(Performance & UX Polish)*

| Change | Description |
|:-------|:------------|
| ⚡ **Dashboard Speed** | Eliminated waterfall requests — all dashboard data now fetched in a single parallel batch (30-50% faster initial load) |
| 🏦 **Accounts Balance Parity** | Web accounts page now uses the same `get_account_balances` RPC as Flutter — identical numbers across platforms |
| 🖼️ **Image Optimization** | Sidebar logo migrated to `next/image` for automatic WebP/AVIF serving and zero layout shift |
| 🛡️ **Edge Auth Middleware** | Added `proxy.ts` edge middleware — auth session validated on Vercel Edge before any JS loads |
| 🎨 **UX Polish** | Skeleton loaders on all pages, confirm dialog replacing browser `confirm()`, aria-labels on icon buttons, `autoFocus` on all forms |
| 📱 **Flutter Safe Area** | Added `useSafeArea: true` to all 12 bottom sheets — prevents overlap with home indicator on modern iPhones/Android |
| 🔄 **Parallel Price Refresh** | Investment price refresh now uses `Future.wait()` instead of sequential loop — N× faster for large portfolios |
| 📋 **Makefile** | Added Flutter `Makefile` — `make doctor` runs full health check (analyze + test) |

### v3.31.0 — 2026-04-08 *(Quality & Stability)*

| Change | Description |
|:-------|:------------|
| 🛡️ **Double-Submit Protection** | Comprehensive guard across all 9 save buttons/dialogs — eliminates duplicate transaction risk from rapid taps |
| 🔧 **finally on All Saves** | Added `finally` blocks to re-enable save buttons on error — previously they stayed disabled forever if DB failed |
| 🧹 **Memory Leak Fix** | Added proper `dispose()` for `TextEditingController` in Login and Register screens |
| ⚖️ **Balance Display Fix** | Dashboard now correctly shows total account balance from `get_account_balances` RPC instead of monthly net |
| 🔔 **Web FCM Non-Fatal** | Flutter web FCM token failure on localhost is now a non-fatal warning instead of a crash |

### v3.30.2 — 2026-04-07

| Change | Description |
|:-------|:------------|
| ⚙️ **Calculations Engine Parity** | Centralized financial calculations (Net Worth, Health Score) at the database layer (PostgreSQL RPC). Flutter mobile and Web dashboard now read identical synced calculations. |
| 🛡️ **Transactions UI Fixes** | Aligned the calculation of total expected income fallback in the dashboard to match transaction list net values seamlessly. |
| ✅ **Test Integrity** | Restored notification system test suite compatibility with security-hardened admin clients. |

### v3.30.1 — 2026-04-06

| Change | Description |
|:-------|:------------|
| 🐛 **Notification Fix** | Fixed missing Flutter push notifications by correcting FCM token registration logic |
| 🏗️ **Build Stability** | Resolved Next.js environment variables build errors and updated Flutter AGP to 8.9.1 |
| 🚀 **Release Ready** | Fixed Android App Bundle (AAB) generation for Google Play deployment |

### v3.30.0 — 2026-04-05 *(Intelligent Notification System)*

| Change | Description |
|:-------|:------------|
| 🔔 **Smart Notifications** | **Intelligent Notification Platform**: Full-scale upgrade with multi-channel support, database-level triggers, and rich rich payloads. |
| 🛡️ **Privacy Masking** | Added "Data Masking" toggle to hide sensitive financial amounts on lock screen notifications. |
| ⚙️ **Granular Controls** | New **Notification Settings** screen allowing users to toggle specific alert categories (Budget, Debt, Goal). |
| 🚀 **Edge Functions** | Implemented Supabase Edge Functions for reliable, high-performance FCM push delivery. |

### v3.29.0 — 2026-04-04

| Change | Description |
|:-------|:------------|
| 🔧 **Flutter Lint Fixes** | Resolved all `use_build_context_synchronously` warnings in `PreferencesSection` — safer async context usage |
| 🎨 **UI Polish** | Replaced piggy bank icon (`savings_outlined`) with wallet icon (`account_balance_wallet_outlined`) in profile settings |
| 🏗️ **Build Stability** | Deleted stale `.next/dev/types/` auto-generated files that caused spurious TypeScript errors on clean checkout |

### v3.28.0 — 2026-04-04 *(Draft Uploaded — Build 1)*

| Change | Description |
|:-------|:------------|
| 🧪 **Test Coverage** | Reached **80.26%** unit test coverage (+70% improvement from 10.21%) |
| ✅ **225 Tests** | Added comprehensive tests for hooks and components |

### v3.27.0 — 2026-04-03

| Change | Description |
|:-------|:------------|
| 🔔 **Notification Badges** | Fixed unread alerts counter on app icons for PWA (Web/Desktop) and native mobile apps. |
| 🌍 **System Preferences** | Added "System Default" support for application language and dark/light themes. |
| 🔧 **SSR Hydration** | Resolved complex hydration mismatch errors during Next.js server-side rendering for localized components. |

### v3.26.0 — 2026-04-03 *(Active on Google Play — Build 17)*

| Change | Description |
|:-------|:------------|
| 📊 **Month Summary Card** | Auto-dismissable banner on days 1–7 showing previous month's income, expenses, and savings rate — web + Flutter. |
| ← **Month Navigator** | Replaced month/year dropdowns with a clean `‹ March 2025 ›` nav bar in Transactions. Tap label to jump to any month. |
| ⚡ **Debt Separation** | Dashboard and Transactions now separate debt repayments from regular expenses with distinct sub-badges. |
| 🐷 **Islamic Compliance** | Replaced all `Icons.savings` (piggy bank) with `Icons.account_balance_wallet` across 7 Flutter screens. |
| 🔧 **TypeScript Fix** | Resolved `TranslationKey` strict-union type mismatch on `MonthSummaryBanner` component. |

### v3.25.0 — 2026-04-03

| Change | Description |
|:-------|:------------|
| 🏗️ **Core Logic** | **Centralized Financial Engine**: Migrated all core calculations (Net Worth, Zakat, Balances) to Supabase RPC (PostgreSQL) for 100% mathematical consistency across platforms. |
| 💎 **Dual-API Prices** | **Live Pricing Standard**: Implemented "Gold Standard" pricing with automated failover (Yahoo Finance → FreeGoldAPI) for metals and background sync for investments. |
| 🏦 **Accounts v2** | Enhanced account tracking with centralized transaction summing and real-time net worth calculation. |
| 🛡️ **Technical Audit** | Full documentation and code audit for financial accuracy and Islamic-compliance logic. |

### v3.24.0 — 2026-04-02

| Change | Description |
|:-------|:------------|
| 💎 **Premium UI** | Integrated **Glassmorphism** across Web (sidebar) and Flutter (dashboard). Added glowing effects to hero balance cards. |
| 🧪 **Audit Milestone** | Reached **10.21%** unit test coverage on Web and **100%** on key Flutter financial services. |
| 📱 **PWA Robustness** | Resolved `beforeinstallprompt` event warnings and optimized install prompt logic. |
| 🛡️ **Technical Polish** | Fixed CSS linting issues and improved error handling for production stability. |

### v3.22.0 — 2026-04-02

| Change | Description |
|:-------|:------------|
| ⚡ **Progressive Loading** | Dashboard renders in two phases: hero balance card appears instantly from accounts query (~100ms), secondary sections load after full data fetch |
| 🎨 **Hero Balance Card** | 42px count-up animated balance, trend % vs last month, per-account color chips |
| 📐 **Section Reorder** | Hero first, recent transactions promoted above charts, all heavy sections collapsed by default |
| ✨ **Micro-animations** | Count-up with cubic ease-out (900ms), `AnimatedSwitcher` skeleton→content transitions in Flutter |
| 🦴 **Skeleton Screens** | Pulsing skeleton boxes replace full-page spinner in both web and Flutter |
| 📱 **Flutter Parity** | Two-phase loading (`_loadPhase1` / `_loadPhase2`) mirroring web, `_SkeletonBox` shimmer widget |

### v3.21.0 — 2026-04-02

| Change | Description |
|:-------|:------------|
| 🏦 **Accounts System** | Multi-account support: bank, cash, savings, credit card — each with its own balance |
| 💰 **Total Balance Card** | Dashboard hero card showing real-time total balance across all accounts |
| 🔄 **Account Transfers** | Transfer money between accounts with full history tracking |
| 📋 **Accounts Page** | Dedicated page to create, edit, and manage accounts (web + Flutter) |
| 🧾 **Transaction Account** | Every transaction is now linked to a specific account |
| 🗃️ **DB Migration 019** | New `accounts` table, `account_id` on transactions, transfer support, default account trigger |
| 📱 **Flutter Accounts** | Full accounts screen + transfer dialog in Flutter app |

### v3.20.0 — 2026-04-02

| Change | Description |
|:-------|:------------|
| 🌍 **35 Currencies** | Full Arabic, Islamic & global currency support — single source of truth in `lib/currencies.ts` |
| 🔍 **Smart Detection** | Auto-detect user currency from device Timezone/Locale on first login — no API needed |
| 🎯 **Currency Picker** | Searchable grouped modal (web) and bottom sheet (Flutter) replacing hardcoded dropdowns |
| 💱 **Correct Net Worth** | Fixed currency mismatch bug — investments (USD) now converted to user currency before summing |
| 📐 **Decimal Precision** | Correct decimal places per currency (KWD/JOD = 3, JPY = 0, others = 2) |
| 🐛 **Legacy Fix** | Sanitized old `'دولار'` string stored in profiles — now maps correctly to `USD` |
| 🌐 **Investments Screen** | Web currency toggle now uses user's actual currency instead of hardcoded JOD |

### v3.17.0 — 2026-04-01

| Change | Description |
|:-------|:------------|
| 📉 **Record Sell** | Log sell with P&L preview before confirming |
| 💵 **Investment Cash** | Sell proceeds stored as separate portfolio cash |
| 🔄 **Transfer Cash** | Move to main wallet with live exchange rate |
| 🗃️ **Migration 013** | Added `investment_cash` table and upsert RPC |
| 🌐 **i18n** | New translation keys for sell, cash and transfers |
| ⚙️ **Settings Screen** | User profile and asset summary in Flutter |

### v3.16.1 — 2026-03-31

| Change | Description |
|:-------|:------------|
| 📤 **Share Lessons** | Generate and share beautiful daily lesson cards |
| 💳 **Receivable** | Two-way debt tracking with collapsible sections |
| 🔔 **Due Date Alerts** | Push notification before receivable debt due dates |
| 🗃️ **DB Migration** | Added `debt_type` field to debts table |
| 🌐 **i18n** | Full Arabic/English translations for new debt features |
| 🐛 **Bug Fixes** | Fixed TypeScript errors in health-score and debts page |

### v3.15.0 — 2026-03-30

| Change | Description |
|:-------|:------------|
| 🔄 **Technical Fixes** | Resolved spinner issues across all screens |
| 📊 **Smart Categories** | Separated income/expenses, added 7 new categories |
| 🌄 **Unified Identity** | Synced version with Google Play, updated logo |
| 📱 **Download Page** | Professional APK download page at `/download` |
| 🌐 **Landing Page** | Dynamic testimonials from Supabase, improved CTAs |
| 🔍 **Monitoring** | Added Sentry error tracking |
| ⚙️ **CRON Optimization** | GitHub Actions runs only at specific hours |

### v3.10.0 — 2026-03-23

| Change | Description |
|:-------|:------------|
| 🚀 **Google Play** | App bundle (.aab) submitted for Closed Testing |
| ⚡ **SEO & Performance** | SSR conversion + database indexes |
| 🌍 **Localization** | 100% translation coverage |
| 🏗️ **Settings Refactor** | Modularized settings components |

### v1.0.0 — 2026-03-23

| Change | Description |
|:-------|:------------|
| 🎉 **Beta Launch** | First version of Fajrak |

---

## 🤝 Contributing

| Type | How |
|:-----|:----|
| 🐛 Bug Report | Open an issue with reproduction steps |
| 💡 Feature Request | Describe the use case in an issue |
| 📖 Documentation | Submit a PR with improvements |
| 🔧 Code | Fork → branch → PR with tests |

---

<div align="center">

## 👨‍💻 Developer

**Abdullah Rafi — Abdoocoder**

[![GitHub](https://img.shields.io/badge/GitHub-Abdoocoder-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Abdoocoder)

*Built with ❤️ from Jordan for the Arab world*

**© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة**

*We all dream of wealth — here the journey begins*

</div>
