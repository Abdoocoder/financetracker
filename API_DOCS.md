Last synced: 2026-10-18 · source: app/api/*/route.ts

# توثيق واجهة برمجة التطبيقات (API Documentation) — مشروع فجرك

هذا المستند يقدم تفاصيل حول نقاط الاتصال (Endpoints) المتاحة في مشروع فجرك، مع التركيز على المهام المؤتمتة (Cron Jobs) وتحليل البيانات.

---

## 🔐 نظام المصادقة (Authentication)

يوجد نظامان منفصلان للمصادقة:

### 1. نقاط الاتصال المؤتمتة (Cron Jobs)

تستخدم مهام الخلفية المجدولة رأس `CRON_SECRET` البيئي:
- **النوع:** Bearer Token
- **التحقق:** يتم التحقق من وجود `CRON_SECRET` في البيئة ومطابقته للـ Token المرسل.
- **مثال:** `Authorization: Bearer YOUR_CRON_SECRET`

### 2. الوصول الخارجي — PAT (Personal Access Token)

الوكلاء الخارجيون والواجهات الآلية (MCP server، webhook) يستخدمون مفاتيح وصول شخصية
تبدأ بـ `fjk_live_` وتُدار عبر `/api/api-keys/*` (migration 039 — `user_api_keys`).

- **النوع:** Bearer Token — `Authorization: Bearer fjk_live_...`
- **التخزين:** لا يُخزَّن النص الصريح؛ يُجزَّأ SHA-256 جزئياً على الخادم.
- **الـ Scopes المتاحة:** `create_transaction`، `read_transactions`، `read_balances`.
- **الحد الأقصى:** 5 مفاتيح نشطة لكل مستخدم.
- **التحقق:** `verifyApiKey` (في `lib/api-keys.ts`) يرفض المفاتيح الموقوفة/المنتهية
  ويعيد الهوية + الـ scopes + `rateLimitPerMin` لكل مفتاح.
- **التسجيل:** كل استدعاء ناجح يُسجَّل في `api_audit_log` (fire-and-forget).
- **الحد الأسبق بالمعدل:** `rateLimit` بمفتاح `${scope}:{keyId}` لكل دقيقة.

---

## 🚀 نقاط الاتصال (Endpoints)

### 1. مؤشر الصحة المالية (`/api/health-score-snapshot`)
حساب وتسجيل مؤشر الصحة المالية لجميع المستخدمين النشطين.
- **الطريقة:** `GET`
- **المصادقة:** مطلوبة (Cron Token)
- **الغرض:** يقوم بحساب (معدل الادخار، نسبة الدين، صندوق الطوارئ، الاستثمارات، والنشاط) لكل مستخدم وحفظ النتيجة في جدول `health_scores`.

### 2. أسعار الأسهم والعملات الرقمية (`/api/stock-price`)
تحديث قيم الاستثمارات بناءً على الأسعار العالمية.
- **الطريقة:** `GET`
- **المصادقة:** اختيارية (تعتمد على الطلب)
- **المصدر:** Twelve Data API / CoinGecko.

### 3. الجدولة التلقائية للدائن والمدين (`/api/auto-debt`)
معالجة تسويات الديون المجدولة تلقائياً.
- **الطريقة:** `GET`
- **الغرض:** خصم مبالغ الديون من الرصيد في التواريخ المحددة.

### 4. إشعارات الدروس اليومية (`/api/daily-reminder`)
إرسال نصائح ودروس مالية إسلامية للمستخدمين عبر Push Notifications.
- **الطريقة:** `GET`
- **المحتوى:** يتم جلبه من مستودع الدروس في `lib/daily-lessons.ts`.

---

## 🤖 LLM Ecosystem — الوكلاء الخارجيون وواجهات BYOK

### 5. إدارة مفاتيح الوصول الشخصية (`/api/api-keys/*`)
إنشاء وإبطال مفاتيح PAT (`fjk_live_...`) — خاصة بواجهات الوكلاء الخارجيين.
- **`POST /api/api-keys/create`** — الصفة: ائتمان جلسة Supabase. ينشئ مفتاحاً باسم (1-100 رمزاً) مع `scopes` اختيارية من `['create_transaction','read_transactions','read_balances']`. يرفض >5 مفاتيح نشطة للمستخدم.
- **`POST /api/api-keys/revoke`** — الصفة: جلسة. يوقف مفتاحاً عبر `{ "key_id": "uuid" }`.

### 6. Webhook معاملات REST (`/api/webhook/transaction`)
إدارة المعاملات عبر PAT — مكافئ REST لأدوات MCP.
- **`GET ?action=transactions`** — يتطلب `read_transactions`. يدعم `limit` (≤50)، `offset`، `type`، `category`، `from`، `to` (YYYY-MM-DD).
- **`GET ?action=balances`** — يتطلب `read_balances`. يعيد الأرصدة عبر RPC `get_account_balances`.
- **`POST`** — يتطلب `create_transaction`. النص: `{ type: 'income'|'expense', amount: number>0, category, description?, transaction_date: YYYY-MM-DD, account_id? }`. القيم max 500 حرفاً؛ الفئات **بالعربية** فقط (انظر الشيفرة). يُجرَّد HTML و≤1024 بايت.

### 7. خادم MCP المالي (`/api/mcp`)
خادم **Model Context Protocol** عبر Streamable HTTP (`@modelcontextprotocol/server` v2).
- **الصفة:** PAT `Bearer fjk_live_...` مطلوبة على كل طريقة (GET/POST/DELETE/OPTIONS).
- **الأدوات الثلاث — الخرائط الفلات إلى الـ scopes المسطَّحة:**

| الأداة | يتطلب scope | الوظيفة |
|:-------|:------------|:--------|
| `get_balances` | `read_balances` | أرصدة حسابات المستخدم |
| `get_cashflow_summary` | `read_transactions` | إجمالي الدخل/المصروف/الصافي (خياريا عبر `from`/`to` تواريخ) |
| `create_transaction` | `create_transaction` | تسجيل مصروف/دخل بالعربية |

- **الحد الأسبق بالمعدل:** بمفتاح `mcp:{keyId}` لكل دقيقة (`rateLimitPerMin`).
- **التسجيل:** `api_audit_log` لكل استدعاء (`action` = الـ scope، `apiKeyId` = keyId).
- **المرجع:** يمكن اختباره عبر الإجرائية `initialize`/`tools/list`/`tools/call` القياسية في Streamable HTTP.

### 8. وكيل BYOK (`/api/byok/proxy`)
وكيل رفيع **عديم الحالة** لتمرير طلبات LLM عبر مزوّدون مدعومون (Feature A)، محمي بجلسة Supabase.
- **النموذج:** POST — `{ providerId, keyId, env, payload, body (base64 = نص الطلب الأصلي), headers?, stream? }`.
- **AD-3/AD-4:** مفتاح المزوّد يُفك تشفيره **في الذاكرة** فقط من غلاف RSA-OAEP + AES-GCM ثم يًدمر في `finally` — لا يُخزَّن أبداً في DB/قرص.
- **AD-5:** عداد ذرّي `bump_proxy_usage` لكل مستخدم؛ >30/دقيقة → `429` مع `x-byok-origin: proxy`.
- **الأمان:** عناوين المزوّد **حصرياً** من قائمة `SUPPORTED_PROVIDERS` الثابتة (يُمنع SSRF)؛ أي `providerId` غير معروف → `404`؛ رموز المصادقة المزوّدة من العميل تُتجاهل والحقن يتم من الخادم فقط.
- **المرور:** نص الطلب يُمرَّر **حرفياً** (base64 → upstream) دون ترجمة؛ يدعم SSE عبر `stream: true`.
- **بيئة العمل:** `BYOK_PRIVATE_KEY` (خاص، خادم فقط) + `NEXT_PUBLIC_BYOK_PUBLIC_KEY` + `NEXT_PUBLIC_BYOK_KEK_ID` (عام، آمن للمتصفح) — وضّح في `.env.example`.
- **التسجيل:** بلا مفاتيح — `bodyBytes` + `bodySha256` فقط، لا يَرصد رؤوس المصادقة أبداً؛ النواتج التفصيلية (نص الطلب الممرَّر وتوقيت إتلاف المفتاح) معطّلة افتراضياً وتُفعَّل بـ `BYOK_PROXY_DEBUG=true`.

---

## 📋 القائمة الكاملة لنقاط الاتصال المكتشفة

| المسار (Path) | الوظيفة الأساسية |
|:--------------|:----------------|
| `/api/alerts` | إدارة وقراءة التنبيهات |
| `/api/auth` | عمليات المصادقة المكملة لـ Supabase |
| `/api/auto-recurring` | المعاملات المتكررة (إيجار، اشتراكات) |
| `/api/auto-salary` | تسجيل الرواتب تلقائياً |
| `/api/budget-alerts` | تنبيهات تجاوز الميزانية (قاعدة 50/30/20) |
| `/api/confirm` | تأكيد البريد الإلكتروني أو العمليات الحساسة |
| `/api/exchange-rate` | تحويل العملات (15+ عملة) |
| `/api/gamification` | تحديث المستويات والشارات |
| `/api/push-subscribe` | تسجيل توكنات Firebase FCM |
| `/api/smart-notifications` | إرسال تنبيهات مخصصة بناءً على سلوك المستخدم |
| `/api/zakat-reminder` | التنبيه باقتراب "حول" الزكاة |
| `/api/api-keys/create` | إنشاء PAT `fjk_live_...` |
| `/api/api-keys/revoke` | إبطال PAT |
| `/api/webhook/transaction` | قراءة/إنشاء المعاملات عبر PAT (REST) |
| `/api/mcp` | خادم MCP المالي (Streamable HTTP) |
| `/api/byok/proxy` | وكيل LLM BYOK الرفيع (Feature A) |

---

## 🔑 مصفوفة المصادقة لكل نقطة اتصال (Endpoint auth matrix)

Last synced: 2026-10-18 · source: `app/api/*/route.ts`. Auth derived from each route file (`verifyCronAuth`, `supabase.auth.getUser`, `verifyApiKey`); no parameters were invented.

| المسار (Path) | الطريقة (Method) | المصادقة (Auth) |
|:--------------|:-----------------|:-----------------|
| `/api/alerts` | GET | cron (`CRON_SECRET`) |
| `/api/alerts` | POST | authenticated (Bearer session token) |
| `/api/api-keys/create` | POST | authenticated (Bearer session token) |
| `/api/api-keys/revoke` | POST | authenticated (Bearer session token) |
| `/api/auth/callback` | GET | public (OAuth callback redirect handler) |
| `/api/auto-debt` | GET | cron (`CRON_SECRET`) |
| `/api/auto-debt` | POST | authenticated (Bearer session token) |
| `/api/auto-recurring` | GET | cron (`CRON_SECRET`) |
| `/api/auto-salary` | GET | cron (`CRON_SECRET`) |
| `/api/auto-salary` | POST | authenticated (Bearer session token) |
| `/api/budget-alerts` | GET | cron (`CRON_SECRET`) |
| `/api/budget-alerts` | POST | cron (`CRON_SECRET`) |
| `/api/byok/config` | GET | public (runtime BYOK config + RSA public key) |
| `/api/byok/proxy` | POST | authenticated (Bearer session token) |
| `/api/confirm` | GET | public (email/sensitive-operation confirmation link) |
| `/api/daily-reminder` | GET | cron (`CRON_SECRET`) |
| `/api/evening-reminder` | GET | cron (`CRON_SECRET`) |
| `/api/exchange-rate` | GET | authenticated (Bearer token; 401 without it) |
| `/api/gamification` | GET, POST | authenticated (Bearer token) |
| `/api/health` | GET | public (returns `{"ok":true}`) |
| `/api/health-score-snapshot` | GET | cron (`CRON_SECRET`) |
| `/api/mcp` | GET, POST, DELETE | PAT (`fjk_live_...` via `verifyApiKey`) |
| `/api/new-user-nudge` | GET | cron (`CRON_SECRET`) |
| `/api/push-send` | POST | cron (`CRON_SECRET`) |
| `/api/push-subscribe` | POST, DELETE | authenticated (Bearer session token) |
| `/api/push-test` | POST | cron (`CRON_SECRET`) or authenticated session token |
| `/api/smart-notifications` | GET | cron (`CRON_SECRET`) |
| `/api/stock-price` | GET | authenticated (Bearer token) |
| `/api/streak-alert` | GET | cron (`CRON_SECRET`) |
| `/api/testimonials` | POST | authenticated (Bearer session token) |
| `/api/testimonials` | GET | public (own testimonial via token, otherwise visible-only fields) |
| `/api/webhook/transaction` | GET, POST | PAT (`fjk_live_...` via `verifyApiKey`) |
| `/api/weekly-report` | GET | cron (`CRON_SECRET`) |
| `/api/zakat/prices` | GET | authenticated (Bearer token) |
| `/api/zakat-reminder` | GET | cron (`CRON_SECRET`) |

**ملاحظات:**

- كل نقطة اتصال مذكورة في هذا المستند موجودة أيضاً في الشيفرة; لم يُعلَّم أي بند `⚠️ REMOVED`.
- نقاط أُضيفت حديثاً ولا تظهر في الأقسام القديمة أعلاه: `/api/auth/callback`, `/api/byok/config`, `/api/health`, `/api/evening-reminder`, `/api/new-user-nudge`, `/api/push-send`, `/api/push-test`, `/api/streak-alert`, `/api/weekly-report`, `/api/zakat/prices`, `/api/testimonials`.

---

## 🛠️ كيفية الاختبار

يمكنك اختبار نقاط الاتصال محلياً باستخدام `curl`:

```bash
# Cron endpoint
curl -H "Authorization: Bearer YOUR_SECRET" http://localhost:3000/api/health-score-snapshot

# MCP tools via PAT (Streamable HTTP handshake)
curl -H "Authorization: Bearer fjk_live_..." \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
     http://localhost:3000/api/mcp

# Create a PAT-scoped write (REST webhook)
curl -X POST http://localhost:3000/api/webhook/transaction \
     -H "Authorization: Bearer fjk_live_..." \
     -H "Content-Type: application/json" \
     -d '{"type":"expense","amount":15.5,"category":"طعام وشراب","transaction_date":"2026-09-04"}'
```

---

## 📎 مرجع آلي (Machine-Readable References)

| الملف | الوصف | الرابط |
|:------|:------|:-------|
| OpenAPI 3.1 | مواصفة كاملة للـ API (Swagger/Postman compatible) | [openapi.json](https://fajrak.com/openapi.json) |
| MCP Metadata | اكتشاف أدوات MCP للعملاء المدعومة | [/.well-known/mcp.json](https://fajrak.com/.well-known/mcp.json) |

---

**ملاحظة:** هذا التوثيق أولي وسيتم تحديثه مع إطلاق الإصدار v4.0. القسم الخاص بـ LLM Ecosystem (PAT / MCP / BYOK) يعكس التنفيذ الحالي في `app/api/` — ويبقى مرجع الحقيقة للمفاهيم المفصّلة في `docs/projects/llm-ecosystem_prd.md`.
