# FinanceTracker — إدارة مالية SaaS

تطبيق ويب لإدارة الشؤون المالية الشخصية مع دعم متعدد المستخدمين.

## التقنيات المستخدمة
- **Next.js 15** — React framework
- **Supabase** — قاعدة البيانات والمصادقة
- **Tailwind CSS** — التصميم
- **Vercel** — الاستضافة والـ Cron Jobs
- **GitHub** — إدارة الكود

---

## خطوات الإعداد

### 1. إنشاء مشروع Supabase
1. اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً
2. من **SQL Editor**، شغّل محتوى ملف `supabase/migrations/001_initial.sql` كاملاً
3. من **Settings → API**، انسخ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. إعداد المشروع محلياً
```bash
# Clone المشروع
git clone https://github.com/yourusername/financetracker.git
cd financetracker

# نسخ متغيرات البيئة
cp .env.local.example .env.local
# عدّل .env.local وأضف قيمك من Supabase

# تثبيت الحزم
npm install

# تشغيل محلياً
npm run dev
```

### 3. رفع على Vercel
```bash
# تثبيت Vercel CLI
npm i -g vercel

# رفع المشروع
vercel

# إضافة Environment Variables في Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# CRON_SECRET (أي نص عشوائي مثل: abc123xyz)
```

### 4. تفعيل Cron Job (التنبيهات التلقائية)
في Vercel Dashboard:
1. اذهب إلى **Settings → Cron Jobs**
2. تأكد أن `vercel.json` يحتوي على الـ cron (موجود بالفعل)
3. الـ Cron يعمل يومياً الساعة 7 صباحاً ويولّد تنبيهات ذكية

---

## هيكل المشروع

```
app/
├── (auth)/
│   ├── login/         صفحة الدخول
│   └── register/      صفحة التسجيل
├── (dashboard)/
│   ├── dashboard/     الرئيسية - ملخص كامل
│   ├── transactions/  المعاملات (دخل + مصاريف)
│   ├── debts/         الديون + خطة السداد
│   ├── investments/   المحفظة (SPUS + BTC)
│   ├── goals/         أهداف الادخار
│   └── alerts/        التنبيهات الذكية
├── api/
│   └── alerts/        Cron Job للتنبيهات
└── page.tsx           Landing page
```

---

## الميزات

### ✅ مكتملة
- [ ] تسجيل الدخول / إنشاء حساب (Supabase Auth)
- [ ] Dashboard رئيسي بإحصائيات شهرية
- [ ] إدارة الديون مع تتبع الدفعات وشريط التقدم
- [ ] المحفظة الاستثمارية (SPUS, BTC) مع P&L
- [ ] نظام تنبيهات ذكي (يومي / أسبوعي / شهري)
- [ ] Cron Job تلقائي يعمل كل يوم الساعة 7 صباحاً
- [ ] تصميم RTL عربي كامل
- [ ] Row Level Security في Supabase (كل مستخدم يرى بياناته فقط)
- [ ] جاهز كـ SaaS متعدد المستخدمين

### 🔜 للتطوير المستقبلي
- [ ] صفحة المعاملات مع فلترة وبحث
- [ ] صفحة الأهداف التوفيرية
- [ ] رسوم بيانية (Recharts)
- [ ] تصدير PDF شهري
- [ ] اشتراكات مدفوعة (Stripe)
- [ ] إشعارات Push / Email

---

## قاعدة البيانات

| الجدول | الوصف |
|---|---|
| `profiles` | بيانات المستخدمين |
| `transactions` | المعاملات (دخل/مصاريف) |
| `debts` | الديون |
| `debt_payments` | سجل دفعات الديون |
| `investments` | الأصول الاستثمارية |
| `investment_transactions` | عمليات الشراء والبيع |
| `budgets` | الميزانيات الشهرية |
| `alerts` | التنبيهات |
| `savings_goals` | أهداف الادخار |

---

## الأمان

- **Row Level Security (RLS)**: كل مستخدم يصل لبياناته فقط
- **Service Role Key**: محمية في الـ Server-side فقط
- **Middleware**: حماية جميع مسارات الـ dashboard
- **Cron Secret**: تأمين endpoint التنبيهات

---

## التطوير كـ SaaS

لتحويل المشروع لـ SaaS مدفوع:
1. أضف **Stripe** لإدارة الاشتراكات
2. أضف `plan` field في `profiles` (موجود بالفعل: `free` / `pro`)
3. قيّد بعض الميزات للمستخدمين المدفوعين
4. أضف webhook لتحديث الـ plan بعد الدفع

---

بُني بـ ❤️ لعبدالله رافع أبو صغيرة
