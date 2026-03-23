# Fajrak Flutter 🌅

### تطبيق الأندرويد الأصلي — Native Android App

---

[![100% Feature Parity](https://img.shields.io/badge/✅-100%25_Feature_Parity-38ef7d?style=for-the-badge)](https://fajrak.com)
[![APK Size](https://img.shields.io/badge/📦-54.5_MB_APK-FF6B35?style=for-the-badge)](https://github.com/Abdoocoder/financetracker/releases)
[![Google Play](https://img.shields.io/badge/🎯-Google_Play_Ready-4285F4?style=for-the-badge)](https://fajrak.com/download)
[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)

---

## ✨ نظرة عامة

تطبيق أندرويد أصلي مبني بـ **Flutter** لمنصة **Fajrak** لإدارة المالية الشخصية.

> 🎉 **متوفر على Google Play** — تم بناء حزمة التطبيق `.aab` ورفعها للاختبار المغلق (Closed Testing) بنجاح!

---

## 📋 المتطلبات

| المتطلب | الوصف |
|:--------|:------|
| 🦋 Flutter SDK | `>=3.0.0 <4.0.0` |
| 🔵 Android Studio | أو VS Code مع Flutter extension |
| 🔥 Firebase | حساب مرتبط للمشروع |
| 🔐 google-services.json | ملف من Firebase Console |

---

## ⚙️ الإعداد

### 1. تثبيت الاعتمادات

```bash
flutter pub get
```

### 2. إضافة خط Cairo

حمّل خط Cairo من [Google Fonts](https://fonts.google.com/specimen/Cairo) وضع الملفات في:

```
assets/fonts/Cairo-Regular.ttf
assets/fonts/Cairo-Bold.ttf
```

### 3. إضافة google-services.json

من [Firebase Console](https://console.firebase.google.com) → مشروعك → إعدادات التطبيق → حمّل `google-services.json` وضعه في:

```
android/app/google-services.json
```

> ⚠️ **ملاحظة:** هذا الملف مُدرج في `.gitignore` ولن يُرفع على GitHub

### 4. متغيرات البيئة (اختياري)

بشكل افتراضي يستخدم التطبيق قيم Supabase المضمّنة. لتخصيصها:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_anon_key
```

---

## 🚀 التشغيل والبناء

```bash
# تشغيل في وضع التطوير
flutter run

# بناء APK للتوزيع
flutter build apk --release
```

> 📦 **موقع الـ APK:** `build/app/outputs/flutter-apk/app-release.apk`

---

## 📁 هيكل المشروع

```
lib/
├── main.dart                      ← نقطة الدخول + إعداد Theme
├── screens/
│   ├── auth/                      ← تسجيل الدخول، التسجيل، الإعداد
│   ├── dashboard/                 ← الصفحة الرئيسية
│   ├── transactions/              ← المعاملات المالية
│   ├── debts/                     ← الديون
│   ├── investments/               ← الاستثمارات
│   ├── goals/                     ← أهداف الادخار
│   ├── budgets/                   ← الميزانية
│   ├── alerts/                    ← التنبيهات
│   ├── settings/                  ← الإعدادات
│   └── more/                      ← صفحات إضافية
├── services/
│   └── notification_service.dart  ← Firebase FCM
├── models/                        ← نماذج البيانات
└── widgets/                        ← مكونات مشتركة
```

---

## 🛠️ التقنيات المستخدمة

| التقنية | الاستخدام |
|:--------|:----------|
| 🦋 Flutter 3.x | إطار العمل |
| 🔷 Dart | لغة البرمجة |
| 🗄️ Supabase | قاعدة البيانات + Auth |
| 🔥 Firebase FCM | الإشعارات |
| 📊 fl_chart | الرسوم البيانية |
| 🌐 share_plus | مشاركة الملفات |

---

## 🔗 Backend مشترك

التطبيق يشارك نفس **Supabase** و **Firebase** project مع تطبيق الويب Next.js:

| الميزة | الحالة |
|:-------|:------|
| ✅ نفس قاعدة البيانات والجداول | نشط |
| ✅ نفس المصادقة (Auth) | نشط |
| ✅ نفس Firebase FCM للإشعارات | نشط |
| ✅ تسجيل الدخول بنفس الحساب | نشط |

---

## 📊 حالة التطابق — 100% Feature Parity

| الميزة | الوصف | الحالة |
|:-------|:------|:------:|
| **Dashboard** | التحليلات، Health Score، Gamification | ✅ 100% |
| **Transactions** | إضافة المعاملات، CSV، المشاركة | ✅ 100% |
| **Investments** | مبدل العملات، تحديث الأسعار، المحاكي | ✅ 100% |
| **Debts & Goals** | تواريخ الاستحقاق، Emoji Picker، Confetti | ✅ 100% |
| **Settings & Learn** | اللغة/الثيم الداخلي، Financial Roadmap | ✅ 100% |
| **Budgets & Alerts** | تحليل تلقائي، AI Advisor | ✅ 100% |
| **Core Systems** | ErrorHandler، AnalyticsService | ✅ 100% |
| **Onboarding** | 4 خطوات تفاعلية (PageView) | ✅ 100% |

---

## 🎯 الميزات الرئيسية

| | |
|:---|:---|
| 💳 **إدارة المعاملات** | إضافة/تعديل/حذف مع دعم CSV |
| 💰 **الميزانية الذكية** | تحليل تلقائي + AI Advisor |
| 📈 **الاستثمارات** | أسعار حية للأسهم والعملات الرقمية |
| 💎 **أهداف الادخار** | تتبع التقدم مع تأثيرات احتفالية |
| 🔔 **إشعارات ذكية** | Firebase FCM على أندرويد |
| 🎮 **Gamification** | نقاط، مستويات، شارات |
| 🌅 **دروس يومية** | محتوى تعليمي مخصص لمرحلتك |
| 🕌 **محتوى إسلامي** | آيات قرآنية وأحاديث نبوية |

---

## 🚀 النشر على Google Play

تم بناء حزمة التطبيق `.aab` ورفعها للاختبار المغلق (Closed Testing) على متجر Google Play بنجاح، مع استكمال جميع متطلبات التقييم والمحتوى.

---

<div align="center">

## 🌅 Fajrak — فجرك

**مبني بـ ❤️ من الأردن للعالم العربي**

© 2026 Fajrak — كلنا نحلم بالثراء، هنا تبدأ الرحلة

---

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Abdoocoder)
[![Website](https://img.shields.io/badge/Website-fajrak.com-FF6B35?style=for-the-badge)](https://fajrak.com)
[![Download](https://img.shields.io/badge/Download-APK-38ef7d?style=for-the-badge)](https://fajrak.com/download)

</div>
