<div align="center">

<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
<img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />

# 💰 FinanceTracker
### منصة إدارة مالية شخصية ذكية — باللغة العربية
تتبّع دخلك، سدّد ديونك بخطة، وراقب استثماراتك الحلال — مع تنبيهات يومية تحفزك على الاستمرار

**[🚀 جرّب التطبيق المباشر](https://financetracker-brown.vercel.app)** · **[📂 كود المصدر](https://github.com/Abdoocoder/financetracker)**

</div>

---

## ✨ الميزات الرئيسية

### 📊 لوحة التحكم الرئيسية
- ملخص مالي شهري: الدخل، المصاريف، الصافي
- **مقارنة مع الشهر الماضي** — نسب ↑↓ تلقائية
- **إضافة سريعة** — 6 فئات شائعة + تكرار آخر معاملة بضغطة واحدة
- نظرة سريعة على الديون والاستثمارات والأهداف
- آخر 5 معاملات مالية
- عدد التنبيهات غير المقروءة في الوقت الفعلي

### 💳 إدارة الديون
- تسجيل الديون مع الأولويات (1-5) وتواريخ الاستحقاق
- **خصم تلقائي شهري** — حدد يوم الدفع وفعّل toggle واحد
- حساب تلقائي للمبلغ المتبقي بعد كل دفعة
- شريط تقدم لكل دين وللإجمالي
- تعديل وحذف الديون بسهولة

### 📈 المحفظة الاستثمارية
- **رسم بياني** لتوزيع المحفظة مع نسب كل أصل وربحه
- **سجل المعاملات** لكل استثمار
- أسعار **حية ومباشرة** لـ 15+ عملة رقمية عبر CoinGecko: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, DOT, AVAX, MATIC, LINK, LTC
- أسعار الأسهم والـ ETF عبر Twelve Data + Yahoo كاحتياط
- تحويل فوري بين **USD ↔ JOD** بسعر صرف حي
- حساب الربح/الخسارة (P&L) ونسبة العائد لكل أصل
- تسجيل عمليات الشراء مع تحديث تلقائي لمتوسط التكلفة
- دعم: ETF، أسهم، عملات رقمية — مع تمييز الاستثمارات الحلال ✅

### 💰 المعاملات المالية
- تسجيل الدخل والمصاريف مع الفئة والوصف والتاريخ
- **Swipe للحذف** — RTL-native
- فلترة بالنوع (دخل / مصروف / الكل)
- **فلترة بالشهر** — عرض معاملات أي شهر سابق
- إحصائيات فورية: إجمالي الدخل، المصاريف، الصافي
- تعديل وحذف أي معاملة
- **Pagination** — تحميل 20 معاملة مع زر "تحميل المزيد"

### 🎯 أهداف الادخار
- إنشاء أهداف بأيقونة مخصصة وتاريخ مستهدف
- إضافة مبالغ الادخار تدريجياً
- شريط تقدم لكل هدف وملخص إجمالي

### 📊 الميزانية الشهرية
- تحديد حد إنفاق لكل فئة (طعام، مواصلات، فواتير...)
- شريط تقدم لكل فئة — يتحول للأحمر عند تجاوز الحد
- مقارنة فورية بين الميزانية والإنفاق الفعلي
- فلتر بالشهر لعرض أي شهر سابق
- تحذير تلقائي عند تجاوز الميزانية ⚠️

### 🔔 التنبيهات الذكية
- **يومياً**: رسائل تحفيزية مخصصة
- **أسبوعياً** (كل إثنين): تنبيه إذا لم تسجل معاملات هذا الأسبوع
- **شهرياً** (أول الشهر): تحذير إذا تجاوزت المصاريف 80% من الدخل
- **ربعياً**: تذكير بدفعة الاستثمار الدورية
- توليد فوري يدوي بضغطة زر واحدة

### ⚙️ الإعدادات
- **راتب تلقائي** — حدد مبلغ راتبك ويوم استلامه، يُضاف تلقائياً كل شهر
- **تصدير CSV** لكل المعاملات
- **حذف الحساب** مع تأكيد مزدوج
- دعم اللغتين العربية والإنجليزية
- دعم 4 عملات: JOD, USD, EUR, SAR

---

## 🛠️ التقنيات المستخدمة

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| **Next.js** | 15 | React Framework — App Router |
| **TypeScript** | 5 | Strict mode — جودة الكود |
| **Supabase** | 2.45 | قاعدة البيانات + المصادقة + RLS |
| **Tailwind CSS** | 3.4 | التصميم — Dark Mode عربي RTL |
| **Vercel** | — | الاستضافة + Cron Jobs |
| **CoinGecko API** | Free | 15+ عملة رقمية حية |
| **Twelve Data API** | Free | أسعار الأسهم والـ ETF |
| **Exchange Rate API** | Free | سعر صرف USD/JOD الحي |

---

## 🗄️ قاعدة البيانات

```
┌─────────────────────────────────────────────────────────────┐
│                          profiles                           │
│  id · full_name · currency · monthly_income · salary_day   │
└──────────────────────┬──────────────────────────────────────┘
                       │ user_id
          ┌────────────┼────────────────────────┐
          │            │                        │
     ┌────▼────┐  ┌────▼────────┐        ┌─────▼──────┐
     │  debts  │  │transactions │        │investments │
     └────┬────┘  └─────────────┘        └─────┬──────┘
          │                                     │
  ┌───────▼───────┐               ┌─────────────▼────────┐
  │ debt_payments │               │investment_transactions│
  └───────────────┘               └──────────────────────┘
  ┌───────────────┐    ┌─────────┐    ┌────────┐
  │ savings_goals │    │ alerts  │    │budgets │
  └───────────────┘    └─────────┘    └────────┘
```

| الجدول | الوصف | RLS |
|--------|-------|:---:|
| `profiles` | بيانات المستخدم + salary_day + auto_deduct | ✅ |
| `transactions` | المعاملات المالية | ✅ |
| `debts` | الديون + payment_day + auto_deduct | ✅ |
| `debt_payments` | سجل دفعات الديون | ✅ |
| `investments` | الأصول الاستثمارية | ✅ |
| `investment_transactions` | عمليات الشراء والبيع | ✅ |
| `savings_goals` | أهداف الادخار | ✅ |
| `alerts` | التنبيهات الذكية | ✅ |
| `budgets` | الميزانيات الشهرية | ✅ |

---

## 🚀 الإعداد والتشغيل

### المتطلبات الأساسية
- Node.js 18+
- حساب [Supabase](https://supabase.com) مجاني
- حساب [Vercel](https://vercel.com) مجاني

### متغيرات البيئة

```bash
cp .env.local.example .env.local
```

| المتغير | المصدر | ضروري |
|---------|--------|:-----:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_APP_URL` | رابط تطبيقك | ✅ |
| `CRON_SECRET` | أي نص عشوائي | ✅ |
| `TWELVE_DATA_KEY` | [twelvedata.com](https://twelvedata.com) | ✅ |
| `NEXT_PUBLIC_EXCHANGE_RATE_KEY` | [exchangerate-api.com](https://exchangerate-api.com) | ✅ |

### التشغيل المحلي

```bash
# 1. استنساخ المشروع
git clone https://github.com/Abdoocoder/financetracker.git
cd financetracker

# 2. تثبيت الحزم
npm install

# 3. إعداد متغيرات البيئة
cp .env.local.example .env.local

# 4. تشغيل التطبيق
npm run dev
# افتح http://localhost:3000
```

### إعداد Supabase
1. أنشئ مشروعاً جديداً على [supabase.com](https://supabase.com)
2. من SQL Editor شغّل migrations الموجودة في `supabase/migrations/`
3. أضف الأعمدة الجديدة:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS salary_day integer DEFAULT 1;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS payment_day integer DEFAULT 1;
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS auto_deduct boolean DEFAULT false;
```
4. تأكد من تفعيل Row Level Security على كل الجداول

### النشر على Vercel

```bash
npm i -g vercel
vercel --prod
```

أضف جميع متغيرات البيئة من Vercel Dashboard → Settings → Environment Variables.

> **ملاحظة:** `vercel.json` يحتوي على 3 Cron Jobs جاهزة:
> - `/api/alerts` — يومياً الساعة 7:00 صباحاً
> - `/api/auto-salary` — يومياً الساعة 8:00 صباحاً
> - `/api/auto-debt` — يومياً الساعة 9:00 صباحاً

---

## 📁 هيكل المشروع

```
financetracker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── onboarding/page.tsx         # Onboarding 3 خطوات
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       ├── page.tsx                # الرئيسية + مقارنة شهرية + إضافة سريعة
│   │       ├── transactions/           # المعاملات + Swipe للحذف
│   │       ├── debts/                  # الديون + خصم تلقائي
│   │       ├── investments/            # المحفظة + رسم بياني + سجل معاملات
│   │       ├── goals/                  # أهداف الادخار
│   │       ├── alerts/                 # التنبيهات الذكية
│   │       └── settings/              # إعدادات + تصدير CSV + حذف حساب
│   ├── api/
│   │   ├── alerts/route.ts             # Cron — توليد التنبيهات
│   │   ├── auto-salary/route.ts        # Cron — راتب تلقائي
│   │   ├── auto-debt/route.ts          # Cron — خصم الديون تلقائياً
│   │   ├── push-subscribe/route.ts     # Push Notifications
│   │   ├── push-send/route.ts
│   │   └── stock-price/route.ts        # Proxy — أسهم + 15 عملة رقمية
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                        # Landing Page احترافية
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ui/
│       ├── quick-add.tsx               # إضافة سريعة + تكرار آخر معاملة
│       ├── swipe-row.tsx               # Swipe RTL للحذف
│       ├── modal.tsx
│       ├── toast.tsx
│       ├── skeleton.tsx
│       └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── user-context.tsx                # UserProvider — getUser() مرة واحدة فقط
│   ├── use-cached-data.ts              # Cache 30s + stale-while-revalidate
│   └── i18n.tsx                        # ar / en
├── types/index.ts
├── middleware.ts
├── vercel.json                         # 3 Cron Jobs
└── .env.local.example
```

---

## 🔒 الأمان

| الطبقة | التفاصيل |
|--------|----------|
| Row Level Security | كل مستخدم يصل لبياناته فقط — مُطبق على 9 جداول |
| Middleware | حماية كل مسارات `/dashboard` |
| `getUser()` لا `getSession()` | التحقق من Supabase Auth server مباشرة |
| Service Role Key | في server-side فقط |
| Cron Secret | يحمي APIs من الاستدعاء العشوائي |

---

## ⚡ الأداء

- **UserContext** — `getUser()` مرة واحدة للـ session كاملة بدل 13+ استدعاء
- **Memory Cache** مع stale-while-revalidate — تنقل فوري بين الصفحات
- **Quick-add** يحدث الأرقام فقط بدون reload كامل للصفحة
- **Promise.all** في Dashboard — جلب 7 جداول بالتوازي
- **Skeleton Loading** — لا شاشة بيضاء أثناء التحميل
- `revalidate: 300` على stock-price API — cache 5 دقائق
- **PWA manifest** — التطبيق قابل للتثبيت على الموبايل

---

## 🗺️ خارطة الطريق

**قريباً**
- [x] صفحة الميزانية الشهرية ✅
- [ ] رسوم بيانية تفاعلية (Recharts)
- [ ] زر بيع في الاستثمارات مع حساب الربح
- [x] Pagination للمعاملات ✅

**مستقبلاً**
- [ ] تصدير تقرير PDF شهري
- [ ] اشتراكات مدفوعة (Paddle/Lemon Squeezy) — حقل `plan` جاهز في `profiles`
- [ ] 📷 قراءة الفواتير تلقائياً (OCR) — رفع صورة فاتورة واستخراج المبلغ والتاريخ والفئة وإضافتها للمصاريف تلقائياً — **ميزة Pro**
- [ ] نصائح مالية ذكية بناءً على بيانات المستخدم
- [x] تطبيق PWA قابل للتثبيت ✅
- [ ] إشعارات Push / Email
- [ ] 📱 تطبيق Android أصلي

---

## 👨‍💻 المطور

**عبدالله رافع أبوصغيرة**
مطور Full-Stack | عمّان، الأردن

[![Portfolio](https://img.shields.io/badge/Portfolio-000?style=for-the-badge&logo=vercel)](https://abdoocoder-portfolio.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github)](https://github.com/Abdoocoder)

---

<div align="center">
بُني بـ ❤️ وكثير من ☕

⭐ أعطِ المشروع نجمة إذا أفادك
</div>
