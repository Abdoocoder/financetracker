<div align="center">

<img src="https://raw.githubusercontent.com/Abdoocoder/financetracker/main/public/favicon.ico" width="80" height="80" alt="FinanceTracker Logo" />

# FinanceTracker

**منصة إدارة مالية شخصية ذكية**
*Smart Personal Finance Manager*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-financetracker--brown.vercel.app-3B7EF6?style=for-the-badge&logoColor=white)](https://financetracker-brown.vercel.app)

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://financetracker-brown.vercel.app)

---

*تحكّم في أموالك، حقق حريتك المالية*
*Track your money. Build your freedom.*

</div>

---

## ✨ لمحة سريعة / Overview

> FinanceTracker هو تطبيق ويب متكامل لإدارة الشؤون المالية الشخصية، مبني بأحدث التقنيات ومصمم خصيصاً للمستخدم العربي مع دعم كامل للغة الإنجليزية.

```
💰 تتبع المصاريف  →  💳 سدد الديون  →  📈 استثمر الفائض  →  🎯 حقق أهدافك
```

---

## 🖥️ Screenshots

<div align="center">

| Dashboard | Transactions | Budget |
|:---------:|:------------:|:------:|
| ملخص شهري + خارطة الثراء + محاكي الثروة + رسوم بيانية | بحث + فلترة + Swipe | ملخص تلقائي + فئات |

</div>

---

## 🌟 الميزات / Features

<table>
<tr>
<td width="50%">

### 🏠 Dashboard
- ملخص شهري: الدخل، المصروف، الصافي
- **رحلة الثروة** — نقاط، مستويات، سلسلة يومية، شارات 🎮 *(جديد)*
- **خارطة الثراء** مع نقاط الصحة المالية 🗺️
- **بطاقة محاكي الثروة** — يحسب فائضك ويعرض نموه 📈
- **تحديات الادخار** — 4 تحديات تتبعها تلقائياً 🏆
- أقسام قابلة للطي لتجربة أنظف *(جديد)*
- مقارنة مع الشهر الماضي 📊
- رسم بياني للإيرادات والمصروفات
- إضافة سريعة مع تكرار آخر معاملة ⚡

### 💸 المعاملات
- إضافة / تعديل / حذف
- **بحث نصي** في الوصف والفئة والمبلغ 🔍
- فلترة بالنوع والشهر
- Swipe للحذف على الموبايل
- تصدير CSV 📥

### 💳 الديون
- تتبع مع شريط تقدم مرئي
- **خصم تلقائي شهري** (CRON) 🤖
- تحديد يوم الخصم لكل دين
- سجل كامل للدفعات

</td>
<td width="50%">

### 📊 الميزانية
- ملخص تلقائي من بيانات التطبيق
- حساب المتاح: الدخل − الأقساط − الأهداف
- **مستشار مالي ذكي** — تحليل وتوصيات فورية 🤖 *(جديد)*
- **قاعدة 50/30/20** — توزيع تلقائي مقترح *(جديد)*
- حدود إنفاق يدوية لكل فئة
- تحذير 🔶 عند الاقتراب وتنبيه ⚠️ عند التجاوز

### 📈 الاستثمارات
- أسهم + عملات رقمية (15+ عملة)
- أسعار **حية** (CoinGecko + Twelve Data)
- دعم الاستثمار الحلال ✅
- **محاكي الثروة الكامل** مع sliders تفاعلية وجدول تفصيلي سنة بسنة

### 🎯 الأهداف
- أهداف ادخار مع شريط تقدم
- إضافة دفعات يدوية

### 🔔 التنبيهات الذكية
- تحليل يومي تلقائي (GitHub Actions CRON)
- إشعارات Push حتى لو التطبيق مغلق
- تقرير أسبوعي + تذكير مسائي
- **توجيه بناء الثروة** — نصيحة شخصية يومية 7م 💡 *(جديد)*
- سياسة ذكية لتقليل الإشعارات المزعجة

### ⚙️ الإعدادات
- **ملف شخصي محسّن** — وظيفة، هاتف، تاريخ ميلاد 👤
- **أصولي الشخصية** — عقارات، مركبات، ذهب، أصول أخرى 💎
- **صافي الثروة الحقيقية** يظهر في خارطة الثراء تلقائياً
- **شارك تجربتك** — تقييم يظهر في Landing Page ⭐
- أقسام Accordion قابلة للطي *(جديد)*
- تصدير المعاملات CSV 📥

</td>
</tr>
</table>

---

## 🗺️ خارطة الثراء / Wealth Roadmap *(جديد)*

ميزة حصرية تحلّل وضعك المالي وتعطيك **نقاط الصحة المالية** مع خطة واضحة للتحسين:

- 🎯 تحديد المرحلة المالية الحالية (طوارئ → ديون → استثمار → ثروة)
- 💪 نقاط القوة والنقاط التي تحتاج تحسين
- 👣 الخطوة التالية الموصى بها مع تفاصيل عملية
- 📐 نسبة الدين من الدخل + مؤشرات أخرى
- 💎 **صافي الثروة الحقيقية** = أصول شخصية + استثمارات + ادخار − ديون *(جديد)*

---

## 🎮 نظام الإنجازات / Gamification System *(جديد)*

نظام متكامل يحوّل إدارة المال إلى رحلة ممتعة ومحفّزة:

**النقاط والمستويات:**
```
🌱 مبتدئ   (0-49 نقطة)
🔥 متتبع   (50-149 نقطة)
💪 مدخر    (150-349 نقطة)
📈 مستثمر  (350-699 نقطة)
💎 ثري مبتدئ (700-1199 نقطة)
👑 حر مالياً (1200+ نقطة)
```

**الشارات (15 شارة):** تتبع، ادخار، ديون، استثمار، ثروة

**السلسلة اليومية 🔥** — كل يوم يسجّل فيه المستخدم معاملة يكسب نقطة ويحافظ على سلسلته

---

نظام متكامل يتيح للمستخدمين مشاركة تجربتهم مباشرة من التطبيق:

- المستخدم يكتب تقييمه من صفحة **الإعدادات** (اسم، دولة، وظيفة، نجوم، نص)
- التقييم يُحفظ في Supabase بحالة `is_visible = false` بانتظار الموافقة
- بعد موافقة المشرف يظهر تلقائياً في **Landing Page**
- المستخدم يستطيع تحديث تقييمه في أي وقت

**موافقة على تقييم** (Supabase SQL Editor):
```sql
UPDATE testimonials SET is_visible = true WHERE id = 'xxx';
```

---

قسم في صفحة الإعدادات يتيح للمستخدم إدخال قيمة أصوله لحساب **صافي ثروته الحقيقية**:

- 🏠 العقارات (شقة، أرض، بيت)
- 🚗 المركبات (سيارة، دراجة)
- 👑 المجوهرات والذهب
- 📦 أصول أخرى

تظهر النتيجة مباشرة في **خارطة الثراء**: إجمالي أصولك + استثماراتك + ادخارك − ديونك = **صافي ثروتك**.
تنبيه تلقائي عند مرور 3 أشهر بدون تحديث القيم.

---

بطاقة تفاعلية في الـ Dashboard تحفّز المستخدم على تحسين عاداته المالية:

- 🍔 أسبوع بدون مطاعم
- 💰 وفّر 10% من دخلك هذا الشهر
- 📉 أنفق أقل من الشهر الماضي
- 🎯 صفر مصاريف غير ضرورية

التتبع يعمل **تلقائياً** من المعاملات الموجودة — بدون أي إدخال يدوي.

---

بطاقة تفاعلية في الـ Dashboard تحسب تلقائياً من فائضك الشهري الفعلي:

- 💵 يأخذ صافي دخلك تلقائياً كمبلغ استثمار مقترح
- 📊 يعرض النتيجة بعد **10 سنوات** و**20 سنة** بعائد 7% (متوسط S&P500)
- 🔗 رابط مباشر لصفحة الاستثمارات مع المحاكي الكامل التفاعلي
- 📅 المحاكي الكامل يدعم sliders للمبلغ والمدة والعائد مع جدول تفصيلي سنة بسنة

---

<div align="center">

| التقنية | الاستخدام | الإصدار |
|:-------:|:---------:|:-------:|
| ![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white) | Framework + SSR | 15.x |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) | Type Safety | 5.x |
| ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white) | Database + Auth + RLS | Latest |
| ![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white) | Hosting + CRON Jobs | Latest |
| ![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white) | Styling | 3.x |
| ![CoinGecko](https://img.shields.io/badge/CoinGecko-8DC63F?logoColor=white) | أسعار العملات الرقمية | Free API |
| ![WebPush](https://img.shields.io/badge/Web_Push-5A0FC8?logo=pwa&logoColor=white) | Push Notifications | VAPID |

</div>

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────┐
│                    Supabase Tables                   │
├──────────────────────┬──────────────────────────────┤
│ profiles             │ بيانات المستخدم + الراتب      │
│ transactions         │ المعاملات المالية              │
│ debts                │ الديون + الخصم التلقائي        │
│ debt_payments        │ سجل دفعات الديون               │
│ investments          │ المحفظة الاستثمارية            │
│ investment_transactions │ معاملات الاستثمار           │
│ budgets              │ ميزانيات الفئات الشهرية        │
│ savings_goals        │ أهداف الادخار                  │
│ alerts               │ التنبيهات الذكية               │
│ push_subscriptions   │ اشتراكات الإشعارات             │
└──────────────────────┴──────────────────────────────┘
```

> 🔒 جميع الجداول محمية بـ **Row Level Security (RLS)** — لا يمكن لأي مستخدم الوصول لبيانات غيره.

---

## ⚙️ CRON Jobs — الأتمتة اليومية

```
┌──────────────────────────────────────────────────────────────┐
│  ⏰ 7:00 AM  │  /api/smart-notifications  │  تنبيهات ذكية   │
│  ⏰ 8:00 AM  │  /api/auto-salary          │  إضافة الراتب   │
│  ⏰ 9:00 AM  │  /api/auto-debt            │  خصم الأقساط    │
└──────────────────────────────────────────────────────────────┘
```

> ملاحظة: جميع الـ CRONs موحّدة في endpoint واحد ذكي لتوافق Vercel Hobby plan.

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker

# 2. Install
npm install

# 3. Environment
cp .env.local.example .env.local
# عدّل متغيرات البيئة

# 4. Run
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Security
CRON_SECRET=

# APIs
TWELVE_DATA_KEY=
NEXT_PUBLIC_EXCHANGE_RATE_KEY=

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 🗺️ Roadmap

```
✅ المرحلة الأولى — MVP
   ├── [x] Auth + Onboarding
   ├── [x] المعاملات الكاملة
   ├── [x] الديون + الخصم التلقائي
   ├── [x] الاستثمارات + أسعار حية
   ├── [x] الأهداف والادخار
   └── [x] Landing Page + PWA

✅ المرحلة الثانية — Smart Features
   ├── [x] التنبيهات الذكية + Push
   ├── [x] الميزانية الذكية + مستشار مالي + قاعدة 50/30/20
   ├── [x] الراتب التلقائي
   ├── [x] بحث في المعاملات
   ├── [x] Dark/Light Mode
   ├── [x] i18n عربي/English كامل
   ├── [x] خارطة الثراء + نقاط الصحة المالية
   ├── [x] بطاقة محاكي الثروة في الـ Dashboard
   ├── [x] تحديات الادخار التلقائية
   ├── [x] الأصول الشخصية + صافي الثروة الحقيقية
   ├── [x] ملف شخصي محسّن (وظيفة، هاتف، ميلاد)
   ├── [x] نظام شهادات المستخدمين
   ├── [x] GitHub Actions CRON بدل Vercel
   ├── [x] معاملات متكررة تلقائية
   ├── [x] توجيه بناء الثروة — نصيحة يومية شخصية
   ├── [x] نظام Gamification — نقاط، مستويات، شارات، سلسلة يومية
   ├── [x] أقسام Accordion في الداشبورد والإعدادات
   ├── [x] تقرير أسبوعي + تذكير مسائي
   └── [x] سياسة إشعارات ذكية لتقليل الضوضاء

⏳ المرحلة الثالثة — Pro Features
   ├── [ ] تقارير PDF شهرية
   ├── [ ] نظام اشتراكات
   └── [ ] OCR للفواتير
```

---

## 📱 PWA Support

التطبيق يعمل كـ **Progressive Web App** كامل:

- 📲 قابل للتثبيت على Android و iOS
- 🔔 إشعارات Push حتى مع إغلاق التطبيق
- ⚡ أداء سريع مع Service Worker

---

<div align="center">

## 👨‍💻 المطور / Developer

**عبدالله رافع — Abdoocoder**

[![GitHub](https://img.shields.io/badge/GitHub-Abdoocoder-181717?style=for-the-badge&logo=github)](https://github.com/Abdoocoder)

---

*بُني بـ ❤️ باستخدام Next.js و Supabase*
*Built with ❤️ using Next.js & Supabase*

**© 2026 FinanceTracker — إدارة مالية ذكية للعالم العربي**

</div>
