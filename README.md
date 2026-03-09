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
- نظرة سريعة على الديون والاستثمارات والأهداف
- آخر 5 معاملات مالية
- عدد التنبيهات غير المقروءة في الوقت الفعلي

### 💳 إدارة الديون
- تسجيل الديون مع الأولويات (1-5) وتواريخ الاستحقاق
- تسجيل الدفعات الشهرية مع خصم تلقائي من المتبقي
- شريط تقدم لكل دين وللإجمالي
- تعديل وحذف الديون بسهولة

### 📈 المحفظة الاستثمارية
- أسعار **حية ومباشرة**: BTC عبر CoinGecko، الأسهم والـ ETF عبر Twelve Data
- تحويل فوري بين **USD ↔ JOD** بسعر صرف حي
- حساب الربح/الخسارة (P&L) ونسبة العائد لكل أصل
- تسجيل عمليات الشراء مع تحديث تلقائي لمتوسط التكلفة
- تعديل كامل: الوحدات، سعر الشراء، السعر الحالي
- دعم: ETF، أسهم، عملات رقمية — مع تمييز الاستثمارات الحلال ✅

### 💰 المعاملات المالية
- تسجيل الدخل والمصاريف مع الفئة والوصف والتاريخ
- فلترة بالنوع (دخل / مصروف / الكل)
- إحصائيات فورية: إجمالي الدخل، المصاريف، الصافي
- تعديل وحذف أي معاملة

### 🎯 أهداف الادخار
- إنشاء أهداف بأيقونة مخصصة وتاريخ مستهدف
- إضافة مبالغ الادخار تدريجياً
- شريط تقدم لكل هدف وملخص إجمالي

### 🔔 التنبيهات الذكية
- **يومياً**: رسائل تحفيزية مخصصة
- **أسبوعياً** (كل إثنين): تنبيه إذا لم تسجل معاملات هذا الأسبوع
- **شهرياً** (أول الشهر): تحذير إذا تجاوزت المصاريف 80% من الدخل
- **ربعياً**: تذكير بدفعة الاستثمار الدورية في SPUS
- **يوم 25**: تذكير بدفعات الديون الشهرية القادمة
- توليد فوري يدوي بضغطة زر واحدة

---

## 🛠️ التقنيات المستخدمة

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| **Next.js** | 15 | React Framework — App Router |
| **TypeScript** | 5 | Strict mode — جودة الكود |
| **Supabase** | 2.45 | قاعدة البيانات + المصادقة + RLS |
| **Tailwind CSS** | 3.4 | التصميم — Dark Mode عربي RTL |
| **Vercel** | — | الاستضافة + Cron Jobs |
| **CoinGecko API** | Free | سعر BTC الحي |
| **Twelve Data API** | Free | أسعار الأسهم والـ ETF |
| **Exchange Rate API** | Free | سعر صرف USD/JOD الحي |

---

## 🗄️ قاعدة البيانات
┌─────────────────────────────────────────────────────┐
│                      profiles                       │
│  id · full_name · currency · monthly_income · plan  │
└──────────────────────┬──────────────────────────────┘
│ user_id
┌───────────────┼───────────────────────┐
│               │                       │
┌────▼────┐    ┌─────▼──────┐         ┌─────▼──────┐
│  debts  │    │transactions│         │investments │
└────┬────┘    └────────────┘         └─────┬──────┘
│                                      │
┌────▼──────────┐               ┌───────────▼──────────┐
│ debt_payments │               │investment_transactions│
└───────────────┘               └──────────────────────┘
┌───────────────┐    ┌─────────┐    ┌────────┐
│ savings_goals │    │ alerts  │    │budgets │
└───────────────┘    └─────────┘    └────────┘
| الجدول | الوصف | RLS |
|--------|-------|:---:|
| `profiles` | بيانات المستخدم والإعدادات | ✅ |
| `transactions` | المعاملات المالية | ✅ |
| `debts` | الديون وتفاصيلها | ✅ |
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
المتغير
المصدر
ضروري
NEXT_PUBLIC_SUPABASE_URL
Supabase → Settings → API
✅
NEXT_PUBLIC_SUPABASE_ANON_KEY
Supabase → Settings → API
✅
SUPABASE_SERVICE_ROLE_KEY
Supabase → Settings → API
✅
NEXT_PUBLIC_APP_URL
رابط تطبيقك
✅
CRON_SECRET
أي نص عشوائي
✅
TWELVE_DATA_KEY
twelvedata.com
✅
NEXT_PUBLIC_EXCHANGE_RATE_KEY
exchangerate-api.com
✅
التشغيل المحلي
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
إعداد Supabase
أنشئ مشروعاً جديداً على supabase.com
من SQL Editor شغّل migrations الموجودة في supabase/migrations/
تأكد من تفعيل Row Level Security على كل الجداول
فعّل Leaked Password Protection من Authentication → Sign In/Up
النشر على Vercel
npm i -g vercel
vercel --prod
أضف جميع متغيرات البيئة من Vercel Dashboard → Settings → Environment Variables.
ملاحظة: vercel.json يحتوي على إعداد Cron Job جاهز — يعمل يومياً الساعة 7:00 صباحاً تلقائياً.
📁 هيكل المشروع
financetracker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # تسجيل الدخول
│   │   └── register/page.tsx       # إنشاء حساب جديد
│   ├── (dashboard)/
│   │   ├── layout.tsx              # UserProvider + Sidebar + alertsCount
│   │   └── dashboard/
│   │       ├── page.tsx            # الرئيسية — ملخص شهري كامل
│   │       ├── transactions/       # المعاملات مع فلترة وتعديل
│   │       ├── debts/              # الديون مع دفعات وشريط تقدم
│   │       ├── investments/        # المحفظة مع أسعار حية
│   │       ├── goals/              # أهداف الادخار
│   │       ├── alerts/             # التنبيهات الذكية
│   │       └── settings/           # إعدادات الحساب
│   ├── api/
│   │   ├── alerts/route.ts         # Cron Job — توليد التنبيهات
│   │   └── stock-price/route.ts    # Proxy لـ Twelve Data API
│   ├── globals.css                 # CSS Variables + Animations
│   ├── layout.tsx                  # Root layout — خط Cairo + RTL
│   └── page.tsx                    # Landing page
├── components/
│   ├── layout/Sidebar.tsx          # Desktop sidebar + Mobile bottom nav
│   └── ui/skeleton.tsx             # Loading skeletons
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server + Admin Supabase clients
│   ├── user-context.tsx            # UserProvider + useUser hook
│   └── use-cached-data.ts          # Cache 30s + refresh + invalidate
├── types/index.ts                  # TypeScript types لكل الكيانات
├── middleware.ts                   # حماية مسارات /dashboard
├── vercel.json                     # Cron Job — 7:00 AM daily
└── .env.local.example              # قالب متغيرات البيئة
🔒 الأمان
الطبقة
التفاصيل
Row Level Security
كل مستخدم يصل لبياناته فقط — مُطبق على 9 جداول
Middleware
حماية كل مسارات /dashboard — إعادة توجيه غير المسجلين
getUser() لا getSession()
التحقق من Supabase Auth server مباشرة — أكثر أماناً
Service Role Key
في server-side فقط — لا يظهر للمتصفح أبداً
Cron Secret
يحمي /api/alerts من الاستدعاء العشوائي
Security Invoker Views
Views تعمل بصلاحيات المستخدم الحالي
⚡ الأداء
Cache 30 ثانية في useCachedData — تنقل فوري بين الصفحات
Promise.all في Dashboard — جلب 5 جداول بالتوازي
UserContext — جلب بيانات المستخدم مرة واحدة للـ session
Skeleton Loading — لا شاشة بيضاء أثناء التحميل
revalidate: 300 على stock-price API — cache 5 دقائق
🗺️ خارطة الطريق
قريباً
[ ] صفحة الميزانية الشهرية (جدول budgets جاهز)
[ ] رسوم بيانية تفاعلية (Recharts)
[ ] Pagination للمعاملات
مستقبلاً
[ ] تصدير تقرير PDF شهري
[ ] اشتراكات مدفوعة (Stripe) — حقل plan جاهز في profiles
[ ] دعم عملات متعددة (SAR, USD, JOD)
[ ] تطبيق PWA قابل للتثبيت
[ ] إشعارات Push / Email
👨‍💻 المطور
�

عبدالله رافع أبوصغيرة
مطور Full-Stack | عمّان، الأردن
[
�
Load image
](https://abdoocoder-portfolio.vercel.app)
[
�
Load image
](https://github.com/Abdoocoder)
�

�

بُني بـ ❤️ وكثير من ☕
⭐ أعطِ المشروع نجمة إذا أفادك
�
