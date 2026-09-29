# Google Play Store Release Details - v3.42.2+56

## Release Name
**Fajrak v3.42.2 — Play Store Compliance & Auth Fixes**

---

## Release Notes - English (en-US)

### 🔐 Play Store Compliance Fixes
- **AD_ID Permission**: Added `com.google.android.gms.permission.AD_ID` for Android 13+ Firebase Analytics compliance
- **Edge-to-Edge (Android 15/API 35)**: Migrated from deprecated `setStatusBarColor`/`setNavigationBarColor` to modern `enableEdgeToEdge()` with transparent system bar themes
- **Target SDK 35**: Updated for Android 15 edge-to-edge requirements

### 🐛 Critical Bug Fixes
- **Login Failure on Production Builds**: Fixed by embedding Supabase/Firebase credentials via `--dart-define` in Makefile build targets (`make build-bundle`, `make build-apk`)
- **Credentials Missing**: Previous builds ran `flutter build appbundle --release` directly without `--dart-define`, causing authentication to fail

### 🤖 BYOK AI Finance Assistant (from v3.42.0)
Bring Your Own Key (BYOK) — Chat privately with your own LLM provider (Ollama, OpenAI, Anthropic, etc.) directly in the app. Your API keys never leave your device — encrypted with AES-256-GCM + RSA-OAEP before any proxy request.

### 🔐 Security Hardening
- **Key Rotation**: Automatic credential rotation for BYOK keys
- **Moderation Layer**: Built-in content safety checks
- **Idempotency**: Safe retry logic for all AI operations
- **Unified Tool Layer**: Consistent tool-calling across providers

### 📊 Observability & Reliability
- OpenTelemetry tracing for AI requests
- Grafana dashboards + PagerDuty alerts
- Comprehensive E2E test coverage for critical paths

### 🎨 UI/UX Improvements
- Consolidated typography system (19→8 styles)
- Design token migration for consistent theming
- Improved empty states with actionable guidance
- Specific CTAs and error solution paths
- BYOK settings & chat UX refinements

### 🌐 Platform Fixes
- Flutter web CORS resolution for Supabase Auth
- Firebase dependency upgrades for web compatibility
- Cleartext traffic fixes for Android
- Sentry SDK updated to non-deprecated paths

### 🧪 Quality
- All 135 tests passing
- E2E tests with local Supabase & system Chromium
- Flutter analyze clean

---

## Release Notes - Arabic (ar)

### 🔐 إصلاحات امتثال متجر بلاي
- **إذن AD_ID**: تمت إضافة `com.google.android.gms.permission.AD_ID` للامتثال لـ Firebase Analytics على Android 13+
- **الحافة للحافة (Android 15/API 35)**: تمت الهجرة من `setStatusBarColor`/`setNavigationBarColor` المهجورة إلى `enableEdgeToEdge()` الحديث مع ثيمات شريط نظام شفافة
- **Target SDK 35**: تم التحديث لمتطلبات Android 15 للحافة للحافة

### 🐛 إصلاحات أخطاء حرجة
- **فشل تسجيل الدخول في إصدارات الإنتاج**: تم الإصلاح عن طريق تضمين بيانات اعتماد Supabase/Firebase عبر `--dart-define` في أهداف بناء Makefile (`make build-bundle`، `make build-apk`)
- **بيانات اعتماد مفقودة**: الإصدارات السابقة شغلت `flutter build appbundle --release` مباشرة بدون `--dart-define`، مما تسبب في فشل المصادقة

### 🤖 مساعد الذكاء الاصطناعي BYOK (من v3.42.0)
أحضر مفتاحك الخاص (BYOK) — تواصل بخصوصية مع مزود LLM خاص بك (Ollama، OpenAI، Anthropic، إلخ) مباشرة في التطبيق. مفاتيح API الخاصة بك لا تغادر جهازك أبداً — مشفرة بـ AES-256-GCM + RSA-OAEP قبل أي طلب وسيط.

### 🔐 تعزيزات الأمان
- **تدوير المفاتيح**: تدوير تلقائي لبيانات اعتماد BYOK
- **طبقة الإشراف**: فحوصات سلامة محتوى مدمجة
- **التكافؤ**: منطق إعادة محاولة آمن لجميع عمليات الذكاء الاصطناعي
- **طبقة الأدوات الموحدة**: استدعاء أدوات متسق عبر المزودين

### 📊 المراقبة والموثوقية
- تتبع OpenTelemetry لطلبات الذكاء الاصطناعي
- لوحات Grafana + تنبيهات PagerDuty
- تغطية اختبارات E2E شاملة للمسارات الحرجة

### 🎨 تحسينات الواجهة والتجربة
- نظام طباعة موحد (19→8 أنماط)
- ترحيل رموز التصميم لتناسق الثيم
- حالات فارغة محسنة مع إرشادات قابلة للتنفيذ
- CTAs محددة ومسارات حلول للأخطاء
- تحسينات تجربة مستخدم إعدادات ودردشة BYOK

### 🌐 إصلاحات المنصة
- حل CORS لفلتر ويب مع Supabase Auth
- ترقية تبعيات Firebase لتوافق الويب
- إصلاحات نص واضح لأندرويد
- تحديث Sentry SDK للمسارات غير المهجورة

### 🧪 الجودة
- جميع 135 اختباراً ناجحاً
- اختبارات E2E مع Supabase محلي و Chromium نظام
- تحليل فلتر نظيف

---

## Version Code: 56
## Version Name: 3.42.2
## Target SDK: 35
## Min SDK: 21