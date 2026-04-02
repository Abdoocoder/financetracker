# تقرير مراجعة منطق الحساب في تطبيق FAJRAK المالي

## المحتويات

1. [1. الإطار المفاهيمي](#1-الإطار-المفاهيمي)
2. [2. تعريف الأصول والالتزامات](#2-تعريف-الأصول-والالتزامات)
3. [3. الدخل والمصاريف](#3-الدخل-والمصاريف)
4. [4. الديون والقروض](#4-الديون-والقروض)
5. [5. العملات والتوقيت المحاسبي](#5-العملات-والتوقيت-المحاسبي)
6. [6. الأخطاء المحتملة والتوصيات](#6-الأخطاء-المحتملة-والتوصيات)
7. [7. بنية البيانات المقترحة](#7-بنية-البيانات-المقترحة)
8. [8. نموذج المعادلات](#8-نموذج-المعادلات)
9. [9. جداول العلاقات](#9-جداول-العلاقات)
10. [10. أمثلة عملية](#10-أمثلة-عملية)
11. [11. اختبارات الوحدة](#11-اختبارات-الوحدة)
12. [12. الخلاصة والتوصيات](#12-الخلاصة-والتوصيات)

---

## 1. الإطار المفاهيمي

### 1.1 التعريفات الأساسية

| المصطلح | التعريف | القيمة المستخدمة |
|----------|---------|-----------------|
| **صافي الثروة (Net Worth)** | إجمالي الأصول - إجمالي الالتزامات | `إجمالي الأصول - إجمالي الديون` |
| **الأصول (Assets)** | كل ما يملكه المستخدم من نقود واستثمارات ومدخرات | `حسابات + استثمارات + مدخرات + ذمم` |
| **الالتزامات (Liabilities)** | كل ما على المستخدم دفعه للآخرين | `ديون مستحقة` |
| **الدخل (Income)** | التدفقات المالية الواردة | `type = 'income'` |
| **المصاريف (Expenses)** | التدفقات المالية الصادرة | `type = 'expense'` |

### 1.2 معادلة صافي الثروة

```
صافي الثروة = (إجمالي رصيد الحسابات + قيمة الاستثمارات + المدخرات + الذمم المدينة) - الديون المستحقة
```

---

## 2. تعريف الأصول والالتزامات

### 2.1 الأصول

```dart
// Flutter - finance_utils.dart:28-36
static double calculateNetWorth({
  required double totalAccountBalances,  // رصيد الحسابات
  required double totalDebt,              // الديون (سلبي)
  required double totalReceivable,        // الذمم المدينة
  required double investmentValue,        // قيمة الاستثمارات
  required double savingsGoalsValue,     // المدخرات
}) {
  return totalAccountBalances + investmentValue + savingsGoalsValue - totalDebt + totalReceivable;
}
```

### 2.2 أنواع الأصول في التطبيق

| نوع الأصل | الوصف | طريقة التقييم |
|-----------|-------|---------------|
| **الحسابات النقدية** | cash, bank, savings, credit_card | القيمة الدفترية (opening_balance + المعاملات) |
| **الاستثمارات** | stocks, ETFs, crypto | القيمة السوقية (current_price) |
| **مدخرات الأهداف** | savings_goals | القيمة الدفترية (current_amount) |
| **الذمم المدينة** | debts (receivable) | القيمة المستحقة (remaining_amount) |

### 2.3 الالتزامات

| نوع الالتزام | الوصف | طريقة التقييم |
|--------------|-------|---------------|
| **الديون المستحقة** | debts (owed) | القيمة المتبقية (remaining_amount) |

### 2.4 القيمة السوقية vs القيمة الدفترية

| المكون | الطريقة | المشكلة المحتملة |
|--------|---------|-----------------|
| **الحسابات** | القيمة الدفترية | ✅ صحيح - مجرد جمع حسابي |
| **الاستثمارات** | القيمة السوقية | ⚠️ قد لا تُحدَّث تلقائياً |
| **مدخرات الأهداف** | القيمة الدفترية | ✅ صحيح |
| **الديون** | القيمة الدفترية | ✅ صحيح |

---

## 3. الدخل والمصاريف

### 3.1 هيكل المعاملات

```typescript
// types/index.ts:38-57
interface Transaction {
  id: string
  user_id: string
  type: TransactionType  // 'income' | 'expense' | 'transfer'
  category: string
  amount: number
  original_amount?: number      // المبلغ بالعملة الأصلية
  original_currency?: string    // العملة الأصلية
  exchange_rate?: number        // سعر الصرف
  description: string | null
  transaction_date: string
  is_recurring: boolean
  // ...
}
```

### 3.2 حساب رصيد الحساب

```dart
// Flutter - finance_utils.dart:4-26
static double calculateAccountBalance({
  required String accountId,
  required double openingBalance,
  required List<Map<String, dynamic>> transactions,
}) {
  double income = 0, expense = 0, xferIn = 0, xferOut = 0;
  for (final tx in transactions) {
    final amt = (tx['amount'] as num).toDouble();
    final type = tx['type'] as String?;
    final fromId = tx['account_id'] as String?;
    final toId = tx['transfer_to_account_id'] as String?;

    if (fromId == accountId) {
      if (type == 'income') income += amt;
      if (type == 'expense') expense += amt;
      if (type == 'transfer') xferOut += amt;
    }
    if (toId == accountId && type == 'transfer') {
      xferIn += amt;
    }
  }
  return openingBalance + income - expense + xferIn - xferOut;
}
```

### 3.3 معادلة صافي الرصيد الشهري

```typescript
// useFinancialSummary.ts:35-38
const income       = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
const expenses     = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
const debtPayments = debts.filter(d => !d.is_paid).reduce((a, d) => a + d.monthly_payment, 0)
const net          = income - expenses - debtPayments
```

### 3.4 تصنيفات الدخل والمصاريف

```typescript
// types/index.ts:210-230
export const EXPENSE_CATEGORIES = [
  'إيجار / قسط', 'مواصلات', 'طعام وشراب', 'فواتير',
  'صحة', 'تعليم', 'ترفيه', 'صلة رحم', 'ملابس', 'أخرى'
] as const

export const INCOME_CATEGORIES = [
  'راتب', 'عمل حر', 'استثمار', 'مكافأة', 'أخرى'
] as const
```

---

## 4. الديون والقروض

### 4.1 هيكل الديون

```typescript
// types/index.ts:75-95
interface Debt {
  id: string
  user_id: string
  name: string
  original_amount: number              // المبلغ الأصلي
  original_amount_foreign?: number    // المبلغ الأصلي بالعملة الأجنبية
  remaining_amount: number            // المبلغ المتبقي
  remaining_amount_foreign?: number   // المتبقي بالعملة الأجنبية
  currency?: string                   // العملة
  exchange_rate?: number              // سعر الصرف
  monthly_payment: number             // القسط الشهري
  due_date: string | null              // تاريخ الاستحقاق
  priority: number                    // الأولوية (1-5)
  notes: string | null
  is_paid: boolean                    // هل تم السداد
  debt_type: 'owed' | 'receivable'    // نوع الدين
  payment_day?: number | null         // يوم الدفع الشهري
  auto_deduct?: boolean               // خصم تلقائي
}
```

### 4.2 معالجة الديون

```dart
// debts_screen.dart:232-239
final totalRemaining = _debts.fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
final totalOriginal = _debts.fold(0.0, (a, d) => a + (d['original_amount'] as num).toDouble());
final totalMonthly = _debts.fold(0.0, (a, d) => a + (d['monthly_payment'] as num).toDouble());
final totalReceivable = _receivableDebts.fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
```

### 4.3 عند استلام الدين

```dart
// debts_screen.dart:176-193
await Supabase.instance.client.from('debts').update({'is_paid': true}).eq('id', debt['id']);
await Supabase.instance.client.from('transactions').insert({
  'user_id': user.id,
  'type': 'income',
  'amount': debt['remaining_amount'],
  'category': 'دين مستلم',
  'description': 'استلام دين: ${debt['name']}',
  'transaction_date': DateTime.now().toIso8601String().split('T')[0],
});
```

### 4.4 حساب صافي الثروة مع الديون

```dart
// dashboard_screen.dart:123
final netWorth = invValue + goalsSaved - totalDebt + totalReceivable;
```

---

## 5. العملات والتوقيت المحاسبي

### 5.1 دعم العملات المتعددة

```sql
-- supabase/migrations/002_multi_currency.sql
-- إضافة دعم العملات في جدول الحسابات
opening_balance numeric(15,2) default 0,
currency text default 'JOD',
```

### 5.2 التعامل مع العملات الأجنبية في الديون

```typescript
// types/index.ts:80-84
original_amount_foreign?: number   // المبلغ بالعملة الأجنبية
remaining_amount_foreign?: number  // المتبقي بالعملة الأجنبية
exchange_rate?: number             // سعر الصرف
```

### 5.3 التوقيت المحاسبي

```typescript
// useFinancialSummary.ts:21-23
const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
const lastDay  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`
```

### 5.4 اعتراف الإيراد والمصروفات

- **التوقيت**: `transaction_date` (التاريخ الفعلي للمعاملة)
- **تاريخ الإنشاء**: `created_at` (طابع زمني)
- **التحقق**: يتم تصفية الدخل والمصاريف حسب الشهر الحالي

---

## 6. الأخطاء المحتملة والتوصيات

### 6.1 الأخطاء المكتشفة

| المشكلة | الملف | الخط | التأثير |
|---------|-------|------|--------|
| عدم احتساب رصيد الحسابات في صافي الثروة | dashboard_screen.dart | 123 | ❌ صافي الثروة ناقص |
| اختفاء رصيد الحسابات من المعادلة | page.tsx (web) | 219 | ❌ خطأ في الحساب |
| عدم التحقق من تقادم الاستثمارات | investments_service.dart | - | ⚠️ قديمة |
| عدم تحديث أسعار العملات | currency.ts | - | ⚠️ قديمة |

### 6.2 الفوارق المكتشفة

```typescript
// Flutter (صحيح)
netWorth = totalAccountBalances + investmentValue + savingsGoalsValue - totalDebt + totalReceivable

// Web (خطأ محتمل - يفترض أن netWorth = invValue فقط)
netWorth: invValueLocal  // page.tsx:219
```

### 6.3 التوصيات

1. **إصلاح حساب صافي الثروة في Web**: إضافة `totalAccountBalances` و `savingsGoalsValue`
2. **تحديث دوري لأسعار الأسهم والعملات**: إضافة job للـ background
3. **التحقق من تقادم البيانات**: إضافة تاريخ آخر تحديث لكل أصل
4. **إضافة سجل للمدفوعات**: استخدام `debt_payments` بدلاً من تحديث `remaining_amount` مباشرة

---

## 7. بنية البيانات المقترحة

### 7.1 جدول الأصول (Assets)

```sql
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN (
    'real_estate', 'vehicle', 'gold', 'other'
  )),
  value numeric(15,2) NOT NULL,
  purchase_date date,
  currency text DEFAULT 'JOD',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 7.2 جدول التقييم الدوري (Asset Valuations)

```sql
CREATE TABLE public.asset_valuations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  value numeric(15,2) NOT NULL,
  valuation_date date NOT NULL,
  valuation_method text DEFAULT 'market',  -- 'market', 'appraisal', 'cost'
  created_at timestamptz DEFAULT now()
);
```

### 7.3 جدول مصروفات الديون (Debt Payments)

```sql
-- موجود بالفعل
CREATE TABLE public.debt_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id uuid REFERENCES public.debts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

---

## 8. نموذج المعادلات

### 8.1 حساب رصيد الحساب

```
balance = opening_balance + Σ(income) - Σ(expenses) + Σ(transfers_in) - Σ(transfers_out)
```

### 8.2 حساب صافي الرصيد الشهري

```
net_monthly = Σ(income) - Σ(expenses) - Σ(debt_payments)
```

### 8.3 حساب صافي الثروة

```
net_worth = 
  Σ(balances) +                 // رصيد جميع الحسابات
  Σ(current_price × shares) +  // قيمة الاستثمارات
  Σ(current_amount) +            // مدخرات الأهداف
  Σ(receivable) -               // الذمم المدينة
  Σ(remaining_amount)          // الديون المستحقة
```

### 8.4 نسبة الادخار

```
savings_rate = (income - expenses) / income
```

### 8.5 نسبة الديون إلى الدخل

```
debt_to_income = total_debt / (monthly_income × 12)
```

### 8.6 نسبة الطوارئ

```
emergency_ratio = savings_goals / (monthly_income × 3)
```

---

## 9. جداول العلاقات

### 9.1 علاقات قاعدة البيانات

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   profiles  │────<│ transactions│     │   debts     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       v                   v                   v
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  accounts   │     │ recurring   │     │debt_payments│
└─────────────┘     └─────────────┘     └─────────────┘
       │
       v
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│savings_goals│     │investments  │────<│inv_transactions
└─────────────┘     └─────────────┘     └─────────────┘
```

### 9.2 جدول مقارنة الأنظمة

| الوظيفة | Flutter | Web |
|---------|---------|-----|
| رصيد الحساب | ✅ `FinanceUtils.calculateAccountBalance` | ✅ `useAccounts` |
| صافي الثروة | ✅ `calculateNetWorth` | ❌ ناقص |
| الديون | ✅ `debts_screen.dart` | ✅ `debts/page.tsx` |
| الاستثمارات | ✅ `investments_screen.dart` | ⚠️ جزئي |

---

## 10. أمثلة عملية

### 10.1 مثال 1: حساب رصيد الحساب

```dart
// المدخلات
openingBalance = 1000.0
transactions = [
  {'account_id': 'acc1', 'type': 'income', 'amount': 500},
  {'account_id': 'acc1', 'type': 'expense', 'amount': 300},
  {'account_id': 'acc1', 'type': 'transfer', 'amount': 200, 'transfer_to_account_id': 'acc2'},
  {'account_id': 'acc0', 'type': 'transfer', 'amount': 400, 'transfer_to_account_id': 'acc1'},
]

// الحساب
income = 500
expense = 300
xferOut = 200
xferIn = 400

// النتيجة
balance = 1000 + 500 - 300 - 200 + 400 = 1400
```

### 10.2 مثال 2: حساب صافي الثروة

```dart
// المدخلات
totalAccountBalances = 5000
investmentValue = 2000
savingsGoalsValue = 1500
totalDebt = 3000
totalReceivable = 500

// الحساب
netWorth = 5000 + 2000 + 1500 - 3000 + 500 = 6000
```

### 10.3 مثال 3: حالة حدية - دين بالعملة الأجنبية

```dart
// المدخلات
originalAmount = 10000       // باليورو
originalAmountForeign = 10000
remainingAmount = 5000       // باليورو
remainingAmountForeign = 5000
exchangeRate = 0.85          // 1 EUR = 0.85 JOD (مثال)

// تحويل للعملة المحلية
remainingAmountInJOD = 5000 * 0.85 = 4250 JOD
```

### 10.4 مثال 4: دفعة دين

```dart
// قبل الدفعة
debt = {
  'remaining_amount': 500,
  'original_amount': 1000,
  'is_paid': false
}

// بعد الدفعة
newRemainingAmount = 0
isPaid = true

// معاملة القبض
transaction = {
  'type': 'income',
  'amount': 500,
  'category': 'دين مستلم'
}
```

### 10.5 مثال 5: حالة حدية - رصيد سالب

```dart
// المدخلات
openingBalance = 100
transactions = [
  {'account_id': 'acc1', 'type': 'expense', 'amount': 500},
]

// الحساب
balance = 100 - 500 = -400

// هذا يعني أن الحساب تجاوز رصيده
// يجب تنبيه المستخدم
```

---

## 11. اختبارات الوحدة

### 11.1 اختبار حساب رصيد الحساب

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

### 11.2 اختبار حساب صافي الثروة

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

### 11.3 اختبارات إضافية مقترحة

```dart
group('Edge Cases', () {
  test('should handle empty transactions', () {
    final balance = FinanceUtils.calculateAccountBalance(
      accountId: 'acc1',
      openingBalance: 100,
      transactions: [],
    );
    expect(balance, 100.0);
  });

  test('should handle negative balance', () {
    final transactions = [
      {'account_id': 'acc1', 'type': 'expense', 'amount': 500},
    ];
    final balance = FinanceUtils.calculateAccountBalance(
      accountId: 'acc1',
      openingBalance: 100,
      transactions: transactions,
    );
    expect(balance, -400.0);
  });

  test('should handle zero debt', () {
    final nw = FinanceUtils.calculateNetWorth(
      totalAccountBalances: 1000,
      totalDebt: 0,
      totalReceivable: 0,
      investmentValue: 500,
      savingsGoalsValue: 100,
    );
    expect(nw, 1600.0);
  });

  test('should handle negative net worth', () {
    final nw = FinanceUtils.calculateNetWorth(
      totalAccountBalances: 100,
      totalDebt: 500,
      totalReceivable: 0,
      investmentValue: 0,
      savingsGoalsValue: 0,
    );
    expect(nw, -400.0);
  });
});
```

### 11.4 اختبارات تكامل

```typescript
// useFinancialSummary.test.ts
describe('useFinancialSummary', () => {
  it('should calculate net correctly for positive balance', () => {
    // Given
    const income = 5000;
    const expenses = 3000;
    const debtPayments = 500;
    
    // When
    const net = income - expenses - debtPayments;
    
    // Then
    expect(net).toBe(1500);
  });

  it('should handle zero income', () => {
    const net = 0 - 1000 - 0;
    expect(net).toBe(-1000);
  });
});
```

### 11.5 اختبارات للتحقق من الاتساق

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

## 12. الخلاصة والتوصيات

### 12.1 نقاط القوة

- ✅ بنية بيانات جيدة تدعم المعاملات المتعددة العملات
- ✅ فصل واضح بين أنواع الديون (مستحق/مستلم)
- ✅ دعم التحويلات بين الحسابات
- ✅ حساب المدخرات والأهداف منفصلاً

### 12.2 نقاط الضعف

- ❌ عدم احتساب رصيد الحسابات في صافي الثروة (Web)
- ⚠️ عدم تحديث أسعار الاستثمارات تلقائياً
- ⚠️ عدم استخدام جدول debt_payments بشكل كامل

### 12.3 الإصلاحات المطلوبة

1. إصلاح `page.tsx` (Web) لاستخدام المعادلة الصحيحة
2. إضافة job لتحديث أسعار الاستثمارات
3. تحسين وثائق المعادلات
4. إضافة اختبارات تكامل
