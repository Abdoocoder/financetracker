# 💰 FinanceTracker

> منصة إدارة مالية شخصية ذكية — Smart Personal Finance Manager

[

![Deploy](https://img.shields.io/badge/Live-financetracker--brown.vercel.app-blue)

](https://financetracker-brown.vercel.app)
[

![Next.js](https://img.shields.io/badge/Next.js-15-black)

](https://nextjs.org)
[

![Supabase](https://img.shields.io/badge/Supabase-Database-green)

](https://supabase.com)

---

## 🌟 الميزات / Features

### 🏠 Dashboard
- ملخص شهري: الدخل، المصروف، الصافي
- مقارنة مع الشهر الماضي
- رسم بياني للإيرادات والمصروفات
- توزيع المصاريف حسب الفئة
- إضافة سريعة (Quick Add) مع تكرار آخر معاملة

### 💸 المعاملات / Transactions
- إضافة / تعديل / حذف
- بحث نصي (الوصف، الفئة، المبلغ)
- فلترة بالنوع والشهر
- Pagination (20 معاملة)
- Swipe للحذف
- تصدير CSV

### 💳 الديون / Debts
- تتبع مع شريط تقدم
- خصم تلقائي شهري (CRON)
- تحديد يوم الخصم لكل دين
- سجل الدفعات

### 📈 الاستثمارات / Investments
- أسهم + عملات رقمية (15+)
- أسعار حية (CoinGecko + Twelve Data + Yahoo)
- دعم الاستثمار الحلال ✅

### 🎯 الأهداف / Savings Goals
- أهداف ادخار مع شريط تقدم
- إضافة دفعات يدوية

### 📊 الميزانية / Budget
- ملخص تلقائي: الدخل، الأقساط، ادخار الأهداف، المتاح
- حدود إنفاق يدوية لكل فئة
- تحذير عند تجاوز الحد أو اقترابه
- فلتر شهري

### 🔔 التنبيهات / Alerts
- تنبيهات ذكية يومية (rule-based engine)
- إشعارات Push (Web Push API)
- فلترة: achievements, warnings, unread

### ⚙️ الإعدادات / Settings
- JOD, USD, SAR, AED
- تصدير CSV
- حذف الحساب
- راتب تلقائي شهري (CRON)

---

## 🌍 i18n + 🎨 Theme

- عربي / English — يُحفظ في localStorage
- داكن / فاتح — يُحفظ في localStorage

## 📱 PWA

- تثبيت على Android و iOS
- يعمل بدون شريط المتصفح
- Push Notifications

---

## 🛠️ Tech Stack

| التقنية | الاستخدام |
|---------|-----------|
| Next.js 15 | Framework |
| Supabase | Database + Auth + RLS |
| Vercel | Hosting + CRON |
| CoinGecko | أسعار العملات الرقمية |
| Twelve Data + Yahoo | أسعار الأسهم |
| Web Push API | الإشعارات |
| react-swipeable | Swipe to Delete |

---

## 🗄️ Database Tables

| الجدول | الوظيفة |
|--------|---------|
| profiles | بيانات المستخدم، الراتب، العملة |
| transactions | المعاملات المالية |
| debts | الديون |
| debt_payments | سجل دفعات الديون |
| investments | الاستثمارات |
| investment_transactions | معاملات الاستثمار |
| budgets | ميزانيات الفئات الشهرية |
| alerts | التنبيهات الذكية |
| savings_goals | أهداف الادخار |
| push_subscriptions | اشتراكات الإشعارات |

---

## ⚙️ CRON Jobs

| المسار | الجدول | الوظيفة |
|--------|--------|---------|
| /api/alerts | 0 7 * * * | تنبيهات ذكية يومية |
| /api/auto-salary | 0 8 * * * | إضافة الراتب تلقائياً |
| /api/auto-debt | 0 9 * * * | خصم أقساط الديون تلقائياً |

---

## 🚀 Local Setup

```bash
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker
npm install
npm run dev
Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
NEXT_PUBLIC_EXCHANGE_RATE_KEY=
TWELVE_DATA_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
NEXT_PUBLIC_APP_URL=
🗺️ Roadmap
[x] Landing Page + Privacy + 404
[x] Onboarding (3 خطوات)
[x] المعاملات + بحث + فلتر + Pagination
[x] الديون + خصم تلقائي
[x] الاستثمارات + أسعار حية
[x] الأهداف والادخار
[x] التنبيهات الذكية
[x] الميزانية الشهرية (تلقائية + يدوية)
[x] ترجمة كاملة عربي/English
[x] Dark/Light Mode
[x] PWA + Push Notifications
[x] Cron Jobs (راتب + ديون + تنبيهات)
[x] صفحة 404 مخصصة
[ ] تقارير PDF شهرية
[ ] نظام اشتراكات (Paddle/Stripe)
[ ] OCR للفواتير
👨‍💻 المطور
Abdoocoder — GitHub
بُني بـ ❤️ باستخدام Next.js و Supabase
