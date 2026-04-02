# وثيقة تحليل منطق الحساب في تطبيق FAJRAK المالي

**إصدار:** 1.0  
**التاريخ:** 2 أبريل 2026  
**الجهة:** فريق هندسة البرمجيات  
**الغرض:** استخراج وتوثيق منطق الحساب والقواعد المحاسبية المعتمدة

---

## 1. خريطة بنية النظام عالية المستوى

### 1.1 المكونات الرئيسية

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           تطبيق FAJRAK                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐         ┌──────────────────────┐                  │
│  │     Web (Next.js)    │         │   Mobile (Flutter)  │                  │
│  │                      │         │                      │                  │
│  │  • Dashboard         │         │  • Dashboard        │                  │
│  │  • Transactions      │         │  • Transactions     │                  │
│  │  • Accounts          │         │  • Accounts         │                  │
│  │  • Debts             │         │  • Debts            │                  │
│  │  • Investments       │         │  • Investments      │                  │
│  │  • Budgets           │         │  • Budgets          │                  │
│  │  • Goals             │         │  • Goals            │                  │
│  │  • Reports           │         │  • Reports          │                  │
│  └──────────┬───────────┘         └──────────┬───────────┘                  │
│             │                                │                              │
│             └────────────┬───────────────────┘                              │
│                          │                                                  │
│                          ▼                                                  │
│              ┌──────────────────────────┐                                  │
│              │   Supabase Backend        │                                  │
│              │   (PostgreSQL + Auth)     │                                  │
│              │                           │                                  │
│              │  • Database               │                                  │
│              │  • Row Level Security    │                                  │
│              │  • Edge Functions        │                                  │
│              │  • Real-time Subscriptions│                                 │
│              └──────────────────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 التبعيات والمكتبات

| المكون | التقنيات | الإصدار |
|--------|----------|---------|
| Frontend Web | Next.js, React, TypeScript | Next.js 16.2.1, React 19.2.4 |
| Frontend Mobile | Flutter, Dart | Flutter (المذكور في pubspec) |
| Backend | Supabase, PostgreSQL | Supabase SSR 0.5.1 |
| State Management | React Hooks | React 19 |
| Styling | Tailwind CSS | 3.4.15 |
| Charts | Recharts | 3.8.0 |
| Push Notifications | Firebase | 12.10.0 |
| Error Tracking | Sentry | 10.46.0 |

### 1.3 التكامل مع أنظمة ERP/GL

**الحالة الراهنة:**
- التطبيق يعمل كـ **نظام تخطيط مالي شخصي (PFM)** وليس نظام محاسبي متكامل
- **لا يوجد تكامل مباشر** مع أنظمة ERP أو GL خارجية
- البيانات تُصدَّر بتنسيق CSV للتحويل اليدوي

**نقاط التكامل المحتملة (مستقبلية):**
1. **تصدير JSON/CSV**: لإمكانية الاستيراد في أنظمة محاسبية
2. **Webhooks**: للتنبيه عند حدوث معاملات معينة
3. **API REST**: للتكامل مع أنظمة أخرى (غير متوفر حالياً)

---

## 2. مخطط تدفق البيانات

### 2.1 تدفق البيانات من المصدر إلى الإبلاغ النهائي

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         تدفق البيانات                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [مدخلات المستخدم]                                                          │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │ إضافة دخل   │    │ إضافة مصروف │    │ تحويل بين   │                   │
│  │ (income)    │    │ (expense)   │    │ حسابات      │                   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                   │
│         │                  │                  │                            │
│         └──────────────────┼──────────────────┘                            │
│                            │                                                │
│                            ▼                                                │
│                   ┌─────────────────┐                                      │
│                   │  قيد المعاملة   │                                      │
│                   │ (Transaction)   │                                      │
│                   │                 │                                      │
│                   │ • amount        │◄─── نقطة التحقق 1                    │
│                   │ • category      │    (التحقق من صحة المبلغ)             │
│                   │ • account_id   │                                       │
│                   │ • currency     │                                       │
│                   │ • exchange_rate│                                       │
│                   └────────┬────────┘                                      │
│                            │                                                │
│                            ▼                                                │
│                   ┌─────────────────┐                                      │
│                   │   PostgreSQL    │                                      │
│                   │  (transactions) │                                      │
│                   └────────┬────────┘                                      │
│                            │                                                │
│          ┌─────────────────┼─────────────────┐                              │
│          │                 │                 │                              │
│          ▼                 ▼                 ▼                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                      │
│  │ حساب رصيد   │   │  monthly_   │   │  التقارير   │                      │
│  │ الحساب      │   │  summary    │   │  الدورية   │                      │
│  │             │   │  view        │   │             │                      │
│  │ • opening_  │   │             │   │ • Income    │                      │
│  │   balance   │   │ • total_    │   │ • Expenses  │                      │
│  │ • income    │   │   income    │   │ • Net       │                      │
│  │ • expense   │   │ • total_    │   │ • by month  │                      │
│  │ • xfer_in   │   │   expenses  │   │ • by cat    │                      │
│  │ • xfer_out  │   │ • net_      │   │             │                      │
│  │             │   │   balance   │   │             │                      │
│  └─────────────┘   └─────────────┘   └─────────────┘                      │
│          │                 │                 │                              │
│          └─────────────────┼─────────────────┘                              │
│                            │                                                │
│                            ▼                                                │
│                   ┌─────────────────┐                                      │
│                   │    الإبلاغ       │                                      │
│                   │    النهائي       │                                      │
│                   │                  │                                      │
│                   │ • الرصيد الحالي  │◄─── نقطة التحقق 2                    │
│                   │ • صافي الثروة    │    (توازن المعادلات)                 │
│                   │ • ملخص الشهري    │                                       │
│                   └──────────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 نقاط التحول والقواعد المرتبطة

| المرحلة | العملية | القواعد |
|----------|---------|---------|
| **1. إدخال المعاملة** | المستخدم يدخل تفاصيل المعاملة | • المبلغ موجب<br>• الفئة مطلوبة<br>• التاريخ صحيح |
| **2. حفظ المعاملة** | Supabase insert/update | • RLS: المستخدم يملك المعاملة<br>• تحويل العملة (إن وُجد)<br>• تعيين الحساب الافتراضي |
| **3. حساب الرصيد** | تحميل المعاملات وحساب الرصيد | •opening_balance +دخل -مصروف +تحويل_داخل -تحويل_خارج |
| **4. ملخص الشهري** | تجميع حسب الشهر | •transaction_date في الشهر<br>• تجميع حسب النوع |
| **5. صافي الثروة** | تجميع الأصول والالتزامات | •الأصول = حسابات + استثمارات + مدخرات + ذمم<br>•الالتزامات = ديون<br>•صافي = أصول - التزامات |

---

## 3. نموذج كيان-علاقة (ER)

### 3.1 الجداول الأساسية

```
┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │    accounts     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ full_name       │       │ user_id (FK)    │
│ currency        │──────<│ name            │
│ monthly_income  │       │ type            │
│ opening_balance │       │ opening_balance │
│ timezone        │       │ currency        │
│ plan            │       │ color           │
│ created_at      │       │ icon            │
│ updated_at      │       │ is_default      │
└─────────────────┘       │ is_archived     │
        │                  │ created_at      │
        │                  │ updated_at      │
        │                  └────────┬────────┘
        │                           │
        │                           │
        ▼                           ▼
┌─────────────────┐       ┌─────────────────┐
│  transactions   │       │  debts          │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │
│ type            │       │ name            │
│ category        │       │ original_amount │
│ amount          │       │ remaining_amount│
│ original_amount │       │ monthly_payment │
│ original_currency│      │ due_date        │
│ exchange_rate   │       │ priority        │
│ description     │       │ is_paid         │
│ transaction_date│       │ debt_type       │
│ is_recurring    │       │ auto_deduct     │
│ account_id (FK) │       │ created_at      │
│ transfer_to_    │       │ updated_at      │
│   account_id    │       └────────┬────────┘
│ transfer_pair_id │                │
│ created_at      │                │
└────────┬────────┘                │
         │                         │
         │                         ▼
         │               ┌─────────────────┐
         │               │ debt_payments   │
         │               ├─────────────────┤
         │               │ id (PK)         │
         │               │ debt_id (FK)    │
         │               │ user_id (FK)    │
         │               │ amount          │
         │               │ payment_date    │
         │               │ created_at      │
         │               └─────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐
│ investments     │       │  budgets        │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │
│ symbol          │       │ category        │
│ name            │       │ monthly_limit   │
│ type            │       │ month           │
│ shares          │       │ year            │
│ avg_buy_price   │       │ created_at      │
│ current_price   │       └─────────────────┘
│ currency        │
│ is_halal        │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ investment_transactions
├─────────────────────┤
│ id (PK)            │
│ investment_id (FK) │
│ user_id (FK)       │
│ type               │
│ shares             │
│ price              │
│ commission         │
│ transaction_date   │
│ created_at         │
└─────────────────────┘
```

### 3.2 القيم الأساسية وأنواع البيانات

| الجدول | الحقل | النوع | القيم المسموحة | القيمة الافتراضية |
|--------|-------|-------|---------------|------------------|
| **accounts** | type | text | 'cash', 'bank', 'savings', 'credit_card' | 'bank' |
| **accounts** | is_default | boolean | true/false | false |
| **accounts** | is_archived | boolean | true/false | false |
| **transactions** | type | text | 'income', 'expense', 'transfer' | - |
| **transactions** | category | text | (محدد في الكود) | - |
| **debts** | debt_type | text | 'owed', 'receivable' | 'owed' |
| **debts** | priority | integer | 1-5 | 3 |
| **debts** | is_paid | boolean | true/false | false |
| **investments** | type | text | 'stock', 'etf', 'crypto', 'other' | - |
| **investments** | is_halal | boolean | true/false | true |
| **profiles** | plan | text | 'free', 'pro' | 'free' |

### 3.3 حقول القيد (Constraint Fields)

```sql
-- constraints في جدول المعاملات
CHECK (type IN ('income', 'expense', 'transfer'))
CHECK (recurring_day BETWEEN 1 AND 31)

-- constraints في جدول الحسابات
CHECK (type IN ('cash', 'bank', 'savings', 'credit_card'))

-- constraints في جدول الاستثمارات
CHECK (type IN ('stock', 'etf', 'crypto', 'other'))

-- constraints في جدول الديون
CHECK (priority BETWEEN 1 AND 5)
```

### 3.4 أصول الحسابات

| نوع الأصل | الحساب | الوصف |
|-----------|--------|-------|
| **حسابات نقدية** | cash | المبالغ النقدية المتوفرة |
| **حسابات بنكية** | bank | أرصدة الحسابات البنكية |
| **حسابات توفير** | savings | ودائع التوفير |
| **بطاقات ائتمان** | credit_card | الرصيد المتبقي (سلبي) |

### 3.5 قيود الأمان (RLS Policies)

| الجدول | السياسة | الشرط |
|--------|---------|-------|
| profiles | Users can view own profile | auth.uid() = id |
| profiles | Users can update own profile | auth.uid() = id |
| transactions | Users own transactions | auth.uid() = user_id |
| accounts | users_own_accounts | auth.uid() = user_id |
| debts | Users own debts | auth.uid() = user_id |
| investments | Users own investments | auth.uid() = user_id |

---

## 4. القواعد المحاسبية المعتمدة

### 4.1 حساب رصيد الحساب

```
balance = opening_balance + Σ(income) - Σ(expenses) + Σ(transfers_in) - Σ(transfers_out)
```

**الكود المنفذ:**

```typescript
// useAccounts.ts:28-34
const income   = txs.filter(t => t.account_id === acc.id && t.type === 'income').reduce(...)
const expense  = txs.filter(t => t.account_id === acc.id && t.type === 'expense').reduce(...)
const xferIn   = txs.filter(t => t.transfer_to_account_id === acc.id && t.type === 'transfer').reduce(...)
const xferOut  = txs.filter(t => t.account_id === acc.id && t.type === 'transfer').reduce(...)
return acc.opening_balance + income - expense + xferIn - xferOut
```

### 4.2 حساب صافي الرصيد الشهري

```
net_monthly = Σ(income) - Σ(expenses) - Σ(debt_payments)
```

**الكود المنفذ:**

```typescript
// useFinancialSummary.ts:35-38
const income       = transactions.filter(t => t.type === 'income').reduce(...)
const expenses     = transactions.filter(t => t.type === 'expense').reduce(...)
const debtPayments = debts.filter(d => !d.is_paid).reduce(...)
const net          = income - expenses - debtPayments
```

### 4.3 حساب صافي الثروة (Net Worth)

```
net_worth = 
  Σ(balances) +                 // رصيد جميع الحسابات
  Σ(current_price × shares) +  // قيمة الاستثمارات
  Σ(current_amount) +            // مدخرات الأهداف
  Σ(receivable) -               // الذمم المدينة (جمع)
  Σ(remaining_amount)          // الديون المستحقة (طرح)
```

**الكود المنفذ:**

```typescript
// page.tsx:233-237 & dashboard_screen.dart:126
// Using FinanceUtils.calculateNetWorth()
netWorth: accountsBalance
  + invValueLocal
  + goalsSaved
  - totalDebt
  + totalReceivable
```

### 4.4 حساب الزكاة (Zakat Logic)

تعتمد الحسابات على التفقه الشرعي المبرمج في شاشة `ZakatCalculatorScreen`:

**1. الـنـصاب (Nisab):**
- يُحسب كحد أدنى بين نصاب الذهب ونصاب الفضة لحماية مصلحة الفقير.
- **نصاب الذهب:** 85 جرام × سعر الذهب الحالي.
- **نصاب الفضة:** 595 جرام × سعر الفضة الحالي.
- `nisab = min(nisabGold, nisabSilver)`

**2. الـوعـاء الزكوي (Zakatable Assets):**
- الأصول الخاضعة للزكاة = الذهب + الفضة + السيولة النقدية + قيمة الاستثمارات.
- صافي الوعاء = الأصول - الديون المستحقة.
- `zakatable = (assets - debts).clamp(0, infinity)`

**3. الـقدر الواجب (Zakat Due):**
- نسبة الزكاة: **2.5%** من صافي الوعاء الزكوي.
- يُصرف فقط إذا تجاوز صافي الوعاء قيمة النصاب.
- `zakatDue = totalZakatable >= nisab ? totalZakatable * 0.025 : 0`

**4. الـحـول (Haul):**
- يُحسب الحول الفلكي (الهجري) بـ **354 يوماً**.
- يبدأ الحول من تاريخ شراء الاستثمار (`purchase_date`) أو تاريخ إنشاء السجل.

### 4.5 قواعد دقة العملات (Currency Precision)

يتم التعامل مع العملات بدقة متفاوتة حسب الملف `CurrencyService.dart`:

| العملة | الخانات العشرية (Decimals) |
|--------|--------------------------|
| JOD, KWD, BHD, OMR, IQD, LYD, TND | 3 خانات |
| IDR, JPY | 0 خانات |
| USD, SAR, AED, EUR, EGP, Others | خانتان |

- يتم جلب أسعار الصرف من مصدر خارجي: `https://open.er-api.com/v6/latest`

### 4.6 منطق الميزانية (Budget Warnings)

يتم تصنيف حالة الميزانية في `BudgetProgressCard.dart` بناءً على نسبة المصاريف من الدخل:

| النسبة (Percentage) | اللون | الحالة |
|--------------------|--------|--------|
| **> 90%** | أحمر | خطر التجاوز |
| **> 70%** | برتقالي | تحذير |
| **< 70%** | أخضر | وضع آمن |

- المعادلة: `percentage = expenses / income` (بحد أقصى 1.0)

### 4.9 التقارير

| التقرير | الوصف | المصدر |
|---------|-------|--------|
| ملخص شهري | إجمالي الدخل والمصروفات والصافي | monthly_summary view |
| ملخص الديون | إجمالي الديون والمدفوعات ونسبة السداد | debt_summary view |
| رصيد الحسابات | رصيد كل حساب على حدة | transactions + accounts |
| صافي الثروة | قيمة الأصول ناقص الالتزامات | حسابات + استثمارات + أهداف + ديون |

---

## 5. الحالات الحدية والمشكلات المحتملة

### 5.1 قائمة أهم الحالات الحدية

| # | الحالة | التأثير | المعالجة الحالية |
|---|--------|---------|------------------|
| 1 | رصيد سالب (overspent) | تحذير المستخدم | ✅ يظهر لون مختلف |
| 2 | عملة أجنبية | تحويل صحيح | ✅ exchange_rate |
| 3 | معاملة بدون حساب | تعيين افتراضي | ✅ trigger |
| 4 | تاريخ مستقبلي | السماح | ✅ مسموح |
| 5 | تاريخ قديم | السماح | ✅ مسموح |
| 6 | دين مدفوع بالكامل | set is_paid=true | ✅ علامة |
| 7 | استثمار بدون معاملات | القيمة السوقية فقط | ✅ current_price |
| 8 | هدف مدخرات محقق | نسبة 100% | ✅ عرض النسبة |
| 9 | تحويل لنفس الحساب | خطأ محتمل | ⚠️ غير معالج |
| 10 | عدة حسابات افتراضية | خطأ | ✅ unique constraint |

### 5.2 المشكلات المحتملة المكتشفة

**المشكلة 1: عدم تحديث أسعار الاستثمارات تلقائياً**
- التأثير: قد تكونPrices قديمة
- الأولوية: متوسطة
- الحل المقترح: إضافة Cron job لتحديث الأسعار

**المشكلة 2: عدم تحديث أسعار العملات**
- التأثير: قد تكونRates قديمة
- الأولوية: متوسطة
- الحل المقترح: إضافة تخزين مؤقت مع تحديث يومي

**المشكلة 3: عدم استخدام جدول debt_payments بشكل كامل**
- التأثير: صعوبة تتبع المدفوعات
- الأولوية: عالية
- الحل المقترح: تسجيل كل دفعة في debt_payments

### 5.3 خطط الاختبار والتحقق

**5.3.1 اختبارات وحدة لحساب الرصيد**

```dart
// finance_utils_test.dart
test('calculateAccountBalance should correctly track income, expense, and transfers', () {
  final transactions = [
    {'account_id': 'acc1', 'type': 'income', 'amount': 1000},
    {'account_id': 'acc1', 'type': 'expense', 'amount': 200},
    {'account_id': 'acc1', 'type': 'transfer', 'amount': 300, 'transfer_to_account_id': 'acc2'},
    {'account_id': 'acc0', 'type': 'transfer', 'amount': 500, 'transfer_to_account_id': 'acc1'},
  ];
  final balance = FinanceUtils.calculateAccountBalance(
    accountId: 'acc1',
    openingBalance: 500,
    transactions: transactions,
  );
  // 500 + 1000 - 200 - 300 + 500 = 1500
  expect(balance, 1500.0);
});
```

**5.3.2 اختبارات وحدة لصافي الثروة**

```dart
test('calculateNetWorth should sum correctly', () {
  final nw = FinanceUtils.calculateNetWorth(
    totalAccountBalances: 1000,
    totalDebt: 200,
    totalReceivable: 50,
    investmentValue: 500,
    savingsGoalsValue: 100,
  );
  // 1000 + 500 + 100 - 200 + 50 = 1450
  expect(nw, 1450.0);
});
```

**5.3.3 اختبارات تكامل**

```typescript
// useFinancialSummary.test.ts
describe('useFinancialSummary', () => {
  it('should calculate net correctly for positive balance', () => {
    const income = 5000;
    const expenses = 3000;
    const debtPayments = 500;
    const net = income - expenses - debtPayments;
    expect(net).toBe(1500);
  });
});
```

**5.3.4 اختبارات الاتساق**

```typescript
describe('Net Worth Consistency', () => {
  it('should equal sum of all positive components minus debts', () => {
    const components = {
      accounts: 5000,
      investments: 2000,
      savings: 1000,
      receivable: 300,
      debts: 1500
    };
    const calculatedNetWorth = 
      components.accounts + 
      components.investments + 
      components.savings + 
      components.receivable - 
      components.debts;
    expect(calculatedNetWorth).toBe(6800);
  });
});
```

---

## 6. أسئلة مفتوحة تحتاج إجابة

### 6.1 أسئلة للمالك/فريق المحاسبة

| # | السؤال | الافتراض الحالي |
|---|--------|----------------|
| 1 | هل يُحتسب الدين كسلبي أم يُطرح؟ | يُطرح (net = assets - liabilities) |
| 2 | ما هي سياسة التقريب؟ | رقمان عشريان |
| 3 | هل يُسمح بمعاملات مستقبلية؟ | نعم، مسموح |
| 4 | كيف يتم التعامل مع الفئات الجديدة؟ | يُسمح بأي نص حر |
| 5 | ما هو الحد الأقصى للرصيد؟ | 15 رقم عشري (numeric(15,2)) |
| 6 | هل هناك حاجة لتكامل مع نظام محاسبي؟ | غير محدد |
| 7 | ما هي متطلبات التصدير؟ | CSV فقط |
| 8 | هل تحتاج لنظام إقفال فترات؟ | غير مطلوب حالياً |
| 9 | كيف يتم حساب الزكاة؟ | في شاشة منفصلة |
| 10 | ما هي قواعد التقارير الضريبية؟ | غير محدد |

### 6.2 افتراضات وتوضيحات

1. **العملة الأساسية**: حدد في profile.currency، الافتراضي JOD
2. **التاريخ**: يستخدم transaction_date للمعاملات
3. **الوقت**: timezone من profile، الافتراضي Asia/Amman
4. **التكامل**: لا يوجد تكامل مع أنظمة خارجية حالياً

---

## 7. خطة عمل وتوقيتات

### 7.1 المخرجات القابلة للتسليم

| المخرج | الوصف | الأولوية |
|--------|-------|----------|
| وثيقة المنطق المحاسبي | هذه الوثيقة | عالية |
| اختبارات الوحدة | الموجودة + الجديدة | عالية |
| تقارير مطابقة | قائمة بالتقارير | متوسطة |
| توثيق API | (غير موجود) | منخفضة |

### 7.2 التوقيتات والمهام

```
أسبوع 1:
├──── مراجعة هذه الوثيقة والموافقة
├──── التحقق من الافتراضات
└──── تحديد الأولويات

أسبوع 2:
├──── إصلاح المشكلات الحرجة
├──── إضافة اختبارات الوحدة الناقصة
└──── توثيق الاستثناءات

أسبوع 3:
├──── تحسين التقارير
└──── إضافة اختبارات تكامل

أسبوع 4:
├──── مراجعة نهائية
├──── تدريب فريق QA
└──── إطلاق
```

### 7.3 معايير القبول

| المعيار | الوصف |
|---------|-------|
| AC1 | حساب الرصيد يعطي نتائج صحيحة في 100% من الحالات |
| AC2 | صافي الثروة = الأصول - الالتزامات |
| AC3 | الاختبارات الحالية تمر بنجاح |
| AC4 | لا توجد أخطاء في eslint/typecheck |
| AC5 | التوثيق يغطي جميع العمليات المحاسبية |

---

## 8. المخاطر والتوصيات

### 8.1 المخاطر

| المخاطرة | التأثير | الاحتمالية | الأولوية |
|----------|---------|------------|----------|
| عدم تحديث الأسعار | قرارات خاطئة | عالية | عالية |
| خطأ في التحويلات | أرصدة خاطئة | منخفضة | عالية |
| عدم التوافق بين المنصات | ارتباك المستخدم | متوسطة | متوسطة |
| فقدان البيانات | لا يمكن الاستعادة | منخفضة | عالية |

### 8.2 التوصيات للتحسين والتوحيد

| التوصية | الأولوية | الجهد |
|---------|----------|-------|
| إضافة اختبارات تكامل Web وFlutter | عالية | متوسط |
| توحيد معادلات صافي الثروة | عالية | منخفض |
| إضافة Cron job لتحديث الأسعار | متوسطة | مرتفع |
| إضافة API للتكامل | منخفضة | مرتفع |
| توثيق كل العمليات المحاسبية | متوسطة | متوسط |

### 8.3 نقاط القوة في التطبيق

- ✅ دعم العملات المتعددة
- ✅ نظام الديون (مستحق/مستلم)
- ✅ دعم التحويلات بين الحسابات
- ✅ حساب المدخرات منفصلاً
- ✅ بنية بيانات جيدة

### 8.4 نقاط الضعف

- ⚠️ عدم تحديث أسعار الاستثمارات تلقائياً
- ⚠️ عدم استخدام جدول debt_payments بالكامل
- ⚠️ عدم وجود تكامل مع أنظمة محاسبية

---

## 9. ملاحق

### 9.1 قائمة الملفات المحللة

| الملف | الوصف |
|-------|-------|
| types/index.ts | تعريفات الأنواع |
| hooks/useTransactions.ts | منطق المعاملات |
| hooks/useAccounts.ts | منطق الحسابات |
| hooks/useFinancialSummary.ts | ملخص مالي |
| app/(dashboard)/dashboard/page.tsx | صفحة Dashboard |
| supabase/migrations/001_initial.sql | مخطط قاعدة البيانات |
| supabase/migrations/002_multi_currency.sql | دعم العملات |
| supabase/migrations/019_accounts.sql | نظام الحسابات |
| mobile/fajrak_flutter/lib/utils/finance_utils.dart | utility functions |
| AUDIT_REPORT_AR.md | تقرير المراجعة السابق |

### 9.2 المراجع

- Supabase: <https://supabase.com/docs>
- Next.js: <https://nextjs.org/docs>
- Flutter: <https://flutter.dev/docs>

---

**إعداد:** Kilo AI Agent  
**المراجعة:**_pending_
**الحالة:** مسودة للمراجعة
