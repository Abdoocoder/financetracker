<div align="center">

<img src="https://fajrak.com/icon-192.png" width="100" height="100" alt="Fajrak Logo" />

# Fajrak — فجرك 🌅

**The First Smart Arabic Personal Finance Manager**

[


](https://fajrak.com)
[


](https://fajrak.com/download)
[


](https://flutter.dev)

[


](https://nextjs.org)
[


](https://typescriptlang.org)
[


](https://supabase.com)
[


](https://flutter.dev)
[


](https://firebase.google.com)
[


](https://vercel.com)

---

*كلنا نحلم بالثراء — هنا تبدأ الرحلة*
*We all dream of wealth — here the journey begins*

[🇸🇦 العربية](./README.ar.md) | 🇬🇧 English

</div>

---

## ✨ Overview

> **Fajrak** is the first smart Arabic personal finance tool that walks with users step by step — from the first transaction they log until they achieve financial freedom.
>
> **Our Vision:** Every person should have full awareness of their financial situation and a clear plan for improvement — regardless of income or level — until they achieve financial freedom.
>
> Inspired by Islamic values of **effort, work, and contentment** 🕌

```
🌅 Awareness → 💳 Debt Repayment → 🛡️ Emergency Fund → 📈 Investment → 👑 Financial Freedom
```

---

## 🌟 Features

### 🏠 Dashboard
- Monthly summary: Income, Expenses, Net
- **Financial Health Score** — full circle 0-100 + detailed bars
- **Wealth Roadmap** — 5 financial stages + next recommended step
- **Wealth Simulator** — calculates surplus growth over time
- **Saving Challenges** — 4 auto-tracked challenges
- **Interactive Charts** with Recharts + Tooltips
- Quick Add with last transaction repeat
- Lazy Loading — **94% performance boost**

### 💸 Transactions
- Add / Edit / Delete
- **Recurring transactions** — monthly auto-execute
- Split into **Upcoming** and **Completed**
- Full-text search + Filter by type and month
- Swipe to delete on mobile + CSV export

### 💳 Debts
- Visual progress bar + Auto monthly deduction (CRON)
- Full payment history
- Confetti celebration on full repayment

### 📊 Budget
- Auto summary + Smart AI Advisor
- **50/30/20 Rule** — automatic suggested allocation
- Manual spending limits per category

### 📈 Investments
- Stocks + 15+ cryptocurrencies with **Live prices**
- Halal investment support
- Full Wealth Simulator with interactive sliders

### 🔔 Smart Notifications
- **Firebase FCM** for Android background notifications
- **Web Push** for iOS
- Morning, Evening, Weekly reports
- Smart policy: useful notifications only

### 📖 Islamic Daily Lessons
- Quran verses on provision and gratitude
- Hadiths on financial ethics + Daily supplications
- Personalized by **financial stage**

---

## 📱 Mobile Apps

| Platform | Type | Status |
|:--------:|:----:|:------:|
| Android | Native Flutter App | ✅ Available |
| Android | PWA / TWA APK | ✅ Available |
| iOS | PWA (Add to Home Screen) | ✅ Available |

---

## 🗄️ Database Schema

```
profiles, transactions, debts, debt_payments
investments, investment_transactions, budgets
savings_goals, alerts, push_subscriptions
user_stats, testimonials
```

> 🔒 All tables protected with **Row Level Security (RLS)**

---

## ⚙️ CRON Jobs — Daily Automation

Powered by **cron-job.org** (Amman timezone UTC+3):

| Time | Description |
|:----:|:-----------:|
| 6:00 AM | Morning reminders + smart alerts |
| 8:00 AM | Auto salary (silent) |
| 9:00 AM | Auto debt deduction (silent) |
| 6:00 PM | Evening reminder (if needed) |
| 7:00 PM | Daily wealth tip |
| Friday | Weekly comparison report |

---

## 🛠️ Tech Stack

| Technology | Usage | Version |
|:----------:|:-----:|:-------:|
| Next.js | Framework + SSR | 15.5.12 |
| TypeScript | Type Safety | 5.x |
| Supabase | Database + Auth + RLS | Latest |
| Flutter | Native Android App | 3.x |
| Firebase | Push Notifications FCM | Latest |
| Vercel | Hosting | Latest |
| Recharts | Interactive Charts | Latest |
| cron-job.org | CRON Jobs | Free |

---

## 🚀 Quick Start

```bash
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker
npm install
cp .env.local.example .env.local
npm run dev
```

---

## 🗺️ Roadmap

- [x] Auth + Onboarding + PWA
- [x] Transactions + Debts + Investments + Goals
- [x] Smart Notifications (iOS + Android FCM)
- [x] Budget + Financial Health + Wealth Roadmap
- [x] Gamification + Islamic Lessons
- [x] Native Flutter Android App
- [x] fajrak.com custom domain
- [ ] Monthly PDF Reports
- [ ] Subscription System (Paddle)
- [ ] Google Play Store Publishing

---

## 🔐 Security

- Row Level Security (RLS) on all tables
- Middleware protects all dashboard routes
- CRON Secret + VAPID + Firebase Admin SDK

---

<div align="center">

## 👨‍💻 Developer

**Abdullah Rafi — Abdoocoder**

[


](https://github.com/Abdoocoder)

*Built with ❤️ from Jordan for the Arab world*

**© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة**

</div>

## Changelog

### v3.3.0 — 2026-03-19 *(Latest)*
- 📖 **Islamic Lessons Bank** — haram money warnings + debt lessons linked to financial stages
- 🎓 **Lesson Streak in Supabase** — streak saved permanently, synced across devices
- 🏆 **Lesson Badges** — lesson_3, lesson_7, lesson_30 badges in gamification system
- 🔔 **Alert Navigation** — tapping an alert redirects to the relevant page
- 🔄 **Auto-recurring in Cron** — recurring transactions run daily at 9am
- 💳 **Recurring Payment Type UI** — auto from bank or manual reminder selector
- 🔐 **Session Persistence** — autoRefreshToken + persistSession for stable sessions
- 🏦 **Auto Debt Push** — instant push notification on every auto deduction


### v3.2.0 — 2026-03-18 *(Latest)*
- 🏦 **Recurring payment type selector** — auto from bank or manual reminder
- 🔔 **Push for auto-recurring** — instant notification on auto transactions
- 🔄 **Improved recurring check** — precise duplicate detection
- 🔐 **Session persistence** — autoRefreshToken + persistSession enabled
- 💳 **Push for auto debt** — instant notification on every deduction


### v3.1.0 — 2026-03-18 *(Latest)*
- 🔄 Auto-recurring transactions
- 💳 Enhanced debt system
- 🔔 Push notifications for auto deduction
- 🔐 Password Reset fix
