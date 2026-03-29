<div align="center">

<img src="public/icon-512.png" alt="Fajrak Logo" width="120" height="120" style="border-radius: 24px;" />

# Fajrak — فجرك

**The First Smart Arabic Personal Finance Manager**

*Your dawn toward financial freedom*

---

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-fajrak.com-FF6B35?style=for-the-badge)](https://fajrak.com)
[![Download APK](https://img.shields.io/badge/📱_Android_APK-Download-38ef7d?style=for-the-badge)](https://fajrak.com/download)
[![Google Play](https://img.shields.io/badge/🎯_Google_Play-Closed_Testing-4285F4?style=for-the-badge)](https://fajrak.com/download)

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FCM-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square)](https://fajrak.com)

---

🇸🇦 [العربية](./README.ar.md) | 🇬🇧 English

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Financial Journey](#-financial-journey)
- [Features](#-features)
- [Technology Stack](#️-technology-stack)
- [Architecture](#️-architecture)
- [Database Schema](#️-database-schema)
- [API Reference](#-api-reference)
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

**Fajrak** (فجرك — "Your Dawn") is a full-stack Arabic-first personal finance platform that guides users from their very first transaction all the way to financial independence.

> **Mission:** Every person deserves full awareness of their financial situation and a clear plan for improvement — regardless of income or level — until they achieve **financial freedom**.
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
| Free, no ads | ✅ | ❌ |

---

## 🌅 Financial Journey

Fajrak walks users through 5 progressive financial stages:

```
🌅 Awareness  ──►  💳 Debt Repayment  ──►  🛡️ Emergency Fund  ──►  📈 Investment  ──►  👑 Financial Freedom
```

Every feature — from alerts to gamification — is designed to move users forward on this journey.

---

## 🚀 Features

### 🏠 Dashboard

The command center of your financial life.

| Feature | Description |
|:--------|:------------|
| **Financial Health Score** | 0–100 score with 30-day history chart (Recharts) |
| **Monthly Summary** | Income, expenses, debt payments, net balance |
| **Wealth Simulator** | Projects surplus growth over time with compound interest |
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
| Visual progress bars | % paid per debt |
| Auto-deduction | Monthly CRON payment processing |
| Payment history | Full log per debt |
| Confetti celebration | Animation on full repayment |
| Multi-currency | Track debts in any currency |
| Debt-as-income | Record received loans as income |

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
- Sections: income/expense summary, category breakdown, transaction table, debts, savings goals
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

**20+ Badges** across 6 categories: Tracking, Saving, Debt, Investment, Learning, and Wealth.

---

### 📖 Islamic Daily Lessons

- Quran verses on provision and wealth
- Hadiths on financial ethics
- Daily supplications
- Personalized by financial stage
- Lesson streak tracking

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
| **CRON** | cron-job.org | Free | Automated tasks |
| **Hosting** | Vercel | Latest | Web deployment |
| **Testing** | Jest 30 + Testing Library | — | Unit & integration tests |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │   Next.js Web App    │    │   Flutter Android App    │   │
│  │  (React 19 + TypeScript) │    │   (Dart 3 + Provider)    │   │
│  │                      │    │                          │   │
│  │  Server Components   │    │  22 Screens              │   │
│  │  Client Components   │    │  Real-time Sync          │   │
│  │  PWA + Service Worker│    │  Firebase FCM            │   │
│  └──────────┬───────────┘    └───────────┬──────────────┘   │
└─────────────┼───────────────────────────┼────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Next.js API Routes (16 endpoints)          │ │
│  │  CRON Jobs  │  Push API  │  Gamification  │  Stock API │ │
│  └──────────────────────────┬─────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│    Supabase     │  │   Firebase   │  │  External APIs   │
│  PostgreSQL DB  │  │  FCM + Auth  │  │  Stock / Forex   │
│  Auth + RLS     │  │              │  │  Exchange Rates  │
│  9 Migrations   │  │              │  │                  │
└─────────────────┘  └──────────────┘  └──────────────────┘
```

**Key Patterns:**
- Server Components for data fetching, Client Components for interactivity
- Context API for global state (user session, theme, language)
- Custom hooks: `useFinancialSummary`, `useTransactions`
- CRON authentication via Vercel secret token

---

## 🗄️ Database Schema

All tables protected with **Row Level Security (RLS)**.

```
profiles              transactions           debts
─────────────         ────────────────       ──────────────
id (uuid) PK          id (uuid) PK           id (uuid) PK
name                  user_id (FK)           user_id (FK)
monthly_income        type                   name
currency              category               amount
timezone              amount                 remaining
plan                  original_amount        monthly_payment
created_at            currency               priority
                      date                   due_date
                      recurring              exchange_rate
                      description

investments           savings_goals          budgets
──────────────        ──────────────         ──────────
id (uuid) PK          id (uuid) PK           id (uuid) PK
user_id (FK)          user_id (FK)           user_id (FK)
symbol                name                   category
name                  target_amount          monthly_limit
type                  current_amount         month / year
shares                target_date
avg_buy_price         icon / color
current_price
is_halal
purchase_date

zakat_history         health_score_history   push_subscriptions
──────────────        ────────────────────   ──────────────────
id (uuid) PK          id (uuid) PK           id (uuid) PK
user_id (FK)          user_id (FK)           user_id (FK)
gold_grams            score                  endpoint
silver_grams          recorded_at            p256dh
cash                                         auth
total_assets
zakat_due
paid_at
```

**Migrations:**

| Migration | Description |
|:----------|:------------|
| 001 | Core tables: profiles, transactions, debts, investments, budgets, goals, alerts |
| 002 | Multi-currency: original_amount, original_currency, exchange_rate |
| 003 | Exchange rate tracking on debts + performance indexes |
| 004 | RLS policies on app_events |
| 005 | Security fix: function search_path |
| 006 | Zakat history table |
| 007 | Health score history table |
| 008 | Push subscriptions table |
| 009 | Investment purchase date (Haul tracking) |

---

## 📡 API Reference

All CRON endpoints require `Authorization: Bearer <CRON_SECRET>`.

| Endpoint | Method | Auth | Description |
|:---------|:------:|:----:|:------------|
| `/api/alerts` | POST | CRON | Generate smart financial alerts |
| `/api/daily-reminder` | POST | CRON | Send morning push notification |
| `/api/evening-reminder` | POST | CRON | Send evening check-in notification |
| `/api/weekly-report` | POST | CRON | Generate and send weekly summary |
| `/api/zakat-reminder` | POST | CRON | Zakat haul countdown notifications |
| `/api/auto-salary` | POST | CRON | Detect and add recurring salary |
| `/api/auto-recurring` | POST | CRON | Execute recurring transactions |
| `/api/auto-debt` | POST | CRON | Process monthly debt payments |
| `/api/health-score-snapshot` | POST | CRON | Record nightly health score |
| `/api/smart-notifications` | POST | CRON | AI-driven contextual alerts |
| `/api/gamification` | POST | User | Update badges and levels |
| `/api/push-subscribe` | POST | User | Register push notification endpoint |
| `/api/push-send` | POST | User | Send a push notification |
| `/api/exchange-rate` | GET | User | Fetch live exchange rates |
| `/api/stock-price` | GET | User | Fetch live stock/crypto prices |
| `/api/testimonials` | GET | Public | Fetch user testimonials |

---

## ⏰ Automated Workflows

Powered by **cron-job.org** (Amman timezone, UTC+3):

| Time | Task | Endpoint |
|:----:|:-----|:---------|
| 6:00 AM | Morning reminders + smart alerts | `/api/daily-reminder` + `/api/alerts` |
| 8:00 AM | Auto salary detection | `/api/auto-salary` |
| 9:00 AM | Auto debt deduction | `/api/auto-debt` |
| 10:00 AM | Zakat haul check | `/api/zakat-reminder` |
| 6:00 PM | Evening reminder | `/api/evening-reminder` |
| 7:00 PM | Smart notifications | `/api/smart-notifications` |
| 11:50 PM | Health score snapshot | `/api/health-score-snapshot` |
| Friday 9:00 AM | Weekly report | `/api/weekly-report` |

---

## 📱 Mobile App

The Flutter app shares the same Supabase + Firebase backend as the web app.

| Platform | Distribution | Status |
|:--------:|:------------:|:------:|
| 🤖 Android | Native APK | [**Download**](https://fajrak.com/download) |
| 🤖 Android | Google Play (Closed Testing) | ✅ Submitted |
| 🤖 Android | PWA / TWA | ✅ Available |
| 🍎 iOS | PWA (Add to Home Screen) | ✅ Available |

**Flutter Tech:**

| Package | Purpose |
|:--------|:--------|
| `supabase_flutter` 2.3 | Database + Auth |
| `firebase_messaging` 16.1 | Push notifications (FCM) |
| `flutter_local_notifications` 21 | Foreground notifications |
| `fl_chart` 1.1 | Charts & sparklines |
| `easy_localization` 3.0 | Arabic/English i18n |
| `provider` 6.1 | State management |
| `shimmer` 3.0 | Loading animations |
| `flutter_dotenv` 6.0 | Environment variables |

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
# Fill in your Supabase and Firebase credentials

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

Tests are located in [`__tests__/`](__tests__/) and use Jest + React Testing Library.

---

## 🗺️ Roadmap

### ✅ Completed

- [x] Auth: Login, Register, Onboarding, Forgot Password
- [x] Transactions: Full CRUD, Recurring, Multi-currency, CSV Export
- [x] Debt Management: Auto-deduction, Progress, Confetti
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
- [x] Native Flutter Android App (54.5 MB APK)
- [x] PWA: Installable on all platforms
- [x] Internationalization: Arabic + English, RTL support
- [x] Google Play: Submitted for Closed Testing

### 📋 In Progress

- [ ] Subscription System (Paddle)
- [ ] AI Financial Advisor (GPT integration)

---

## 📝 Changelog

### v3.15.0+6 — 2026-03-30 *(Latest)*

| Change | Description |
|:-------|:------------|
| 🔄 **Infinite Spinner Fix** | Resolved issues with endless loading states across all screens (Transactions, Alerts, FIRE) |
| 📊 **Category Filtering** | Implemented smart category filtering based on transaction type (Income vs Expense) |
| 🌄 **Branding Update** | Refined app branding with the new sunrise icon `🌄` and updated versioning to v3.15.0 |

### v3.14.0 — 2026-03-25

| Change | Description |
|:-------|:------------|
| 🖼️ **Real App Icon** | Replaced placeholder "₣" letter with the actual app icon across web sidebar, Flutter login screen, and splash screen |
| 📜 **Mobile Nav Scrollable** | Fixed mobile bottom-sheet nav (`maxHeight: 85dvh`, `overflowY: auto`) — prevents overflow on small screens |
| 📜 **More Screen Refactor** | Simplified Flutter More screen from nested `Scaffold → SingleChildScrollView → Container` to a flat `ListView` with a section title |
| ⚡ **Font Optimization** | Removed manual Google Fonts `@import`; changed font `display` to `optional` to eliminate CLS |
| 🔥 **Firebase SW on Android Only** | Firebase messaging service worker now registers only on Android, avoiding unnecessary overhead on iOS/desktop |
| 🔧 **useFinancialSummary Fix** | Memoized Supabase client with `useMemo` to prevent unnecessary re-creation on every render |
| ⚙️ **next.config.mjs** | Added `serverExternalPackages: ['firebase-admin']` for correct server-bundle handling |
| 🔷 **TypeScript ES2022** | Upgraded compiler target from `ES2017` → `ES2022` |

### v3.13.0 — 2026-03-25

| Change | Description |
|:-------|:------------|
| 🔥 **FIRE Calculator** | Financial Independence simulation: Lean/Full/Fat FIRE modes, auto-fills net worth, compound interest projection with interactive sliders — web + Flutter |
| 🌙 **Zakat Calculator** | Auto-fill from real user data; haul countdown per investment with color coding (overdue / 30d / 60d / far) |
| 🔔 **Zakat Push Reminders** | New `/api/zakat-reminder` endpoint — push notifications at 30, 7, and 0 days before haul date |
| 📈 **Health Score History** | 30-day LineChart in Financial Health widget (Recharts web + fl_chart Flutter); new `health_score_history` table |
| 📄 **PDF Monthly Reports** | Print-ready report at `/dashboard/pdf-report` with month selector, category breakdown, transaction table |
| 🗄️ **DB Migrations** | `zakat_history` (006) and `health_score_history` (007) tables with full RLS |

### v3.12.0 — 2026-03-24

| Change | Description |
|:-------|:------------|
| 🚀 **Next.js 16** | Upgraded to 16.2.1 with Turbopack |
| ⚙️ **proxy.ts Convention** | Migrated from `middleware.ts` to `proxy.ts` (Next.js 16 requirement) |
| 🛡️ **Deployment Fix** | Resolved Vercel deployment and committer association issues |

### v3.11.0 — 2026-03-24

| Change | Description |
|:-------|:------------|
| 💎 **UI Modernization** | Premium redesign: gradients, glassmorphism, Cairo typography |
| 🛡️ **Security Alignment** | All secrets migrated to `.env`; `secrets.dart` decommissioned |
| 🎨 **Theme & Hydration** | Fixed primary color and Next.js hydration mismatches |

### v3.10.0 — 2026-03-23

| Change | Description |
|:-------|:------------|
| 🚀 **Google Play** | App bundle (.aab) submitted for Closed Testing |
| ⚡ **SEO & Performance** | SSR conversion + database indexes |
| 🌍 **Localization** | 100% translation coverage |
| 🏗️ **Settings Refactor** | Modularized settings components |

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
