<div align="center">

<img src="https://raw.githubusercontent.com/Abdoocoder/financetracker/main/public/favicon.ico" width="80" height="80" alt="Fajrak Logo" />

# Fajrak — فجرك

**Smart Personal Finance Manager**

[

![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-fajrak.com-3B7EF6?style=for-the-badge&logoColor=white)

](https://fajrak.com/)
[

![Download APK](https://img.shields.io/badge/📱_Android-Flutter_App-3ECF8E?style=for-the-badge&logoColor=white)

](https://fajrak.com/download)
[

![Next.js](https://img.shields.io/badge/Next.js-15.5.12-000000?style=flat-square&logo=nextdotjs)

](https://nextjs.org)
[

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)

](https://typescriptlang.org)
[

![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

](https://supabase.com)
[

![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)

](https://vercel.com)
[

![Flutter](https://img.shields.io/badge/Flutter-Native_Android-02569B?style=flat-square&logo=flutter)

](https://flutter.dev)
[

![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)

](https://fajrak.com/)

---

*We all dream of wealth — here the journey begins*

[🇸🇦 العربية](./README.ar.md) | 🇬🇧 English

</div>

---

## ✨ Overview

> Fajrak is the first smart Arabic personal finance tool that walks with the user step by step — from the first transaction they log until they achieve financial freedom.
>
> **Our Vision:** Every person should have full awareness of their financial situation and a clear plan for improvement — regardless of their income or level — until they achieve financial freedom.
>
> Inspired by Islamic values of effort, work, and contentment 🕌
🌅 Awareness → 💳 Debt Repayment → 🛡️ Emergency Fund → 📈 Investment → 👑 Financial Freedom
---

## 🌟 Features

<table>
<tr>
<td width="50%">

### 🏠 Dashboard
- Monthly summary: Income, Expenses, Net
- **💊🗺️ Financial Health + Wealth Roadmap** — unified component with two tabs
  - Health tab: full circle score 0-100 + detailed bars
  - Roadmap tab: 5 stages + next step + net worth
- **Wealth Simulator Card** — calculates monthly surplus growth 📈
- **Saving Challenges** — 4 auto-tracked challenges 🏆
- **Interactive Charts** with Recharts + Tooltips 📊
- Month-over-month comparison
- Expense breakdown with percentages
- Quick Add with last transaction repeat ⚡
- **Lazy Loading** for heavy components — 94% performance boost

### 💸 Transactions
- Add / Edit / Delete
- **Recurring transactions** — monthly auto-execute 🔁
- Full-text search by description, category, amount 🔍
- Filter by type and month
- Swipe to delete on mobile
- CSV export 📥

### 💳 Debts
- Track with visual progress bar
- **Auto monthly deduction** (CRON) 🤖
- Set payment day per debt
- Full payment history
- ✅ Auto-deducted every month

</td>
<td width="50%">

### 📊 Budget
- Auto summary from app data
- Available = Income − Installments − Goals
- Manual spending limits per category
- Warning 🔶 when approaching, alert ⚠️ when exceeded

### 📈 Investments
- Stocks + 15+ cryptocurrencies
- **Live prices** (CoinGecko + Twelve Data)
- Halal investment support ✅
- **Full Wealth Simulator** with interactive sliders + yearly table

### 🎯 Goals
- Savings goals with progress bar
- Manual payment additions

### 🔔 Smart Notifications
- **6 notification types** throughout the day
- Morning: daily budget + smart alerts
- Evening: only if user hasn't logged today 🤔
- Weekly: this week vs last week comparison 📊
- Salary and debts work **silently** in background
- Push notifications + in-app alerts for all users
- Smart policy: one useful daily notification > ten annoying ones

### ⚙️ Settings
- **Personal Assets** — real estate, vehicles, gold 💎
- **True Net Worth** shown in wealth roadmap
- **Share button** — share app with friends 🔗
- **Forgot password** — reset via email 🔑
- CSV export 📥

### 📖 Islamic Lessons
- Quran verses on provision and gratitude
- Hadiths on financial ethics
- Daily supplications 🕌

</td>
</tr>
</table>

---

## 💊🗺️ Financial Health & Wealth Roadmap

A unified component that analyzes your financial situation:

- 🎯 Full circle score 0-100 with animated progress
- 📊 Detailed bars: Savings, Debt, Emergency, Investing, Tracking
- 🗺️ Current financial stage (1 of 5)
- 👣 Recommended next step with practical details
- 💎 **True Net Worth** = Personal Assets + Investments + Savings − Debts

---

## 💎 Personal Assets

A section in Settings to enter asset values and calculate **true net worth**:
- 🏠 Real estate
- 🚗 Vehicles
- 👑 Jewelry and gold
- 📦 Other assets

---

## 📱 PWA + Android

- 🔔 Web Push for iOS + Firebase FCM for Android ✅
- 📦 Direct APK via TWA (Trusted Web Activity)
- ⚡ Fast performance with Service Worker
- 🔗 [Download Page](https://fajrak.com/download)
- 📱 **Native Flutter App** — full Android app with background notifications

---

## 🗄️ Database Schema
┌─────────────────────────────────────────────────────┐
│                    Supabase Tables                   │
├──────────────────────┬──────────────────────────────┤
│ profiles             │ User data + salary            │
│ transactions         │ Financial transactions        │
│ debts                │ Debts + auto deduction        │
│ debt_payments        │ Debt payment history          │
│ investments          │ Investment portfolio          │
│ investment_transactions │ Investment transactions   │
│ budgets              │ Monthly category budgets      │
│ savings_goals        │ Savings goals                 │
│ alerts               │ Smart notifications           │
│ push_subscriptions   │ Notification subscriptions    │
│ testimonials         │ User reviews                  │
└──────────────────────┴──────────────────────────────┘
> 🔒 All tables protected with **Row Level Security (RLS)**

---

## ⚙️ CRON Jobs — Daily Automation
┌───────────────────────────────────────────────────────────────────────┐
│  ⏰ 6:00 AM  │  smart-notifications  │  Morning + daily budget         │
│  ⏰ 8:00 AM  │  smart-notifications  │  Auto salary (silent)           │
│  ⏰ 6:00 PM  │  smart-notifications  │  Evening reminder (if needed)   │
│  ⏰ Friday   │  smart-notifications  │  Weekly comparison report       │
└───────────────────────────────────────────────────────────────────────┘
> CRONs run via **cron-job.org** (free) — calls `/api/smart-notifications` at set times in Amman timezone.

---

## 🛠️ Tech Stack

<div align="center">

| Technology | Usage | Version |
|:----------:|:-----:|:-------:|
| 

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white)

 | Framework + SSR | 15.5.12 |
| 

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

 | Type Safety | 5.x |
| 

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

 | Database + Auth + RLS | Latest |
| 

![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white)

 | Hosting | Latest |
| 

![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)

 | Native Android App | 3.x |
| 

![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)

 | Push Notifications FCM | Latest |
| 

![Recharts](https://img.shields.io/badge/Recharts-22B5BF)

 | Interactive Charts | Latest |
| 

![cron-job.org](https://img.shields.io/badge/cron--job.org-FF6B35)

 | CRON Jobs (free) | Latest |

</div>

---

## 🚀 Quick Start

```bash
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker
npm install
cp .env.local.example .env.local
npm run dev
Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
TWELVE_DATA_KEY=
NEXT_PUBLIC_EXCHANGE_RATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
NEXT_PUBLIC_APP_URL=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
🗺️ Roadmap
✅ Phase 1 — MVP
   ├── [x] Auth + Onboarding
   ├── [x] Full Transactions
   ├── [x] Debts + Auto Deduction
   ├── [x] Investments + Live Prices
   ├── [x] Goals & Savings
   └── [x] Landing Page + PWA

✅ Phase 2 — Smart Features
   ├── [x] Smart Alerts + Push Notifications
   ├── [x] Smart Budget
   ├── [x] Auto Salary
   ├── [x] Transaction Search
   ├── [x] Dark/Light Mode
   ├── [x] i18n Arabic/English
   ├── [x] Unified Financial Health + Wealth Roadmap
   ├── [x] Wealth Simulator Card
   ├── [x] Auto Saving Challenges
   ├── [x] Personal Assets + True Net Worth
   ├── [x] Weekly Report + Evening Reminder
   ├── [x] Smart Notification Policy
   ├── [x] Recurring Transactions
   ├── [x] Forgot Password + Reset
   ├── [x] Share Button
   ├── [x] CRONs via cron-job.org
   ├── [x] Firebase FCM for Android
   ├── [x] Islamic Lessons
   ├── [x] Split Transactions: upcoming/completed
   ├── [x] SVG Logo
   ├── [x] Native Flutter Android App
   └── [x] Updated Privacy Policy

⏳ Phase 3 — Pro Features
   ├── [ ] Monthly PDF Reports
   ├── [ ] Subscription System (Paddle)
   ├── [ ] Invoice OCR
   └── [ ] Google Play Publishing
👨‍💻 Developer
Abdullah Rafi — Abdoocoder
[
�
Load image
](https://github.com/Abdoocoder)
Built with ❤️ using Next.js, Supabase & Flutter
© 2026 Fajrak — Smart Financial Management
�
