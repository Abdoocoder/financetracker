# Google Play Store Release Details - v3.42.0+54

## Release Name
**Fajrak v3.42.0 — BYOK AI Assistant & Security Enhancements**

---

## Release Notes - English (en-US)

### 🤖 New: BYOK AI Finance Assistant
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

### 🤖 جديد: مساعد الذكاء الاصطناعي BYOK
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

## Version Code: 54
## Version Name: 3.42.0
## Target SDK: 34
## Min SDK: 21