# Fajrak — فجرك 🌅

### The First Smart Arabic Personal Finance Manager

---

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-fajrak.com-FF6B35?style=for-the-badge)](https://fajrak.com)
[![Download APK](https://img.shields.io/badge/📱_Download-APK-38ef7d?style=for-the-badge)](https://fajrak.com/download)
[![GitHub](https://img.shields.io/badge/💻_Source_Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/Abdoocoder/financetracker)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://fajrak.com/)

---

> 🌅 **كلنا نحلم بالثراء — هنا تبدأ الرحلة**
> *We all dream of wealth — here the journey begins*

🇸🇦 [العربية](./README.ar.md) | 🇬🇧 English

---

## ✨ Overview

**Fajrak** is the first smart Arabic personal finance tool that walks with users step by step — from the first transaction they log until they achieve financial freedom.

> **Our Vision:** Every person should have full awareness of their financial situation and a clear plan for improvement — regardless of income or level — until they achieve **financial freedom**.
> 
> Inspired by Islamic values of **effort, work, and contentment** 🕌

### Financial Journey

```
🌅 Awareness → 💳 Debt Repayment → 🛡️ Emergency Fund → 📈 Investment → 👑 Financial Freedom
```

---

## 📸 Screenshots

| Welcome | Login | Register | Settings | More |
|:-------:|:-----:|:--------:|:--------:|:----:|
| 🌅 | 🔐 | 📝 | ⚙️ | 📱 |

---

## 🚀 Core Features

### 🏠 Dashboard
- Monthly summary: Income, Expenses, Net
- **Financial Health Score** — full circle 0-100
- **Wealth Roadmap** — 5 financial stages
- **Wealth Simulator** — calculates surplus growth over time
- **Saving Challenges** — 4 auto-tracked challenges
- **Interactive Charts** with Recharts + Tooltips
- Quick Add with last transaction repeat
- **Premium Design**: Modernized UI with gradients, glassmorphism, and Cairo typography.
- **94% performance boost** with Lazy Loading

### 💸 Transactions
- Add / Edit / Delete transactions
- **Recurring transactions** — monthly auto-execute
- Split into Upcoming and Completed
- Full-text search + Filter by type/month
- Swipe to delete on mobile
- CSV export functionality

### 💳 Debt Management
- Visual progress bar tracking
- Auto monthly deduction (CRON)
- Full payment history
- Confetti celebration on repayment
- Debt received as income option

### 📊 Smart Budgeting
- Auto summary + AI Advisor
- **50/30/20 Rule** — automatic allocation
- Manual spending limits per category
- Budget progress tracking
- Spending breakdown visualization

### 📈 Investments
- Stocks + 15+ cryptocurrencies
- **Live price updates**
- Halal investment support
- Wealth Simulator with interactive sliders
- Portfolio summary view

### 🔔 Smart Notifications
- **Firebase FCM for Android** (High-priority Channels)
- **Interactive Foreground Notifications**
- **Deep Link Navigation** on push click
- Web Push for iOS
- Morning, Evening, Weekly reports
- Smart policy: useful only
- Push subscription management

### 🔥 FIRE Calculator
- Lean / Full / Fat FIRE modes
- Auto-fetches investments, savings goals, and debts for net worth
- Compound interest projection (years to financial independence)
- Interactive sliders for return rate, monthly savings, annual expenses
- Available on both web + Flutter

### 🌙 Zakat Calculator
- **Auto-fill** from real user data: savings goals → cash, debts → liabilities, investments → assets
- Current market price used (`shares × current_price`) — correct Islamic standard
- **Haul countdown** per investment — color-coded (overdue / <30d / <60d / far)
- **Push notifications** at 30, 7, and 0 days before haul date
- Manual override for gold/silver price and Nisab
- Available on both web + Flutter

### 📈 Health Score History
- 30-day trend chart using Recharts (web) and fl_chart sparkline (Flutter)
- Daily snapshots stored in `health_score_history` table
- Shows min / avg / max stats below chart
- Cron job captures snapshot nightly at 11:50 PM

### 📄 PDF Monthly Reports
- Print-ready financial report at `/dashboard/pdf-report`
- Month + year selector
- Sections: income/expense summary, category breakdown, transaction table, debts, savings goals
- Print CSS hides controls; optimized for A4

### 📖 Islamic Daily Lessons
- Quran verses on provision
- Hadiths on financial ethics
- Daily supplications
- Personalized by financial stage
- 25 new scientific lessons

### 🎯 Gamification
- Level system based on health score
- Achievement badges
- Lesson streak tracking
- Financial challenges

---

## 📱 Mobile Platforms

| Platform | Type | Status |
|:--------:|:----:|:------:|
| 🤖 Android | Native Flutter App | [**Download APK**](https://fajrak.com/download) |
| 🤖 Android | PWA / TWA APK | ✅ Available |
| 🍎 iOS | PWA (Add to Home Screen) | ✅ Available |

---

## ⚙️ Technology Stack

| Technology | Usage | Version |
|:----------:|:-----:|:-------:|
| ⚡ Next.js | Framework + SSR | 16.2.1 |
| 🔷 TypeScript | Type Safety | 5.x |
| 🗄️ Supabase | Database + Auth + RLS | Latest |
| 🔥 Firebase | Push Notifications FCM | Latest |
| 📱 Flutter | Native Android App | 3.x |
| 🚀 Vercel | Hosting | Latest |
| 📊 Recharts | Interactive Charts | Latest |
| ⏰ cron-job.org | CRON Jobs | Free |

---

## 🗄️ Database Architecture

All tables are protected with **Row Level Security (RLS)**:

| Core Tables | Financial | System |
|:------------|:----------|:-------|
| profiles | investments | alerts |
| transactions | budgets | push_subscriptions |
| debts | savings_goals | user_stats |
| debt_payments | zakat_history | testimonials |
| | health_score_history | |

---

## ⏰ Automated Workflows

Powered by **cron-job.org** (Amman timezone UTC+3):

| Time | Task | Status |
|:----:|:-----|:------:|
| 6:00 AM | Morning reminders + smart alerts | ✅ Active |
| 8:00 AM | Auto salary detection (silent) | ✅ Active |
| 9:00 AM | Auto debt deduction (silent) | ✅ Active |
| 10:00 AM | Zakat haul countdown check | ✅ Active |
| 6:00 PM | Evening reminder (if needed) | ✅ Active |
| 7:00 PM | Daily wealth tip | ✅ Active |
| 11:50 PM | Health score history snapshot | ✅ Active |
| Friday | Weekly comparison report | ✅ Active |

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.local.example .env.local

# 4. Start development server
npm run dev
```

> ⚠️ **Environment Setup:** Configure your `.env.local` with Supabase and Firebase credentials before running.

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
| lib/cache.ts | 83.33% |
| types/index.ts | 100% |
| lib/currency.ts | 30.76% |

---

## 🌍 Internationalization (i18n)

**Fajrak** supports full localization for **English** and **Arabic** across both the web application (Next.js) and mobile app (Flutter).

### 🌐 Supported Languages

| Language | Code | Direction |
|:---------|:----:|:---------:|
| 🇬🇧 English | `en` | LTR |
| 🇸🇦 Arabic | `ar` | RTL |

### 📱 Next.js Web Application

The web app uses a custom translation system in [`lib/i18n.tsx`](lib/i18n.tsx).

#### How It Works

```typescript
import { useTranslation } from '@/lib/i18n';

// In your component
const { t, lang } = useTranslation();

// Use the t() function to translate keys
<span>{t('dashboard_title')}</span>

// Access current language
<span>{lang === 'en' ? 'Hello' : 'مرحبا'}</span>
```

#### Adding Translations

1. Open [`lib/i18n.tsx`](lib/i18n.tsx)
2. Add your key to both `en` and `ar` objects:

```typescript
export const en = {
  // ... existing keys
  your_new_key: 'Your English text here',
};

export const ar = {
  // ... existing keys
  your_new_key: 'النص بالعربية هنا',
};
```

#### Best Practices

- Use descriptive, namespaced keys (e.g., `dashboard_welcome`, `settings_profile`)
- Avoid hardcoding strings — always use `t('key')`
- For dynamic content, use string interpolation: `` `Hello ${name}` ``

### 📲 Flutter Mobile Application

The Flutter app uses the `easy_localization` package with JSON translation files.

#### Translation Files

| File | Description |
|:-----|:------------|
| `mobile/fajrak_flutter/assets/i18n/en.json` | English translations |
| `mobile/fajrak_flutter/assets/i18n/ar.json` | Arabic translations |

#### How It Works

```dart
// Import localization
import 'package:easy_localization/easy_localization.dart';

// Translate keys using .tr() extension
Text('trans_add_note_hint'.tr())

// Get current locale
context.locale
```

#### Adding Translations

1. Open the appropriate JSON file
2. Add your key-value pair:

```json
{
  "your_new_key": "Your English text here"
}
```

### 🔑 Common Translation Keys

| Key | English | Arabic |
|:----|:--------|:-------|
| `app_name` | Fajrak | فجرك |
| `dashboard_title` | Dashboard | لوحة التحكم |
| `transactions` | Transactions | المعاملات |
| `add_transaction` | Add Transaction | إضافة معاملة |
| `save` | Save | حفظ |
| `cancel` | Cancel | إلغاء |
| `delete` | Delete | حذف |
| `edit` | Edit | تعديل |
| `settings` | Settings | الإعدادات |
| `help` | Help | المساعدة |

---

## 🔐 Security Features

| Feature | Description |
|:--------|:------------|
| 🛡️ Row Level Security | Database-level access control |
| 🔑 Middleware Auth | Protected dashboard routes |
| 🔒 CRON Secret | API endpoint protection |
| 🔥 Firebase Admin | Secure push notifications |

---

## 🗺️ Roadmap

### ✅ Completed
- [x] Auth + Onboarding + PWA
- [x] Transactions + Debts + Investments + Goals
- [x] Smart Notifications (iOS + Android FCM)
- [x] Budget + Financial Health + Wealth Roadmap
- [x] Gamification + Islamic Lessons
- [x] Native Flutter Android App (54.5 MB Release APK)
- [x] fajrak.com custom domain
- [x] Global Error Handling + Analytics Service
- [x] **FIRE Calculator** — Financial Independence simulation with Lean/Full/Fat FIRE modes
- [x] **Zakat Calculator** — Auto-fill from real data + haul countdown + push notifications
- [x] **Health Score History** — 30-day trend chart on web and Flutter
- [x] **Monthly PDF Reports** — Print-ready financial summary (web)

### 📋 In Progress
- [ ] Subscription System (Paddle)
- [ ] AI Financial Advisor (GPT integration)

---

## 📝 Changelog

### v3.13.0 — 2026-03-25 *(Latest)*

| Change | Description |
|:-------|:------------|
| 🔥 **FIRE Calculator** | Financial Independence calculator with Lean/Full/Fat FIRE modes, auto-fills net worth from investments + savings + debts, compound interest projection with interactive sliders — web + Flutter |
| 🌙 **Zakat Calculator** | Enhanced with auto-fill from real user data (savings → cash, debts → liabilities, investments → assets). Added haul countdown per investment (color-coded: overdue/30d/60d/far) |
| 🔔 **Zakat Push Reminders** | New cron endpoint `/api/zakat-reminder` sends push notifications at 30, 7, and 0 days before haul date for each investment |
| 📈 **Health Score History** | 30-day trend LineChart added to Financial Health widget (web Recharts + Flutter fl_chart sparkline). New `health_score_history` DB table with daily snapshots |
| 📄 **PDF Monthly Reports** | Print-ready financial report page at `/dashboard/pdf-report` with month selector, transaction table, category breakdown, debts, and goals summary |
| 🗄️ **DB Migrations** | Added `zakat_history` (migration 006) and `health_score_history` (migration 007) tables with full RLS |

### v3.12.0 — 2026-03-24

| Change | Description |
|:-------|:------------|
| 🚀 **Next.js 16 Upgrade** | Full migration to Next.js 16.2.1 with Turbopack for improved build speeds |
| ⚙️ **Proxy Convention** | Migrated from `middleware.ts` to the new `proxy.ts` convention required by Next.js 16 |
| 🛡️ **Deployment Fix** | Resolved Vercel deployment metadata and committer association issues |

### v3.11.0 — 2026-03-24

| Change | Description |
|:-------|:------------|
| 💎 **UI Modernization** | Premium redesign with gradients, glassmorphism, and high-visibility typography |
| 🛡️ **Security Alignment** | Migrated all hardcoded secrets to `.env` and decommissioned `secrets.dart` |
| 🎨 **Theme & Hydration** | Corrected primary color and fixed Next.js hydration mismatches |
| ⚙️ **Config Alignment** | Synchronized Firebase credentials across Web and Android environments |

### v3.10.0 — 2026-03-23

| Change | Description |
|:-------|:------------|
| 🚀 **Google Play Publishing** | App bundle (.aab) submitted for closed testing |
| ⚡ **SEO & Performance** | Converted to SSR + database indexes |
| 🌍 **Localization** | 100% translation coverage |
| 🛡️ **Enhanced Security** | RLS on telemetry table |
| 🏗️ **Settings Refactoring** | Modularized components |
| ⚙️ **Android Build Fixes** | Resolved Gradle issues |

### v3.9.0 — 2026-03-22

| Change | Description |
|:-------|:------------|
| 🏗️ **Modular Architecture** | Full overhaul of all 9 screens |
| 💎 **Clean Code Initiative** | 30+ linting issues resolved |
| 🛡️ **Full Project Audit** | Comprehensive health check |
| 📦 **Release APK** | Stable 55.2 MB Android APK |

---

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests.

| Type | Description |
|:-----|:------------|
| 🐛 Report Bugs | Open an issue with reproduction steps |
| 💡 Suggest Features | We'd love to hear your ideas! |
| 📖 Improve Docs | Help us make docs better |

---

<div align="center">

## 👨‍💻 Developer

**Abdullah Rafi — Abdoocoder**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Abdoocoder)

*Built with ❤️ from Jordan for the Arab world*

**© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة**

</div>
