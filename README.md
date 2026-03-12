# 💰 FinanceTracker

> منصة إدارة مالية شخصية ذكية — Smart Personal Finance Manager

[


](https://financetracker-brown.vercel.app)
[


](https://nextjs.org)
[


](https://supabase.com)
[


](#)

---

## 🌟 الميزات / Features

### 📊 Dashboard
- ملخص شهري: الدخل، المصروف، الصافي
- مقارنة مع الشهر الماضي
- رسم بياني للإيرادات والمصروفات (6 أشهر)
- توزيع المصاريف حسب الفئة

### 💸 المعاملات / Transactions
- إضافة / تعديل / حذف معاملات
- فلترة بالنوع والشهر
- Pagination (20 معاملة)
- تصدير CSV + Swipe للحذف

### ⚡ Quick Add
- 6 فئات سريعة + تكرار آخر معاملة

### 💳 الديون / Debts
- تتبع مع الأولوية + خصم تلقائي يومي (CRON)

### 📈 الاستثمارات / Investments
- أسهم + عملات رقمية (15+)
- أسعار حية (CoinGecko + Twelve Data)
- رسم بياني للمحفظة + دعم الاستثمار الحلال ✅

### 🎯 الأهداف / Savings Goals
- أهداف ادخار مع شريط تقدم

### 📊 الميزانية / Budget
- حد إنفاق شهري لكل فئة
- تحذير تلقائي عند التجاوز ⚠️

### 🔔 التنبيهات / Alerts
- تنبيهات ذكية بالذكاء الاصطناعي (Claude API)
- إشعارات Push (Web Push API)

### ⚙️ الإعدادات / Settings
- JOD, USD, EUR, SAR
- تصدير CSV + حذف الحساب
- راتب تلقائي شهري

---

## 🌍 i18n + 🎨 Theme

- عربي / English — Auto-detect حسب الجهاز
- داكن / فاتح — Auto-detect حسب الجهاز

## 📱 PWA

- تثبيت على Android و iOS
- يعمل بدون شريط المتصفح

---

## 🛠️ Tech Stack

| التقنية | الاستخدام |
|---------|-----------|
| Next.js 15 | Framework |
| Supabase | Database + Auth |
| Vercel | Hosting + CRON |
| CoinGecko + Twelve Data | Prices |
| Web Push API | Notifications |
| Claude API | AI Alerts |

---

## 🗄️ Database Tables

profiles, transactions, debts, debt_payments, investments, investment_transactions, budgets, alerts, savings_goals

---

## ⚙️ CRON Jobs

| المسار | الجدول | الوظيفة |
|--------|--------|---------|
| /api/alerts | 0 7 * * * | تنبيهات ذكية يومية |
| /api/auto-salary | 0 8 * * * | إضافة الراتب |
| /api/auto-debt | 0 9 * * * | خصم أقساط الديون |

---

## 🚀 Local Setup

    git clone https://github.com/Abdoocoder/financetracker.git
    cd financetracker
    npm install && npm run dev

### Environment Variables

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=
    CRON_SECRET=
    ANTHROPIC_API_KEY=
    TWELVE_DATA_API_KEY=
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=
    VAPID_PRIVATE_KEY=

---

## 🗺️ Roadmap

- [x] Landing Page
- [x] المعاملات + Pagination + فلتر الشهر
- [x] الديون + خصم تلقائي
- [x] الاستثمارات + أسعار حية
- [x] الأهداف والادخار
- [x] التنبيهات الذكية (AI)
- [x] الميزانية الشهرية
- [x] ترجمة كاملة عربي/English
- [x] Auto-detect للغة والثيم
- [x] PWA
- [x] صفحة 404 مخصصة
- [ ] تقارير PDF شهرية
- [ ] بحث في المعاملات
- [ ] نظام اشتراكات (Paddle)
- [ ] OCR للفواتير (Pro)

---

## 👨‍💻 المطور

**Abdoocoder** — [GitHub](https://github.com/Abdoocoder)

*بُني بـ ❤️ باستخدام Next.js و Supabase*
