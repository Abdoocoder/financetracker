<div align="center">

<img
  src="../../public/icon-512.png"
  alt="Fajrak Logo"
  width="110"
  height="110"
  style="border-radius: 22px;"
/>

# Fajrak Flutter

**تطبيق أندرويد أصلي — Native Android App**

*22 شاشة · 100% Feature Parity · Arabic-First*

---

[![APK](https://img.shields.io/badge/📦_APK-54.5_MB-38ef7d?style=for-the-badge)](https://fajrak.com/download)
[![Google Play](https://img.shields.io/badge/🎯_Google_Play-Closed_Testing-4285F4?style=for-the-badge)](https://fajrak.com/download)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-3.x-0175C2?style=for-the-badge&logo=dart&logoColor=white)](https://dart.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Shared_Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## Table of Contents

- [نظرة عامة](#-نظرة-عامة)
- [هيكل المشروع](#-هيكل-المشروع)
- [الشاشات](#-الشاشات)
- [التقنيات](#️-التقنيات)
- [المتطلبات](#-المتطلبات)
- [الإعداد والتشغيل](#️-الإعداد-والتشغيل)
- [البيئة المشتركة مع الويب](#-البيئة-المشتركة-مع-الويب)
- [نظام الإشعارات](#-نظام-الإشعارات)
- [الترجمة والتوطين](#-الترجمة-والتوطين)
- [النشر](#-النشر)
- [سجل التغييرات](#-سجل-التغييرات)

---

## ✨ نظرة عامة

تطبيق أندرويد أصلي مبني بـ **Flutter** لمنصة **Fajrak** لإدارة المالية.
يشارك نفس قاعدة بيانات Supabase وFirebase مع تطبيق الويب Next.js، مما يضمن
**تزامناً فورياً** بين المنصتين.

> 🎉 **متوفر على متجر Play** — بنيت حزمة `.aab` ورُفعت للاختبار بنجاح!

**مميزات التطبيق:**
- تطابق 100% مع ميزات تطبيق الويب
- **منطق مالي مركزي (Supabase RPC)**: حسابات دقيقة وموحدة مع الويب
- **نظام أسعار مزدوج (Dual-API)**: أسعار حية وموثوقة للأسهم والمعادن
- تصميم عربي أصيل مع دعم RTL الكامل
- إشعارات Firebase FCM عالية الأولوية
- Foreground notifications + Deep Linking
- دعم اللغتين: العربية (الافتراضية) والإنجليزية
- رسوم بيانية تفاعلية (fl_chart)
- إيماءات نشطة (سحب للتحديث، سحب للحذف)

---

## 📁 هيكل المشروع

```
fajrak_flutter/
├── lib/
│   ├── main.dart                       ← نقطة الدخول + إعداد Theme
│   ├── app_state.dart                  ← إدارة حالة التطبيق
│   │
│   ├── models/                         ← نماذج البيانات (Dart classes)
│   │   ├── transaction.dart
│   │   ├── debt.dart
│   │   ├── investment.dart
│   │   ├── budget.dart
│   │   ├── savings_goal.dart
│   │   └── alert.dart
│   │
│   ├── screens/                        ← 22 شاشة كاملة
│   │   ├── auth/
│   │   │   ├── login_screen.dart       ← تسجيل الدخول
│   │   │   ├── register_screen.dart    ← إنشاء حساب
│   │   │   ├── onboarding_screen.dart  ← إعداد أولي (4 خطوات)
│   │   │   ├── forgot_password_screen.dart
│   │   │   └── reset_password_screen.dart
│   │   │
│   │   ├── dashboard/
│   │   │   └── dashboard_screen.dart   ← لوحة التحكم الرئيسية
│   │   │
│   │   ├── transactions/
│   │   │   └── transactions_screen.dart
│   │   │
│   │   ├── debts/
│   │   │   └── debts_screen.dart
│   │   │
│   │   ├── investments/
│   │   │   └── investments_screen.dart
│   │   │
│   │   ├── goals/
│   │   │   └── goals_screen.dart
│   │   │
│   │   ├── budgets/
│   │   │   └── budgets_screen.dart
│   │   │
│   │   ├── alerts/
│   │   │   └── alerts_screen.dart
│   │   │
│   │   ├── settings/
│   │   │   └── settings_screen.dart
│   │   │
│   │   ├── learn/
│   │   │   └── learn_screen.dart       ← الدروس الإسلامية
│   │   │
│   │   ├── help/
│   │   │   └── help_screen.dart
│   │   │
│   │   ├── achievements/
│   │   │   └── achievements_screen.dart ← الشارات والمستويات
│   │   │
│   │   ├── fire/
│   │   │   └── fire_calculator_screen.dart ← حاسبة FIRE
│   │   │
│   │   ├── zakat/
│   │   │   └── zakat_calculator_screen.dart ← حاسبة الزكاة
│   │   │
│   │   ├── more/
│   │   │   └── more_screen.dart        ← شاشة المزيد
│   │   │
│   │   ├── splash_screen.dart          ← شاشة البداية
│   │   └── main_screen.dart            ← هيكل التنقل الرئيسي
│   │
│   ├── services/
│   │   ├── notification_service.dart   ← Firebase FCM + محلي
│   │   ├── currency_service.dart       ← تحويل العملات
│   │   ├── analytics_service.dart      ← تتبع الأحداث
│   │   └── investments_service.dart    ← بيانات الاستثمارات
│   │
│   ├── widgets/                        ← مكونات قابلة لإعادة الاستخدام
│   │   ├── more_menu_item.dart
│   │   └── ...
│   │
│   └── utils/                          ← أدوات مساعدة
│
├── assets/
│   ├── images/
│   │   └── app_icon.png               ← شعار التطبيق
│   ├── fonts/
│   │   ├── Cairo-Regular.ttf
│   │   └── Cairo-Bold.ttf
│   └── i18n/
│       ├── en.json                    ← ترجمة إنجليزية
│       └── ar.json                    ← ترجمة عربية
│
├── android/
│   └── app/
│       └── google-services.json       ← (غير مُودَع — من Firebase Console)
│
├── pubspec.yaml                       ← تعريف الاعتمادات
└── .env                               ← متغيرات البيئة (غير مُودَعة)
```

---

## 📱 الشاشات

| # | الشاشة | الوصف | الميزات الرئيسية |
|:-:|:-------|:------|:----------------|
| 1 | **Splash** | شاشة البداية | تحميل شعار + فحص جلسة |
| 2 | **Login** | تسجيل الدخول | البريد + كلمة المرور، التوجيه |
| 3 | **Register** | إنشاء حساب | تحقق، إنشاء Profile |
| 4 | **Onboarding** | إعداد أولي | 4 خطوات تفاعلية (PageView) |
| 5 | **ForgotPassword** | استعادة كلمة المرور | إرسال بريد إلكتروني |
| 6 | **Dashboard** | لوحة التحكم | Health Score، المعاملات الأخيرة، المخططات |
| 7 | **Transactions** | المعاملات | CRUD، بحث، فلترة، CSV، سحب للحذف |
| 8 | **Debts** | الديون | تقدم، أقساط، Confetti عند السداد |
| 9 | **Budgets** | الميزانية | حدود الفئات، التقدم الفوري |
| 10 | **Goals** | أهداف الادخار | تتبع التقدم، Emoji picker |
| 11 | **Investments** | الاستثمارات | أسعار حية، P&L، الحلال، الحول |
| 12 | **Alerts** | التنبيهات | مركز الإشعارات، تصنيف بالنوع |
| 13 | **Settings** | الإعدادات | الملف الشخصي، العملة، اللغة، الثيم |
| 14 | **Learn** | الدروس | محتوى إسلامي يومي، تتبع الاستمرارية |
| 15 | **Help** | المساعدة | FAQ، معلومات التواصل |
| 16 | **Achievements** | الإنجازات | 20+ شارة، 6 مستويات |
| 17 | **FIRE Calculator** | حاسبة FIRE | Lean/Full/Fat، متزلجات تفاعلية |
| 18 | **Zakat Calculator** | حاسبة الزكاة | ملء تلقائي، عداد الحول، تاريخ |
| 19 | **More** | المزيد | قائمة تنقل إضافية |
| 20 | **Main** | الهيكل الرئيسي | Bottom navigation bar (4 تبويبات) |

---

## 🛠️ التقنيات

### الاعتمادات الأساسية

| الحزمة | الإصدار | الغرض |
|:-------|:-------:|:------|
| `supabase_flutter` | 2.3.4 | قاعدة البيانات + Auth + Real-time |
| `firebase_core` | 4.5.0 | تهيئة Firebase |
| `firebase_messaging` | 16.1.2 | Cloud Messaging (FCM) |
| `flutter_local_notifications` | 21.0.0 | إشعارات Foreground |
| `fl_chart` | 1.1.0 | رسوم بيانية (خطية، دائرية، شريطية، Sparkline) |
| `easy_localization` | 3.0.3 | التوطين AR/EN |
| `provider` | 6.1.1 | إدارة الحالة |
| `shimmer` | 3.0.0 | تأثيرات التحميل |
| `cached_network_image` | 3.3.1 | تخزين مؤقت للصور |
| `flutter_dotenv` | 6.0.0 | متغيرات البيئة |
| `intl` | 0.20.2 | تنسيق التواريخ والعملات |
| `shared_preferences` | 2.2.2 | التخزين المحلي |
| `url_launcher` | 6.2.4 | روابط خارجية |
| `http` | 1.2.1 | طلبات HTTP |

### اللغة والإطار

| | |
|:--|:--|
| **اللغة** | Dart 3.x |
| **الإطار** | Flutter 3.x |
| **إدارة الحالة** | Provider 6 |
| **التنقل** | Navigator 2.0 |
| **الخط** | Cairo (Arabic + Latin) |

---

## 📋 المتطلبات

| المتطلب | الإصدار |
|:--------|:-------:|
| Flutter SDK | `>=3.0.0 <4.0.0` |
| Dart SDK | `>=3.0.0` |
| Android SDK | API 21+ (Android 5.0+) |
| Android Studio | أو VS Code + Flutter extension |
| Firebase Project | مرتبط بالمشروع |

---

## ⚙️ الإعداد والتشغيل

### 1. تثبيت الاعتمادات

```bash
flutter pub get
```

### 2. إضافة أصول خط Cairo

حمّل خط Cairo من [Google Fonts](https://fonts.google.com/specimen/Cairo) وضع
الملفات في:

```
assets/fonts/Cairo-Regular.ttf
assets/fonts/Cairo-Bold.ttf
assets/fonts/Cairo-SemiBold.ttf
assets/fonts/Cairo-Bold.ttf
```

### 3. إعداد Firebase

من [Firebase Console](https://console.firebase.google.com):
1. اختر مشروعك
2. اذهب إلى **Project Settings → Your Apps**
3. حمّل `google-services.json`
4. ضعه في: `android/app/google-services.json`

> ⚠️ هذا الملف مُدرج في `.gitignore` ولن يُرفع على GitHub

### 4. متغيرات البيئة

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
FLUTTER_FIREBASE_API_KEY=AIza...
TWELVE_DATA_KEY=xxxx
```

### 5. تشغيل التطبيق

```bash
# التشغيل على جهاز/محاكي
flutter run

# التشغيل مع تحديد الجهاز
flutter run -d <device_id>

# عرض الأجهزة المتاحة
flutter devices
```

### 6. بناء APK للإصدار

```bash
# APK للتوزيع المباشر
flutter build apk --release

# AAB لـ Google Play
flutter build appbundle --release
```

| الملف | المسار |
|:------|:-------|
| APK | `build/app/outputs/flutter-apk/app-release.apk` |
| AAB | `build/app/outputs/bundle/release/app-release.aab` |

---

## 🔗 البيئة المشتركة مع الويب

التطبيق يشارك نفس البنية التحتية مع تطبيق الويب Next.js:

| المورد | الحالة |
|:-------|:------:|
| قاعدة بيانات Supabase PostgreSQL | ✅ مشترك |
| المصادقة Supabase Auth | ✅ مشترك |
| Firebase Project + FCM | ✅ مشترك |
| تسجيل الدخول بنفس الحساب | ✅ مدعوم |
| مزامنة فورية عبر المنصتين | ✅ فوري |

**أي بيانات تُضاف على الويب تظهر فوراً على الهاتف والعكس.**

---

## 🔔 نظام الإشعارات

### Firebase Cloud Messaging (FCM)

```dart
// تهيئة في notification_service.dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // عرض إشعار Foreground
});

FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // Deep Linking عند الضغط
});
```

**أنواع الإشعارات:**

| النوع | الوصف |
|:------|:------|
| تذكير صباحي | إشعار يومي الساعة 6:00 ص |
| تذكير مسائي | تذكير عند الحاجة 6:00 م |
| تقرير أسبوعي | ملخص الجمعة |
| تذكير الزكاة | قبل 30، 7، 0 يوم من الحول |
| تنبيهات ذكية | تحذيرات وتحفيز سياقي |

### Local Notifications

للإشعارات في وضع Foreground (التطبيق مفتوح):

```dart
FlutterLocalNotificationsPlugin().show(
  id, title, body,
  NotificationDetails(android: AndroidNotificationDetails(
    channelId, channelName,
    importance: Importance.high,
    priority: Priority.high,
  )),
);
```

---

## 🌍 الترجمة والتوطين

يستخدم التطبيق `easy_localization` مع ملفات JSON:

### ملفات الترجمة

| الملف | اللغة | الاتجاه |
|:------|:-----:|:-------:|
| `assets/i18n/ar.json` | العربية | RTL |
| `assets/i18n/en.json` | الإنجليزية | LTR |

### الاستخدام

```dart
// في أي widget
import 'package:easy_localization/easy_localization.dart';

Text('nav_dashboard'.tr())
Text('greeting'.tr(args: ['اسم المستخدم']))
```

### إضافة ترجمة جديدة

```json
// ar.json
{
  "your_key": "النص بالعربية"
}

// en.json
{
  "your_key": "Your text in English"
}
```

### المفاتيح الشائعة

| المفتاح | العربية | الإنجليزية |
|:--------|:-------:|:----------:|
| `app_name` | فجرك | Fajrak |
| `nav_dashboard` | لوحة التحكم | Dashboard |
| `nav_transactions` | المعاملات | Transactions |
| `nav_debts` | الديون | Debts |
| `nav_investments` | الاستثمارات | Investments |
| `nav_settings` | الإعدادات | Settings |
| `fire_title` | حاسبة FIRE | FIRE Calculator |
| `zakat_title` | حاسبة الزكاة | Zakat Calculator |

---

## 🚀 النشر

### Google Play Store

```bash
# 1. بناء AAB
flutter build appbundle --release

# 2. التحقق من الحزمة
flutter build appbundle --release --analyze-size

# 3. الرفع
# Google Play Console → Production → Closed Testing
```

**متطلبات المتجر المكتملة:**
- [x] شعار التطبيق (512×512)
- [x] Feature Graphic (1024×500)
- [x] Screenshots (هاتف + تابلت)
- [x] وصف التطبيق (عربي + إنجليزي)
- [x] سياسة الخصوصية
- [x] Content Rating
- [x] Target API Level 34+

### التوزيع المباشر (APK)

```bash
flutter build apk --release --split-per-abi
```

الملف النهائي: `build/app/outputs/flutter-apk/app-release.apk` (~54.5 MB)

---

## 📊 Feature Parity — 100%

| الميزة | الويب | الهاتف |
|:-------|:-----:|:------:|
| لوحة التحكم الكاملة | ✅ | ✅ |
| المعاملات + CSV + بحث | ✅ | ✅ |
| الديون + Confetti | ✅ | ✅ |
| الميزانية + 50/30/20 | ✅ | ✅ |
| أهداف الادخار | ✅ | ✅ |
| التنبيهات الذكية | ✅ | ✅ |
| حاسبة FIRE | ✅ | ✅ |
| حاسبة الزكاة + حول | ✅ | ✅ |
| تاريخ الصحة المالية | ✅ | ✅ |
| تقارير PDF | ✅ | — |
| Gamification + شارات | ✅ | ✅ |
| الدروس الإسلامية | ✅ | ✅ |
| إشعارات FCM | ✅ | ✅ |
| دعم AR/EN + RTL | ✅ | ✅ |
| متعدد العملات | ✅ | ✅ |
| Onboarding (4 خطوات) | ✅ | ✅ |

---

## 📝 سجل التغييرات

### v3.26.0 — 2026-04-03 *(الأحدث)*

| التغيير | الوصف |
|:-------|:------------|
| 📊 **ملخص الشهر** | بطاقة `MonthSummaryCard` تظهر تلقائياً في الأيام 1-7 من الشهر الجديد بدخل وإنفاق وادخار الشهر السابق. تُحفظ حالة الإغلاق في SharedPreferences. |
| ← **تنقل بين الشهور** | شريط `‹ مارس 2025 ›` في شاشة المعاملات يستبدل أيقونة التقويم — السهم الأيمن للشهر السابق، الأيسر للتالي (معطّل عند الشهر الحالي). |
| ⚡ **فصل الديون** | `TransactionSummary` يعرض المصاريف الحقيقية بشارة زرقاء منفصلة لأقساط الديون. |
| 🕌 **امتثال إسلامي** | استبدال `Icons.savings` (خنزير التوفير) بـ `Icons.account_balance_wallet` في 7 شاشات. |
| 🔧 **إصلاحات** | حذف import زائد لـ `intl`، إزالة تعريف مكرر لـ `_prevExpenses`، مفاتيح ترجمة `filter_date` و`cancel_filter`. |

### v3.25.0 — 2026-04-03

| التغيير | الوصف |
|:-------|:------------|
| 🏗️ **Core Logic** | **المنطق المركزي**: نقل كافة الحسابات الأساسية (صافي الثروة، الزكاة، الأرصدة) إلى Supabase RPC لضمان دقة رياضية 100% مع الويب. |
| 💎 **Dual-API Prices** | **الأسعار الحية**: تطبيق نظام جلب الأسعار المزدوج (Yahoo Finance + FreeGoldAPI) مع تحديث خلفي أوتوماتيكي. |
| 🛡️ **Technical Audit** | مراجعة شاملة لجميع الخدمات المالية (FinanceService, AccountsService) لضمان الدقة واستهلاك الـ RPCs الجديدة. |

### v3.24.0 — 2026-04-02

| التغيير | الوصف |
|:-------|:------|
| 💎 **واجهة بريميوم** | واجهة Glassmorphism جديدة للداشبورد تعتمد على `BackdropFilter` |
| 🧪 **تغطية الاختبارات** | إضافة اختبارات وحدة لخدمات العملات والحسابات (تغطية 100% للخدمات) |

### v3.23.0 — 2 أبريل 2026

| التغيير | الوصف |
|:-------|:------|
| 💎 **واجهة بريميوم** | واجهة Glassmorphism جديدة للداشبورد تعتمد على `BackdropFilter` |
| 🧪 **تغطية الاختبارات** | إضافة اختبارات وحدة لخدمات العملات والحسابات (تغطية 100% للخدمات) |
| 📐 **معمارية متعددة المنصات** | ويب + *native mobile* مع مزامنة فورية عبر `FinanceUtils` لضمان الدقة |
| 🛡️ **إصلاحات تقنية** | حل مشاكل التحميل وتنظيف الاختبارات القديمة (v3.23.0+15) |

### v3.21.0 — 2 أبريل 2026

| التغيير | الوصف |
|:-------|:------|
| 🏦 **نظام الحسابات** | شاشة حسابات كاملة: بنك، نقدي، توفير، بطاقة ائتمان |
| 💰 **بطاقة إجمالي الرصيد** | الداشبورد يعرض الرصيد الفعلي مع تفاصيل كل حساب |
| 🔄 **تحويل بين الحسابات** | نافذة تحويل مع اختيار المصدر والوجهة والمبلغ |
| 🧭 **تبويب الحسابات** | استبدال تبويب الميزانية بتبويب الحسابات في الشريط السفلي |

### الإصدار 9 (v3.16.1) — 31 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 📊 **حاسبات المالية** | إضافة حاسبة (FIRE) لتتبع تقاعدك المبكر |
| 📖 **منصة التعلم** | إطلاق منصة الدروس المالية اليومية التفاعلية |
| 💳 **ديون مستحقة** | تطوير ميزة إدارة الديون لفصل الديون التي لك وعليك |

### الإصدار 7 (v3.15.0) — 30 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 🔄 **إصلاحات تقنية** | حل مشكلة التحميل وتحسين استقرار التطبيق |
| 📊 **تصنيفات ذكية** | فصل الدخل عن المصاريف وإضافة 7 تصنيفات جديدة |
| 🌄 **هوية موحدة** | توحيد رقم الإصدار مع متجر Play وتحديث الشعار |

### الإصدار 5 (v1.0.2) — 28 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 🚀 **تحديث المتجر** | أول نسخة مستقرة تم رفعها للاختبار المغلق في جوجل بلاي |

### الإصدار 3 (v1.0.1) — 28 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 🔧 **إصلاحات عامة** | تحسينات في واجهة المستخدم ومعالجة بعض الأخطاء البرمجية |

### الإصدار 2 (v1.0.0) — 23 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 🎉 **الإطلاق التجريبي** | النسخة الأولى من فجرك (Beta Launch) |
| 🖼️ **شعار Splash** | استخدام الشعار الحقيقي مع `ClipRRect` و`BoxShadow` |
| 🖼️ **شعار Login** | استخدام الشعار الحقيقي مع تأثير `BoxShadow` |
| 📜 **إعادة هيكلة More** | تحويل الشاشة لـ `ListView` مباشر وأخف |

### v3.13.0 — 25 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 🔥 **حاسبة FIRE** | حاسبة متكاملة مع ملء تلقائي ومحاكاة الفائدة المركبة |
| 🌙 **حاسبة الزكاة** | ملء تلقائي ومتابعة الحول لكل أصل |
| 📈 **تاريخ الصحة** | رسم Sparkline مصغر لعرض التقدم في آخر 30 يوماً |

### v3.12.0 — 24 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 💎 **تحديث الواجهة** | إعادة تصميم شاملة: تدرجات لونية، خط Cairo عالي الدقة |
| 🛡️ **الأمان** | إزالة جميع المفاتيح المُضمَّنة؛ الانتقال الكامل لـ `.env` |
| 🎨 **الثيم** | إصلاح مشكلة "الأبيض على الأبيض" في الوضع الفاتح |

### v3.10.0 — 23 مارس 2026

| التغيير | الوصف |
|:-------|:------|
| 🚀 **Google Play** | رفع حزمة .aab للاختبار المغلق |
| ⚙️ **إصلاحات Gradle** | حل مشاكل بناء Android |
| 🌍 **الترجمة** | تغطية 100% لجميع الشاشات |

---

<div align="center">

## 🌅 Fajrak — فجرك

**مبني بـ ❤️ من الأردن للعالم العربي**

[![GitHub](https://img.shields.io/badge/GitHub-Abdoocoder-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Abdoocoder)
[![Website](https://img.shields.io/badge/Website-fajrak.com-FF6B35?style=for-the-badge)](https://fajrak.com)
[![Download](https://img.shields.io/badge/APK-Download-38ef7d?style=for-the-badge)](https://fajrak.com/download)

**© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة**

</div>
