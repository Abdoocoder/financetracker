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

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
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
| Overspend alerts | Notifications when approaching limits |

---

### 📈 Investments

| Feature | Description |
|:--------|:------------|
| Asset types | Stocks, ETFs, 15+ cryptocurrencies, other |
| Live prices | Real-time market data via API |
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
| Auto-fill | Savings goals → cash, debts → liabilities, investments → assets |
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
| **Framework** | Next.js | 16.2.1 | SSR + API routes |
| **UI Library** | React | 19.2 | Component-based UI |
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
| `lib/cache.ts` | 83.33% |
| `types/index.ts` | 100% |
| `lib/currency.ts` | 30.76% |
| `api/health-score-snapshot` | ✅ |

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

### v3.22.0 — 2026-04-02 *(Latest)*

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
