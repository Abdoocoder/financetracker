# Google Play Store Release Details - v3.47.3+69

## Version Code: 69
## Version Name: 3.47.3

### 🛠️ Fixed
- **Critical Stability Fixes:** Resolved several app crashes, including a startup crash on some Android devices, a crash when adding a budget, and an issue that prevented saving savings goals.
- **Authentication:** Fixed a session race condition that occasionally logged users out unexpectedly.

### ✨ Improved
- **Guided Chat Experience:** If you haven't added an API key yet, the AI assistant now shows a helpful card with a direct button to add your key or get a free one, instead of a generic error message.

---
**بالعربية:**
- **إصلاحات استقرار حرجة:** تم حل عدة أعطال في التطبيق، بما في ذلك انهيار عند بدء التشغيل على بعض أجهزة أندرويد، وانهيار عند إضافة ميزانية، ومشكلة كانت تمنع حفظ أهداف الادخار.
- **المصادقة:** تم إصلاح خطأ نادر كان يؤدي إلى تسجيل خروج المستخدم فجأة.
- **تجربة دردشة موجهة:** إذا لم تقم بإضافة مفتاح API بعد، يعرض المساعد الذكي الآن بطاقة مساعدة مع زر مباشر لإضافة المفتاح أو الحصول على مفتاح مجاني، بدلاً من رسالة خطأ عامة.

---

# Google Play Store Release Details - v3.47.1+67

## Version Code: 67
## Version Name: 3.47.1

### 🛠️ Fixed
- **Critical Hotfix:** Fixed an issue where the app could crash on startup on some Android devices due to missing Firebase configuration during the build process.
- Added native crash reporting (Sentry tombstones) for better diagnostics.

---
**بالعربية:**
- **إصلاح عاجل:** تم إصلاح مشكلة قد تؤدي إلى انهيار التطبيق عند التشغيل على بعض أجهزة الأندرويد بسبب نقص إعدادات Firebase أثناء البناء.
- تمت إضافة تقارير انهيار أصلية (Sentry tombstones) لتشخيص أفضل.

---

# Google Play Store Release Details - v3.47.0+66

## Version Code: 66
## Version Name: 3.47.0

### 🚀 Added
- **Proactive AI Agent:** Your financial assistant now works in the background! It automatically checks your budgets, debts, and spending trends every morning and sends you smart alerts.
- **Improved BYOK Setup:** Easier API key setup with direct links to providers, free model badges, and instant key validation.
- **Smart Tool Cards:** The AI assistant now displays interactive cards in the chat when it's fetching data, with quick links to the relevant dashboard pages.

### 🛠️ Fixed
- Security hardening for audit logs and rate limits.

---
**بالعربية:**
- **الوكيل الاستباقي للذكاء الاصطناعي:** مساعدك المالي يعمل الآن في الخلفية! يتحقق تلقائياً من ميزانياتك وديونك واتجاهات إنفاقك كل صباح ويرسل لك تنبيهات ذكية.
- **تحسين إعداد BYOK:** إعداد أسهل لمفاتيح API مع روابط مباشرة للمزودين، شارات النماذج المجانية، والتحقق الفوري من المفتاح.
- **بطاقات الأدوات الذكية:** يعرض مساعد الذكاء الاصطناعي الآن بطاقات تفاعلية في الدردشة عند جلب البيانات، مع روابط سريعة لصفحات لوحة التحكم ذات الصلة.
- **إصلاحات:** تعزيز الأمان لسجلات التدقيق والحدود القصوى للطلبات.

---

# Google Play Store Release Details - v3.46.0+65

## Version Code: 65
## Version Name: 3.46.0

### 🌙 Added
- **Zakat: Live Prices** — Daily sync now fetches real-time gold (XAU), silver (XAG), and FX rates; dashboards display live Nisab values.
- **Currency Onboarding Default** — New users get their detected local currency (KWD fallback for Gulf), avoiding manual selection.

### 🐛 Fixed
- **Alerts Deduplication** — Fingerprint backfill removed 6,436 duplicate alert rows; 3,799 unique keys assigned.
- **Security Hardening** — Revoked all `anon` write grants on public tables; RLS is the only write path.
- **Zakat Autopilot** — Live prices now passed to `sync_zakat_haul_state` RPC for accurate Hawl calculations.

---
**بالعربية:**
- **الزكاة: أسعار حية** — المزامنة اليومية تجلب أسعار الذهب (XAU) والفضة (XAG) ومعدلات الصرف في الوقت الحقيقي؛ لوحات التحكم تعرض قيم النصاب المباشرة.
- **عملة الترحيب الافتراضية** — المستخدمون الجدد يحصلون على العملة المحلية المكتشفة (KWD كخيار احتياطي للخليج)، مما يلغي الاختيار اليدوي.
- **إزالة تكرار التنبيهات** — إعادة ملء البصمات أزالت 6,436 صف تنبيه مكرر؛ تم تعيين 3,799 مفتاح فريد.
- **تعزيز الأمان** — إلغاء جميع منح الكتابة للمستخدم `anon` على الجداول العامة؛ RLS هو مسار الكتابة الوحيد.
- **الطيار الآلي للزكاة** — الأسعار الحية تُمرر الآن إلى RPC `sync_zakat_haul_state` لحسابات حول دقيقة.

---

# Google Play Store Release Details - v3.45.0+64

## Version Code: 64
## Version Name: 3.45.0

### 🌙 Added
- **Zakat Autopilot:** Automatically tracks your wealth, starts the 354-day Hawl countdown when Nisab is reached, and sends proactive reminders.
- **Unified Zakat Engine:** Web and Mobile now use a single, centralized PostgreSQL database engine for all Zakat calculations.
- **Dashboard UI:** Added the new Zakat Hawl countdown card to Web and Mobile dashboards.

### 🐛 Fixed
- Fixed gamification 401 errors on the web dashboard.
- Fixed web development credential issues (`make run-web`).
- Fixed live gold/silver price parsing crashes on Flutter Web.

---
**بالعربية:**
- **الطيار الآلي للزكاة:** تتبع تلقائي لثروتك، وبدء عداد الحول (354 يوماً) عند بلوغ النصاب، مع إشعارات استباقية.
- **توحيد محرك الزكاة:** الويب والموبايل يستخدمان الآن محركاً مركزياً واحداً في قاعدة البيانات لجميع حسابات الزكاة.
- **واجهة لوحة التحكم:** إضافة بطاقة العد التنازلي لحول الزكاة في لوحات التحكم للويب والموبايل.
- **إصلاح الأخطاء:** إصلاح أخطاء المصادقة (401)، ومشاكل بيانات الاعتماد في بيئة الويب، وانهيار جلب أسعار الذهب/الفضة في Flutter Web.
---

# Google Play Store Release Details - v3.44.0+63

**Fajrak v3.44.0 — Feature & Stability Release**

## Version Code: 63
## Version Name: 3.44.0

### 🐛 Fixed
- AI Assistant: proper Arabic formatting (no raw Markdown), JOD 3-decimal display, no English filler words
- Alerts: no more "Good morning" at 3 AM; per-user timezone gating (05:00–10:59 local)
- Budget alerts: no false "exceeded" alerts when monthly_limit = 0 (DB trigger guard applied)
- Accounts screen: RenderFlex overflow fixed for long account names
- Session safety: 11 `currentUser!` force-unwraps replaced with null-safe early returns
- Firebase: installation_id manifest flag added (FCM registration now works)

### 🧪 Quality
- 592 Web tests + 177 Flutter tests passing

---

# Google Play Store Release Details - v3.43.1+60

## Release Name
**Fajrak v3.43.1 — Production Hotfix**

## Fajrak v3.43.1 — Production Hotfix (Oct 16, 2026)

### 🚨 Critical Fixes
- **Splash screen hang (FCM)**: `NotificationService.initialize()` no longer hangs on Android when Firebase Messaging registration fails due to missing notification permission. Added a 5-second timeout as defense-in-depth.
- **Transactions screen crash**: `AppDatabase.instance` was called before `AppDatabase.initialize()`, causing an assertion failure on Android. Added `AppDatabase.maybeInstance` nullable accessor — sync queue is gracefully skipped when the offline-first DB isn't initialized.

### ✨ Also included (from 3.43.0)
- AchievementsScreen wired to `/api/gamification` API (with `user_stats` fallback)
- BYOK `/api/byok/config` now advertises all 6 providers (was 3: openai, anthropic, gemini added)
- 4 missing DB RPCs restored: `get_changed_records`, `get_deleted_records`, `calculate_health_score`, `get_health_score`
- `get_financial_dashboard` now returns real `health_score` from `get_health_score` RPC (was hardcoded `0`)
- Store listing rewritten

---

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

## Version Code: 60
## Version Name: 3.43.1
## Target SDK: 35
## Min SDK: 21