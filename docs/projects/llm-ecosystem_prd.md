# وثيقة متطلبات المنتج — بيئة فجرك للذكاء الاصطناعي (Fajrak LLM Ecosystem PRD)

الاسم: منصة فجرك المالية والبيئة البرمجية المدمجة للذكاء الاصطناعي
(Fajrak Financial Platform & LLM Ecosystem)

المُعِد: عبد الله أبو صغيرة  
التاريخ: سبتمبر 2026  
الحالة: **Engineering Final Draft — v3.2** (بعد مراجعة المعمارية وتفكيك الميزات + مراجعة gstack + حسم أسئلة §9 بالبيانات الحالية)

---

## 1. نظرة عامة ورؤية المنتج (Product Vision)

فجرك (Fajrak) نظام مالي شخصي متكامل (Web + Flutter + Supabase). يهدف هذا الإصدار
إلى تزويد المستخدم **بيئة ذكاء اصطناعي مفتوحة ومستقلة** تتيح له:

1. **ربط بياناته المالية بأي نموذج LLM** يختاره (محلي أو سحابي) باستخدام نموذج
   **BYOK (Bring Your Own Key)**.
2. **تمكين وكلاء خارجيين** (مثل Cursor, Claude Desktop) من تنفيذ إجراءات مالية
   آمنة عبر بروتوكول **MCP (Model Context Protocol)** الموحد.

> **قرار معماري (تم الاتفاق عليه):** تقسيم هذا الإصدار إلى **ميزتين مستقلتين**
> قابلتين للتسليم المنفصل، لأن لكل منهما نموذج أمان مفاتيح **متعارض**:

| الميزة | نموذج المفتاح | نوع الوصول |
|--------|---------------|------------|
| **Feature A — BYOK Chat Assistant** | مفتاح LLM يبقى على جهاز المستخدم | دردشة/تحليل داخل التطبيق |
| **Feature B — Financial MCP Server + PAT** | مفتاح `fjk_live_` مُجزَّأ SHA-256 على الخادم | وكلاء خارجيون ينفذون إجراءات مالية |

---

## 2. المعمارية الهيكلية الشاملة (End-to-End System Architecture)

```
                                      ┌──────────────────────────────────────────────┐
                                      │         Supabase Cloud / PostgreSQL          │
                                      │   • Business Logic (RPCs / RLS Policies)     │
                                      │   • Existing PAT (user_api_keys) — Feature B │
                                      └───────────────────────┬──────────────────────┘
                                                              │
                                                              ▼
                                      ┌──────────────────────────────────────────────┐
                                      │        Fajrak Core REST & Realtime API       │
                                      │             https://api.fajrak.app/v1        │
                                      └───────┬──────────────────────────┬───────────┘
                                              │                          │
                          Feature B: MCP      │                          │  Feature B: PAT / MCP
                          hosted endpoint     │                          │  auth via fjk_live_
                                              ▼                          ▼
        ┌──────────────────────────────┐        ┌───────────────────────────────────┐
        │  Feature B: @fajrak/mcp-server│        │         Fajrak BYOK Proxy (A)     │
        │  (MCP tools: get_balances,   │        │  thin server-side proxy, per-req  │
        │   create_transaction...)      │        │  client-encrypted key, forwarded  │
        └──────────────┬───────────────┘        └───────────────┬───────────────────┘
                       │                                        │
                       ▼                                        ▼
        ┌──────────────────────────────────────────────────────────────────────────┐
        │                 بيئة الذكاء الاصطناعي والربط المفتوح                       │
        ├────────────────────────────────────────────┬─────────────────────────────┤
        │ Feature A — Web/Flutter BYOK Chat client   │  Feature B — External Agents│
        │  • Ollama (local, device-only keys)        │  • Cursor, Claude Desktop    │
        │  • Cloud providers via BYOK Proxy (CORS)   │  • Auth via fjk_live_ PAT    │
        └────────────────────────────────────────────┴─────────────────────────────┘
```

---

## 3. قرارات المعمارية المتفق عليها (Agreed Architecture Decisions)

| # | القرار | النتيجة |
|---|--------|---------|
| AD-1 | **تقسيم الميزات** | ميزتان مستقلتان (A و B) بنماذج مفاتيح منفصلة. |
| AD-2 | **مفتاح السحابة على الويب** | متصفح لا يستطيع استدعاء OpenAI/NVIDIA مباشرة (CORS). الحل: **نموذج BYOK Proxy** رفيع من جانب الخادم. |
| AD-3 | **تخزين مفتاح الـ Proxy** | المفتاح **مشفَّر على جهاز المستخدم** (Web Crypto) ويُرسل **لكل طلب** ثم يُتلف؛ الخادم **لا يخزّن المفتاح إطلاقاً**. |
| AD-4 | **إعادة استخدام PAT** | نظام `user_api_keys` الموجود (migration 039) يُستخدم **كما هو** لمصادقة MCP — لا نظام مفاتيح جديد. |

---

## 4. الميزة A — مساعد الدردشة BYOK (Feature A: BYOK Chat Assistant)

### 4.1 مقدمة

مساعد مالي داخل التطبيق (Web + Flutter) يتيح للمستخدم توجيه أسئلة وتحليلات
لمدة LLM من اختياره، مع تمرير بياناته المالية (بإذنه) لتحليل سياقي. المفتاح
يُخزَّن **حصرياً على الجهاز**.

### 4.2 إعدادات المزودين الموحدة (Cross-Platform BYOK Config Standard)

```ts
export interface LLMProviderConfig {
  id: string
  name: string
  baseUrl: string          // For cloud: points at Fajrak BYOK Proxy on web
  defaultModel: string
  requiresApiKey: boolean
  apiKeyHeaderName: string
  customHeaders?: Record<string, string>
  kind: 'clientDirect' | 'proxy'   // NEW: routing decision
}

export const SUPPORTED_PROVIDERS: Record<string, LLMProviderConfig> = {
  nvidia: {
    id: 'nvidia', name: 'NVIDIA NIM',
    baseUrl: '/api/byok/proxy', defaultModel: 'meta/llama-3.1-70b-instruct',
    requiresApiKey: true, apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  openai: {
    id: 'openai', name: 'OpenAI',
    baseUrl: '/api/byok/proxy', defaultModel: 'gpt-5.4-mini',
    requiresApiKey: true, apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  anthropic: {
    id: 'anthropic', name: 'Anthropic',
    baseUrl: '/api/byok/proxy', defaultModel: 'claude-sonnet-4-6',
    requiresApiKey: true, apiKeyHeaderName: 'x-api-key',
    customHeaders: { 'anthropic-version': '2023-06-01' }, kind: 'proxy',
  },
  gemini: {
    id: 'gemini', name: 'Google Gemini',
    baseUrl: '/api/byok/proxy', defaultModel: 'gemini-2.5-pro',
    requiresApiKey: true, apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter',
    baseUrl: '/api/byok/proxy', defaultModel: 'auto',
    requiresApiKey: true, apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  ollama: {
    id: 'ollama', name: 'Ollama (Local Engine)',
    baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.1',
    requiresApiKey: false, apiKeyHeaderName: '', kind: 'clientDirect',
  },
}
```

**ملاحظة التوافق (تم التحقق عبر context7):**
- **شكل الطلب أصلي لكل مزوّد (`native per-provider pass-through`).** لا يوجد شكل
  `/chat/completions` موحد يعمل مع جميع المزوّدين: OpenAI/OpenRouter تستخدم
  `/chat/completions` و `model + messages[]`، بينما Anthropic تستخدم `/v1/messages`
  (`system` نصّي + `max_tokens` إجباري + `x-api-key`/`anthropic-version`)، وGemini
  تستخدم `generateContent` بصيغة مختلفة.
- **القرار (إغلاق C2):** الوكيل في هذا الإصدار **وكيل تمرير رفيع (thin pass-through)**
  — يستقبل نص الطلب الأصلي للمزوّد كما يرسله العميل (الذي يعرف شكل كل مزوّد)،
  ويستبدل `Authorization`/`x-api-key` بالمفتاح المُفك تشفيره، ثم يعيد توجيه
  الطلب والاستجابة (بما فيها تدفق SSE) **دون أي تفكيك/إعادة بناء للجسم**.
  هذا يتجنب بناء طبقة ترجمة لكل مزوّد ويُبقي الوكيل عديم الحالة ويُتلف المفتاح.
- **الاستثناء الوحيد:** مسار `ollama` هو `clientDirect` (اتصال محلي مباشر بلا وكيل).
- **التدفق (streaming):** عبر `stream: true` + أحداث `SSE` — يجب تمريره كما هو
  (relay) عبر الوكيل والعميل معاً دون تخزين مؤقت كامل.
- **نموذج الملفات الافتراضي في المسودة القديمة قديم** (gemini-1.5-flash, claude-3-5-sonnet-20240620, gpt-4o-mini). استُبدلت بأسماء حديثة أعلاه. (حُسمت عبر §9 ف1 بأسماء نماذج 2026 الحالية؛ راجع §9.)

### 4.3 أمان مفتاح BYOK (Feature A)

**Web (Next.js):**
- يُشفر المفتاح على المتصفح عبر **Web Crypto API** (AES-GCM، مفتاح **غير قابل
  للتصدير** `non-extractable` يُشتق من سر محلي عبر `crypto.subtle.deriveKey`).
- **التخزين (إغلاق M3):** يُحفظ **النص المشفَّر (ciphertext) فقط في IndexedDB**،
  والمفتاح المشتق يبقى **غير قابل للتصدير في الذاكرة** عند الحاجة. **لا تُخزَّن
  المفاتيح الخام في LocalStorage إطلاقاً** (LocalStorage غير آمن ولا يُحفظ سوى
  نص مشفَّر محايد كخيار نسخ احتياطي ضمن سياق آمن).
- عند استدعاء مزود سحابي: يُرسل **مفتاح مشفَّر لكل طلب** إلى `/api/byok/proxy`،
  ويُفك تشفيره داخل الخادم فقط لهذا الطلب، ثم **يُتلف** — لا يُخزَّن.
- **مصادقة الوكيل (إغلاق C1):** الوكيل **محمي بمصادقة المستخدم** — يجب أن يكون
  الطلب مصحوباً بجلسة Supabase نشطة (userId صالح) وإلا يُرفض `401`.
  وهذا يمكّن **حدود معدل النقل لكل مستخدم (per-user rate limiting)** عبر جدول
  `api_audit_log` الموجود — وهو ما يجيب على سؤال §9 ف2 (نعم) دون فتح الوكيل
  كمسار تحويل عام (open relay) لغير المسجَّلين.
- **الوكيل عديم الحالة وتمرير أصلي:** يستقبل نص الطلب الأصلي للمزوّد (+ المفتاح
  المشفَّر) ويعيد توجيهه كما هو بعد تبديل رأس المصادقة — لا توجد ترجمة صيغة
  (انظر إغلاق C2 في §4.2).
- **المزود المحلي (Ollama):** `clientDirect` — المتصفح يتصل بـ `localhost:11434`
  مباشرة دون إشراك الخادم (يتطلب تهيئة CORS في Ollama).

**Flutter:**
- إضافة تبعية **`flutter_secure_storage`** (غير موجودة حالياً — جديد) لتخزين
  المفاتيح في Keychain / Android Keystore.
- Ollama على الموبايل:
  - المحاكي: `http://10.0.2.2:11434/v1`
  - الجهاز الحقيقي: `http://<LAN-IP>:11434/v1`
  - يتطلب `android:usesCleartextTraffic="true"` (أو network security config)
    و `NSAllowsLocalNetworking` على iOS — **قرارات منصات لم تكن في المسودة**. 
- البنية: إضافة **`CustomHttpClientAdapter`** يستخدم `http` الحالي (لا حاجة لـ Dio).

> **قرار أمني (AD-3):** الخادم **لا يخزّن** مفاتيح LLM للمستخدمين إطلاقاً،
> حتى المشفَّرة. المبدأ: "Zero-Server Storage for BYOK".

### 4.4 نماذج العمليات (Web & Flutter)

**شائع (المساعد):** System prompt مالي + سياق بيانات المستخدم (أرصدة، تدفق نقدي،
نظرة عامة) مع `temperature: 0.2`.

**Web (proxy flow — native pass-through):**
```
Browser ──POST /api/byok/proxy (session auth + encrypted key + provider-native payload)
   ──▶ Next.js route ──decrypt key──▶ swap auth header ──▶ fetch(provider native endpoint)
   ◀──────────────── SSE stream relayed verbatim ◀───────────────────────────────────────┘
```

**Flutter (local flow):**
```dart
Future<String> queryFinancialInsight({
  required String providerBaseUrl,
  required String model,
  required String prompt,
}) async {
  final apiKey = await _secureStorage.read(key: 'llm_key_${providerId}');
  final headers = <String, String>{'Content-Type': 'application/json'};
  if (apiKey != null && apiKey.isNotEmpty) headers['Authorization'] = 'Bearer $apiKey';
  // POST $providerBaseUrl/chat/completions { model, messages, temperature: 0.2 }
  // return choices[0].message.content
}
```

---

## 5. الميزة B — خادم MCP المالي + PAT (Feature B: Financial MCP Server + PAT)

### 5.1 مقدمة

يسمح لوكلاء الذكاء الاصطناعي الخارجيين (Cursor, Claude Desktop) بتنفيذ إجراءات
مالية نيابةً عن المستخدم **بعد التحقق من مفتاح `fjk_live_...`** الصادر من نظام
المفاتيح الموجود، مع احترام أذوناته (scopes).

### 5.2 إعادة استخدام نظام PAT الموجود (AD-4)

- **لا نظام مفاتيح جديد.** يُستخدم الجدول `public.user_api_keys` (migration 039)
  كما هو، مع `lib/api-keys.ts` ومسارات `app/api/api-keys/{create,revoke}`.
- كل ما يحتاجه خادم MCP: التحقق من المفتاح + فحص الـ scopes + تسجيل `api_audit_log`.

### 5.3 أدوات خادم MCP الموحد (@fajrak/mcp-server)

يُنشأ عبر **`@modelcontextprotocol/sdk`** (TypeScript) على طبقة نقل
**Streamable HTTP** (مع دعم SSE للحصول على الموارد).

| الأداة | الاختصاصات المطلوبة | الوصف |
|--------|---------------------|-------|
| `get_balances` | `read:balances` | استعلام الأرصدة في حسابات المستخدم |
| `get_cashflow_summary` | `read:transactions` | ملخص التدفق النقدي |
| `create_transaction` | `write:transactions` | تسجيل مصروف/دخل |

```ts
// MCP Server (TypeScript, @modelcontextprotocol/sdk)
const server = new McpServer({ name: '@fajrak/mcp-server', version: '1.0.0' })

server.registerTool(
  'get_balances',
  {
    description: 'استعلام عن الأرصدة الحالية في جميع حسابات المستخدم',
    inputSchema: {
      account_type: z.enum(['all', 'bank', 'cash', 'savings']).default('all'),
    },
  },
  async ({ account_type }, extra) => {
    const userId = await authenticatePat(extra.request.auth) // fjk_live_ check + scope
    return { content: [{ type: 'text', text: JSON.stringify(await getBalances(userId)) }] }
  },
)
```

### 5.4 مصادقة PAT داخل MCP

- العميل يرسل المفتاح في `Authorization: Bearer fjk_live_...`.
- الخادم: `hashKey(secret)` → بحث في `user_api_keys` بواسطة `key_hash` →
  فحص `is_active`, `expires_at`, الـ `scopes` → تسجيل في `api_audit_log`.
- **تطبيق الـ scopes:** عند استدعاء `create_transaction` بمفتاح يملك فقط
  `read:balances` → إرجاع **403 Forbidden** (اختبار قسري في خطة الجودة).

### 5.5 (مستقبل، غير مدرج في هذا الإصدار)

مزامنة أدوات MCP مع التطبيق الداخلي (BYOK chat يستدعي نفس دوال RPC المُخزَّنة)
بدلاً من منطق منفصل — قرار هندسي يؤجَّل حتى بعد إثبات كلا الميزتين.

---

## 6. الامتثال الأمني والشرعي (Security & Compliance)

### 6.1 أمان مفاتيح LLM (BYOK)

- مفاتيح المزودين (`nvapi-...`, `sk-...`) **تُخزَّن حصرياً على جهاز المستخدم**
  (Encrypted IndexedDB web / Keychain / Keystore — **لا LocalStorage للمفاتيح الخام**،
  انظر إغلاق M3 في §4.3).
- عند المرور عبر الوكيل: **مشفَّرة لكل طلب ثم تُتلف** — الخادم لا يخزّنها (AD-3).
- الوكيل **محمي بجلسة Supabase** ويفرض **حدود معدل لكل مستخدم** عبر `api_audit_log`
  لتفادي استخدامه كمسار تحويل عام (إغلاق C1؛ تقع حدوده النهائية في §9 ف2).

### 6.2 أمان مفاتيح فجرك (PAT)

- تُخزَّن كـ **SHA-256 hashes فقط** في `user_api_keys.key_hash` (موجود).
- معاملات خارجية مقيّدة بالـ scopes + rate limiting + سجل تدقيق.

### 6.3 الامتثال الأحكام الشرعية

- تُدمج قواعد مطابقة للشريعة في **System Prompt** وفي **طبقة guardrail** على
  خادم MCP (وليس فقط نص التحفيز)، لكونها تُطبَّق أيضاً على مخرجات الأدوات.
- لا تُقترح أدوات استثمارية قائمة على الفائدة الربوية.
- **استعارة مهارة `llm-trading-agent-security`** (مهارة مثبتة محلياً) لضوابط:
  حدود الإنفاق، منع حقن الفريق، سلطة كتابة المعاملات.

---

## 7. خطة الاختبار والتحقق الشاملة (Validation & QA Plan)

### 7.1 البيئة المحلية (Ollama)
- **الويب:** طلبات إلى `localhost:11434` مع معالجة أخطاء CORS.
- **فلاتر:** الاختبار من محاكي Android عبر `10.0.2.2:11434` وتحليل الاستجابة.

### 7.2 تكوين NVIDIA NIM
- استعلامات مالية عبر `meta/llama-3.1-70b-instruct` بمفتاح `nvapi-...`
  عبر الوكيل، والتحقق من السرعة والدقة.

### 7.3 اختبار الصلاحيات الحازم (PAT Security Test)
- إرسال `create_transaction` بمفتاح يملك `read:balances` فقط.
- **المتوقع:** `403 Forbidden`.

### 7.4 اختبار الوكيل (Proxy)
- **المصادقة (مطلوب 401):** طلب `/api/byok/proxy` بدون جلسة Supabase صالحة يُرفض.
- المفتاح لا يُخزَّن: بعد إكمال الطلب، تأكيد غياب أي أثر للمفتاح في قاعدة
  البيانات أو السجلات.
- تدفق SSE يُمرَّر **كما هو (verbatim)** عبر الوكيل.
- **التمرير الأصلي للمزوّد:** إرسال جسم أصلي لـ Anthropic (`/v1/messages`) وجسم
  أصلي لـ Gemini (`generateContent`) عبر نفس الوكيل، والتأكد من نجاح كل منهما
  (إثبات C2 — لا ترجمة صيغة داخل الوكيل).

### 7.5 اختبارات الواجهة والجودة الحالية
- صفحة `settings` على الويب وفلاتر مغطاة بالنقل (loading skeletons,
  autoFocus على أول حقل، aria-label للأزرار الأيقونية، guard `if (_saving) return;`
  في نماذج فلاتر، `useSafeArea` في الـ bottom sheets).

---

## 8. نطاق العمل (Scope) ونظرة التسليم

### في هذا الإصدار (In Scope)
- Feature A: BYOK chat (Web + Flutter) مع Ollama + مزودي سحابة عبر الوكيل.
- Feature B: `@fajrak/mcp-server` (3 أدوات) + مصادقة PAT الحالية.
- Proxy `app/api/byok/proxy/route.ts` (Web) + حماية بجلسة Supabase وحدود معدل لكل مستخدم.
- i18n AR/EN لكل النصوص الجديدة.
- تبعيات Flutter جديدة: `flutter_secure_storage` (+ تكوين cleartext/NSAllowsLocalNetworking).
- تكوينات منصة للوصول المحلي (Ollama): `network_security_config.xml` / `AndroidManifest`
  على Android، و `NSAllowsLocalNetworking` في `Info.plist` على iOS.

### خارج هذا الإصدار (Out of Scope)
- نموذج "remote MCP client" المدمج داخل تطبيق فجرك لمزامنة الأدوات الداخلية.
- دعم مزودين إضافيين بعد المجموعة المذكورة في 4.2.
- مزامنة أدوات MCP مع دوال RPC الداخلية (مؤجَّلة — انظر 5.5).

### أسماء الملفات المتوقعة
- `app/api/byok/proxy/route.ts` — وكيل BYOK (Web).
- `lib/byok/providers.ts` — `SUPPORTED_PROVIDERS` (مشترك).
- `lib/byok/client.ts` — عميل استدعاء (Web).
- `@fajrak/mcp-server/` — خادم MCP (Feature B).
- `mobile/.../services/llm_service.dart` — عميل فلاتر.
- `mobile/.../android/app/src/main/res/xml/network_security_config.xml` + تعديل `AndroidManifest.xml`.
- `mobile/.../ios/Runner/Info.plist` — `NSAllowsLocalNetworking`.
- `supabase/migrations/040_*.sql` — (فقط إن لزم؛ نظام PAT موجود).

---

## 9. أسئلة مفتوحة (Open Questions) — تُحسم قبل التنفيذ

1. **نموذج الملفات الافتراضي (حُسم §9 ف1):**
   - **المبدأ:** أسماء نماذج 2026 الحالية بدل الأسماء القديمة المتروكة
     (`gpt-4o-mini` / `claude-3-5-*` / `claude-3-5-sonnet-latest` — هذه موديلات
     قديمة/متوقفة العائلة في 2026). التحقّق تم عبر web-search + context7.
   - **الافتراضي الحكيم (cost-tier متوازن):**
     - **OpenAI:** `gpt-5.4-mini` (منخفض التكلفة، يكفي تحليل المعاملات اليومي).
     - **Anthropic:** `claude-sonnet-4-6` (درجة Sonnet: جودة عالية قرب Opus بتكلفة أقل).
     - **NVIDIA NIM:** `meta/llama-3.1-70b-instruct` (إبقاؤه كافتراضي مستقر مفتوح المصدر).
     - **Gemini:** `gemini-2.5-pro`.
   - **التحليل العميق:** `claude-sonnet-4-6` أو `claude-sonnet-5` (درجة Sonnet).
   - **OpenRouter:** `auto` يُستبدل بقيمة صريحة عند العرض — لا يُترك فارغاً.
   - **بهندسة بيئية:** تُقيَّد الأسماء في `SUPPORTED_PROVIDERS` (قد تتبدّى بأسماء
     `_latest` لاحقاً حتى لا تتقادم الأسماء عند إعادة تسمية مزوّد).
2. **حُسم بمراجعة gstack (إغلاق C1):** نعم — يُشحن الوكيل بحدود معدل نقل لكل
   مستخدم عبر `api_audit_log` الموجود، مشروطةً بتسجيل دخول Supabase صالح.
   **العتبة الرقمية مثبّتة:** **30 طلب/دقيقة لكل مستخدم** (عند التجاوز → `429`).
3. هل يوجد حساب/فلترة للمحتوى (moderation) لمخرجات LLM قبل عرضها للمستخدم؟
   — **الالتزام:** يبقى باباً مفتوحاً صراحةً، ويُراجع مع ضوابط مهارة
   `llm-trading-agent-security` في §6.3 قبل أي خروج للعرض (لا يُسقَط صامتاً).
