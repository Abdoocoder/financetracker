<div align="center">

<img src="https://raw.githubusercontent.com/Abdoocoder/financetracker/main/public/favicon.ico" width="80" height="80" alt="Fajrak Logo" />

# Fajrak

**منصة إدارة مالية شخصية ذكية**
*Smart Personal Finance Manager*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-fajrak.com-3B7EF6?style=for-the-badge&logoColor=white)](https://fajrak.com/)
[![Download APK](https://img.shields.io/badge/📱_Android_APK-v2.2.0-3ECF8E?style=for-the-badge&logoColor=white)](https://github.com/Abdoocoder/financetracker/releases/latest/download/app-debug.apk)

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Recharts](https://img.shields.io/badge/Recharts-Charts-22B5BF?style=flat-square)](https://recharts.org)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://fajrak.com/)

---

*كلنا نحلم بالثراء — هنا تبدأ الرحلة*
*We all dream of wealth — here the journey begins*

</div>

---

## ✨ لمحة سريعة / Overview

> فجرك هو أول أداة مالية عربية ذكية تمشي مع المستخدم خطوة بخطوة — من أول دينار يسجّله حتى يحقق حريته المالية.
>
> **رؤيتنا:** أن يكون كل إنسان على دراية كاملة بوضعه المالي، ويملك خطة واضحة للتحسين — بغض النظر عن دخله أو مستواه — حتى ينجح في تحقيق حريته المالية.
>
> مستلهم من قيم الإسلام في السعي والعمل والقناعة 🕌

```
🌅 وعي مالي  →  💳 سداد الديون  →  🛡️ صندوق طوارئ  →  📈 استثمار  →  👑 حرية مالية
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
- **رحلة الثروة** — نقاط، مستويات، سلسلة يومية، شارات 🎮
- **خارطة الثراء** مع نقاط الصحة المالية 🗺️
- **بطاقة محاكي الثروة** — يحسب فائضك ويعرض نموه 📈
- **تحديات الادخار** — 4 تحديات تتبعها تلقائياً 🏆
- **رسوم بيانية تفاعلية** بـ Recharts مع Tooltips *(جديد)* 📊
- مقارنة مع الشهر الماضي
- توزيع المصاريف مع النسب المئوية *(محسّن)*
- إضافة سريعة مع تكرار آخر معاملة ⚡
- **Lazy Loading** للمكونات الثقيلة — تحسين الأداء بـ 94% *(جديد)*

### 💸 المعاملات
- إضافة / تعديل / حذف
- **فئة صلة الرحم** مضافة *(جديد)*
- بحث نصي في الوصف والفئة والمبلغ 🔍
- فلترة بالنوع والشهر
- Swipe للحذف على الموبايل
- تصدير CSV 📥

### 💳 الديون
- تتبع مع شريط تقدم مرئي
- خصم تلقائي شهري (CRON) 🤖
- تحديد يوم الخصم لكل دين
- سجل كامل للدفعات
- تاريخ الديون المسددة مع إحصائية إجمالي ما سددته 💪
- احتفال + Confetti عند سداد دين كامل 🎉

</td>
<td width="50%">

### 📊 الميزانية
- ملخص تلقائي من بيانات التطبيق
- حساب المتاح: الدخل − الأقساط − الأهداف
- مستشار مالي ذكي — تحليل وتوصيات فورية 🤖
- قاعدة 50/30/20 — توزيع تلقائي مقترح
- حدود إنفاق يدوية لكل فئة
- تحذير 🔶 عند الاقتراب وتنبيه ⚠️ عند التجاوز

### 📈 الاستثمارات
- أسهم + عملات رقمية (15+ عملة)
- أسعار **حية** (CoinGecko + Twelve Data)
- دعم الاستثمار الحلال ✅
- **صافي الثروة يستخدم السعر الحالي** وليس سعر الشراء *(إصلاح)*
- محاكي الثروة الكامل مع sliders تفاعلية

### 🎯 الأهداف
- أهداف ادخار مع شريط تقدم
- إضافة دفعات يدوية

### 🔔 التنبيهات الذكية
- تحليل يومي تلقائي (GitHub Actions CRON)
- **Push Prompt UI أنيق** بدل confirm() المزعج *(جديد)*
- إشعارات Push تعمل على Android APK *(إصلاح)*
- تقرير أسبوعي + تذكير مسائي
- توجيه بناء الثروة — نصيحة شخصية يومية 7م 💡
- طلب إذن الإشعارات مرة واحدة فقط

### ⚙️ الإعدادات
- ملف شخصي محسّن — وظيفة، هاتف، تاريخ ميلاد 👤
- أصولي الشخصية — عقارات، مركبات، ذهب، أصول أخرى 💎
- صافي الثروة الحقيقية يظهر في خارطة الثراء تلقائياً
- شارك تجربتك — تقييم يظهر في Landing Page ⭐
- Dark Mode / Light Mode *(Light Mode محسّن)*
- أقسام Accordion قابلة للطي
- تصدير المعاملات CSV 📥

</td>
</tr>
</table>

---

## 📋 Changelog

### v1.5.2 — 2026-03-16
- 🕌 إضافة بنك دروس إسلامي كامل — آيات، أحاديث، أدعية مأثورة مرتبطة بالرزق والثراء
- 📖 17 درس إسلامي يظهر كل 7 أيام موزعة على كل مراحل الرحلة المالية
- 🌅 Fajrak الآن يجمع بين العلم المالي الحديث والتراث الإسلامي

### v1.5.1 — 2026-03-16
- 💾 حفظ الإشعارات في صفحة التنبيهات تلقائياً
- 🔗 إصلاح رابط الإشعار — يفتح الصفحة الصحيحة
- ⏳ تقسيم المعاملات — قادمة ومنجزة
- 🔢 إصلاح عرض الأرقام الكسرية في المعاملات
- 💼 استبدال "راتب" بـ "عمل حر" في الإضافة السريعة
- 🔔 App Badge عند وصول إشعار جديد

### v2.2.0 — 2026-03-17 *(الإصدار الحالي)*
- 📱 **Native Android App** — Capacitor + Firebase FCM حقيقي
- 🔔 **إشعارات Native** — تصل حتى لو التطبيق مغلق كلياً
- 🔐 **FCM Bridge** — Java ↔ JavaScript لتسجيل Token تلقائياً
- 💾 **Session Persistence** — لا تسجيل دخول عند كل فتح
- 🚀 **GitHub Actions** — بناء APK تلقائي عند كل push
- 🔗 **رابط تنزيل ديناميكي** — يشير لأحدث إصدار دائماً
- 🛡️ **Middleware fix** — تجاوز SSR للتطبيق Native

### v2.1.0 — 2026-03-17
- 📱 **Native Android APK** — بناء تلقائي عبر GitHub Actions
- 🔔 **إشعارات Native حقيقية** — تصل حتى لو التطبيق مغلق كلياً
- ⚡ **تنبيه Battery Optimization** — يوجه المستخدم لإعدادات Chrome
- 🔗 **رابط تنزيل ديناميكي** — يشير لأحدث إصدار تلقائياً

### v2.0.1 — 2026-03-17
- 🔧 إصلاح Push Notifications على Android — استبدال `navigator` بـ `self` في Service Worker
- ⚡ تنبيه تلقائي لمستخدمي Android لتفعيل إعدادات البطارية
- 🗑️ حذف FCM tokens المنتهية الصلاحية تلقائياً

### v2.0.0 — 2026-03
- 📱 **Fajrak v2.0 APK** — موقع بـ PWABuilder مع keystore جديد
- 🕌 **دروس إسلامية** — آيات قرآنية وأحاديث وأدعية الرزق يومياً
- 🔔 **Firebase FCM** — إشعارات تعمل في الخلفية على Android
- 🔴 **App Badge** — عداد الإشعارات غير المقروءة على أيقونة التطبيق
- 💳 **تقسيم المعاملات** — upcoming و completed بشكل منفصل
- 🔢 **إصلاح الأرقام** — عرض الكسور العشرية بشكل صحيح
- 🔄 **ترتيب المعاملات** — حسب التاريخ ثم وقت الإنشاء
- 💼 **تحرير الفئات** — استبدال راتب بـ freelance في Quick Add
- 📄 **وثيقة هوية Fajrak** — الرؤية والرسالة والقيم موثقة

### v1.6.0 — 2026-03
- 🌅 **هوية المشروع** — Tagline جديد، رؤية ورسالة واضحة، مستلهمة من الإسلام
- 📄 **Landing Page** — قسم "لماذا بنينا هذا التطبيق"، Pro → قريباً مع عرض أول 100 مشترك
- 🧭 **Bottom Nav** — 3 عناصر فقط (الرئيسية | المعاملات | المزيد)
- 🔄 **RTL/LTR كامل** — كل الصفحات تتبع لغة المستخدم
- ⚡ **أداء صفحة الاستثمارات** — Cache 5 دقائق + Parallel API calls
- 🔄 **تحديث تلقائي للأسعار** عند الدخول للصفحة في الخلفية
- 🌍 **ترجمة كاملة** للـ Dashboard sections
- 🔢 **إصلاح اتجاه الأرقام** — `1 USD = 0.709 JOD` صحيح في العربي
- ✅ **تقييمات حقيقية فقط** من قاعدة البيانات
- 🔃 **إعادة تحميل عند تغيير اللغة** لضمان RTL/LTR صحيح

### v1.5.0 — 2026-03
- 🧠 **دروس يومية ذكية** — مخصصة لكل مستخدم حسب مرحلته المالية
- 📚 **مبنية على أبحاث أكاديمية** — علم السلوك المالي، نوبل الاقتصاد، Vanguard
- 🌐 **ثنائية اللغة** — الدرس يصل بلغة المستخدم (عربي/إنجليزي)
- 🎯 **5 مسارات تعليمية** — وعي → ديون → طوارئ → استثمار → ثروة
- 🌓 **كشف ثيم الجهاز تلقائياً** عند أول دخول
- 🌍 **كشف لغة المتصفح تلقائياً** عند أول دخول
- 🔗 **إصلاح زر "شاهد كيف يعمل"** — يتنقل لقسم الميزات
- ✅ **تقييمات حقيقية فقط** — حذف التقييمات الوهمية
- 🗄️ إضافة عمود `lang` في `profiles` لتخصيص الإشعارات

### v1.4.0 — 2026-03
- 📊 ترقية الرسوم البيانية إلى **Recharts** مع Tooltips تفاعلية
- ⚡ **Lazy Loading** للمكونات الثقيلة — Dashboard من 120kB إلى 7.5kB (تحسين 94%)
- 🏗️ **Refactoring** شامل — تقسيم الملفات الكبيرة إلى 9 مكونات منظمة
- 🔧 `clearUserCache` في ملف مركزي `lib/cache.ts` — إزالة 6 نسخ مكررة
- 🌐 **مزامنة الترجمة** — 266 مفتاح متطابق عربي/إنجليزي
- 📱 **Bottom Nav RTL** — الرئيسية على اليمين *(إصلاح)*
- 🔔 **Push Prompt UI** — إصلاح الإشعارات على Android APK
- ☀️ **Light Mode محسّن** — عمق وظلال وألوان أفضل
- 💰 **إصلاح صافي الثروة** — استخدام السعر الحالي بدل سعر الشراء
- 🔢 **إصلاح الأرقام العشرية** — عرض أرقام نظيفة بدون .075
- 🗑️ إزالة Vercel Cron المكرر — GitHub Actions فقط
- ➕ إضافة فئة **صلة الرحم** في المعاملات

### v1.4.0 — 2026-03-15
- 🔔 إصلاح الإشعارات على Android — auto-subscribe للمستخدم القديم عند إعادة التثبيت
- 🔔 اشتراك تلقائي إذا الإذن ممنوح مسبقاً بدون popup
- 🚫 منع تكرار الراتب في الـ onboarding
- 🌐 نقل الدومين من vercel.app إلى fajrak.com
- 📱 APK v1.6.0 مع GitHub Release رسمي

### v1.3.0 — 2026-03
- 🎉 احتفال + Confetti عند سداد دين كامل
- 📜 تاريخ الديون المسددة مع إحصائية إجمالي المسدد
- 🌙 Dark Mode افتراضي لكل المستخدمين الجدد
- 🔔 طلب إذن الإشعارات مرة واحدة فقط للأبد
- 🌍 إصلاح جميع النصوص لاستخدام i18n
- 🚀 Landing Page محسّنة — Headline جديد، Trust Signals، Sticky CTA Bar
- 💪 إحصائية "إجمالي ما سددته" في صفحة الديون

### v1.2.0 — 2026-02
- 🗺️ خارطة الثراء + نقاط الصحة المالية
- 🎮 نظام Gamification — نقاط، مستويات، شارات، سلسلة يومية
- 💎 الأصول الشخصية + صافي الثروة الحقيقية
- 🏆 تحديات الادخار التلقائية
- 📱 APK للأندرويد

### v1.1.0 — 2026-01
- 🌐 i18n عربي/English كامل (266 مفتاح)
- 🤖 مستشار مالي ذكي + قاعدة 50/30/20
- 📊 محاكي الثروة التفاعلي
- 🔔 Push Notifications + تقرير أسبوعي
- 🔍 بحث في المعاملات + تصدير CSV

### v1.0.0 — 2025-12
- 🚀 الإطلاق الأول
- Auth + Onboarding + Dashboard
- المعاملات، الديون، الاستثمارات، الأهداف
- PWA + Vercel Deployment

---

## 🗺️ خارطة الثراء / Wealth Roadmap

ميزة حصرية تحلّل وضعك المالي وتعطيك **نقاط الصحة المالية** مع خطة واضحة للتحسين:

- 🎯 تحديد المرحلة المالية الحالية (طوارئ → ديون → استثمار → ثروة)
- 💪 نقاط القوة والنقاط التي تحتاج تحسين
- 👣 الخطوة التالية الموصى بها مع تفاصيل عملية
- 📐 نسبة الدين من الدخل + مؤشرات أخرى
- 💎 **صافي الثروة الحقيقية** = أصول شخصية + استثمارات (بالسعر الحالي) + ادخار − ديون

---

## 🎮 نظام الإنجازات / Gamification System

نظام متكامل يحوّل إدارة المال إلى رحلة ممتعة ومحفّزة:

**النقاط والمستويات:**
```
🌱 مبتدئ     (0-49 نقطة)
🔥 متتبع     (50-149 نقطة)
💪 مدخر      (150-349 نقطة)
📈 مستثمر    (350-699 نقطة)
💎 ثري مبتدئ (700-1199 نقطة)
👑 حر مالياً  (1200+ نقطة)
```

**الشارات (15 شارة):** تتبع، ادخار، ديون، استثمار، ثروة

**السلسلة اليومية 🔥** — كل يوم يسجّل فيه المستخدم معاملة يكسب نقطة ويحافظ على سلسلته

---

## ⭐ نظام التقييمات / Testimonials

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

## 🛠️ التقنيات / Tech Stack

<div align="center">

| التقنية | الاستخدام | الإصدار |
|:-------:|:---------:|:-------:|
| ![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white) | Framework + SSR | 15.x |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) | Type Safety | 5.x |
| ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white) | Database + Auth + RLS | Latest |
| ![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white) | Hosting | Latest |
| ![Recharts](https://img.shields.io/badge/Recharts-22B5BF?logoColor=white) | رسوم بيانية تفاعلية | Latest |
| ![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white) | Styling | 3.x |
| ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white) | CRON Jobs | Latest |
| ![CoinGecko](https://img.shields.io/badge/CoinGecko-8DC63F?logoColor=white) | أسعار العملات الرقمية | Free API |
| ![WebPush](https://img.shields.io/badge/Web_Push-5A0FC8?logo=pwa&logoColor=white) | Push Notifications | VAPID |

</div>

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────┐
│                    Supabase Tables                   │
├──────────────────────┬──────────────────────────────┤
│ profiles             │ بيانات المستخدم + الراتب + اللغة │
│ transactions         │ المعاملات المالية              │
│ debts                │ الديون + الخصم التلقائي        │
│ debt_payments        │ سجل دفعات الديون               │
│ investments          │ المحفظة الاستثمارية            │
│ investment_transactions │ معاملات الاستثمار           │
│ budgets              │ ميزانيات الفئات الشهرية        │
│ savings_goals        │ أهداف الادخار                  │
│ alerts               │ التنبيهات الذكية               │
│ push_subscriptions   │ اشتراكات الإشعارات             │
│ user_stats           │ نقاط + مستويات + شارات         │
│ testimonials         │ تقييمات المستخدمين             │
└──────────────────────┴──────────────────────────────┘
```

> 🔒 جميع الجداول محمية بـ **Row Level Security (RLS)** — لا يمكن لأي مستخدم الوصول لبيانات غيره.

---

## ⚙️ CRON Jobs — الأتمتة اليومية

تعمل عبر **GitHub Actions** (UTC+3):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⏰ 6:00 ص   │  smart-notifications.yml  │  تنبيهات صباحية + ذكية     │
│  ⏰ 8:00 ص   │  auto-salary.yml          │  إضافة الراتب التلقائي     │
│  ⏰ 9:00 ص   │  auto-debt.yml            │  خصم الأقساط التلقائي       │
│  ⏰ 6:00 م   │  smart-notifications.yml  │  تذكير مسائي               │
│  ⏰ 7:00 م   │  wealth-guidance.yml      │  توجيه بناء الثروة         │
│  ⏰ 8:00 ص ج │  smart-notifications.yml  │  تقرير أسبوعي (الجمعة فقط) │
└─────────────────────────────────────────────────────────────────────────┘
```

**GitHub Secrets المطلوبة:**
```
CRON_SECRET=your_secret_here
```

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/Abdoocoder/financetracker.git
cd fajrak

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
# =================================================
# APP CONFIG
# =================================================
NEXT_PUBLIC_APP_URL=https://fajrak.com


# =================================================
# SUPABASE CONFIG
# =================================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key


# =================================================
# MARKET DATA API
# =================================================
TWELVE_DATA_KEY=your_twelve_data_key


# =================================================
# CURRENCY EXCHANGE API
# =================================================
NEXT_PUBLIC_EXCHANGE_RATE_KEY=your_exchange_rate_key


# =================================================
# PUSH NOTIFICATIONS (VAPID)
# =================================================
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:your@email.com


# =================================================
# CRON JOB SECURITY
# =================================================
CRON_SECRET=your_cron_secret
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
   ├── [x] Dark / Light Mode
   ├── [x] i18n عربي/English كامل (266 مفتاح)
   ├── [x] خارطة الثراء + نقاط الصحة المالية
   ├── [x] Recharts — رسوم بيانية تفاعلية
   ├── [x] تحديات الادخار التلقائية
   ├── [x] الأصول الشخصية + صافي الثروة الحقيقية
   ├── [x] نظام Gamification — نقاط، مستويات، شارات
   ├── [x] GitHub Actions CRON
   ├── [x] Push Notifications على Android APK
   ├── [x] RTL كامل + Bottom Nav صحيح
   ├── [x] Lazy Loading — أداء أفضل بـ 94%
   ├── [x] Refactoring — كود نظيف ومنظم
   ├── [x] نظام شهادات المستخدمين
   ├── [x] دروس يومية ذكية مخصصة بالمرحلة المالية
   ├── [x] مبنية على أبحاث أكاديمية موثوقة
   ├── [x] ثنائية اللغة — عربي وإنجليزي
   ├── [x] كشف لغة وثيم الجهاز تلقائياً
   ├── [x] هوية المشروع — Fajrak، Tagline، رؤية إسلامية
   ├── [x] Landing Page — قسم الرؤية + عرض أول 100 مشترك
   ├── [x] Bottom Nav — 3 عناصر فقط
   ├── [x] RTL/LTR كامل في كل الصفحات
   ├── [x] تحديث تلقائي للأسعار في الخلفية
   └── [x] ترجمة كاملة لكل النصوص

⏳ المرحلة الثالثة — Pro Features
   ├── [ ] تقارير PDF شهرية
   ├── [ ] نظام اشتراكات (Stripe)
   └── [ ] OCR للفواتير
```

---

## 📱 PWA + Android

التطبيق يعمل كـ **Progressive Web App** كامل:

- 📲 قابل للتثبيت على Android و iOS
- 🔔 إشعارات Push حتى مع إغلاق التطبيق
- ⚡ أداء سريع مع Service Worker
- 📦 [تحميل APK مباشر للأندرويد](https://github.com/Abdoocoder/financetracker/releases/latest/download/app-debug.apk)

---

<div align="center">

## 👨‍💻 المطور / Developer

**عبدالله رافع — Abdoocoder**

[![GitHub](https://img.shields.io/badge/GitHub-Abdoocoder-181717?style=for-the-badge&logo=github)](https://github.com/Abdoocoder)

---

*بُني بـ ❤️ من الأردن للعالم العربي*
*Built with ❤️ from Jordan for the Arab world*

*"كل رحلة ثراء تبدأ بخطوة"*

**© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة**

</div>
