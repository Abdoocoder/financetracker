# Fajrak Flutter — تطبيق الأندرويد الأصلي

تطبيق أندرويد أصلي مبني بـ Flutter لمنصة **Fajrak** لإدارة المالية الشخصية.

---

## 📋 المتطلبات

- [Flutter SDK](https://flutter.dev/docs/get-started/install) `>=3.0.0 <4.0.0`
- Android Studio أو VS Code مع Flutter extension
- حساب Firebase مرتبط بالمشروع
- ملف `google-services.json` من Firebase Console

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
> ⚠️ هذا الملف مُدرج في .gitignore ولن يُرفع على GitHub

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

# بناء APK محسّن (حجم أصغر)
flutter build apk --release --split-per-abi
```

الـ APK الناتج يكون في:
```
build/app/outputs/flutter-apk/app-release.apk
```

---

## 📁 هيكل المشروع

```
lib/
├── main.dart              # نقطة الدخول + إعداد Theme
├── screens/
│   ├── auth/              # تسجيل الدخول، التسجيل، الإعداد الأولي
│   ├── dashboard/         # الصفحة الرئيسية
│   ├── transactions/      # المعاملات المالية
│   ├── debts/             # الديون
│   ├── investments/       # الاستثمارات
│   ├── goals/             # أهداف الادخار
│   ├── budgets/           # الميزانية
│   ├── alerts/            # التنبيهات
│   ├── settings/          # الإعدادات
│   └── more/              # صفحات إضافية
├── services/
│   └── notification_service.dart  # Firebase FCM
├── models/                # نماذج البيانات
└── widgets/               # مكونات مشتركة
```

---

## 🔗 Backend مشترك

التطبيق يشارك نفس **Supabase** و **Firebase** project مع تطبيق الويب Next.js:
- ✅ نفس قاعدة البيانات والجداول
- ✅ نفس المصادقة (Auth)
- ✅ نفس Firebase FCM للإشعارات
- ✅ تسجيل الدخول بنفس الحساب على الويب والموبايل
