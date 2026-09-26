# وثيقة متطلبات المنتج — بيئة فجرك للذكاء الاصطناعي (Fajrak LLM Ecosystem PRD)

الاسم: منصة فجرك المالية والبيئة البرمجية المدمجة للذكاء الاصطناعي
(Fajrak Financial Platform & LLM Ecosystem)

المُعِد: عبد الله أبو صغيرة
التاريخ: سبتمبر 2026
الحالة: **Engineering Final Draft — v3.3** (بعد مراجعة CEO + Eng Review + ECC Security Audit + gstack Unified Decision Log)

---

## 1. نظرة عامة ورؤية المنتج (Product Vision)

فجرك (Fajrak) نظام مالي شخصي متكامل (Web + Flutter + Supabase). يهدف هذا الإصدار
إلى تزويد المستخدم **بيئة ذكاء اصطناعي مفتوحة ومستقلة** تتيح له:

1. **ربط بياناته المالية بأي نموذج LLM** يختاره (محلي أو سحابي) باستخدام نموذج
   **BYOK (Bring Your Own Key)**.
2. **تمكين وكلاء خارجيين** (مثل Cursor, Claude Desktop) من تنفيذ إجراءات مالية
   آمنة عبر بروتوكول **MCP (Model Context Protocol)** الموحد.
3. **طبقة أدوات موحدة (Unified Tool Layer)** — BYOK Chat و MCP Agents يستخدمان
   نفس دوال RPC المالية، مما يزيل التكرار ويضمن مصدر حقيقة واحد.

> **قرار معماري (تم الاتفاق عليه — ADR-001):** تقسيم هذا الإصدار إلى **ميزتين مستقلتين**
> قابلتين للتسليم المنفصل، لأن لكل منهما نموذج أمان مفاتيح **متعارض**:

| الميزة | نموذج المفتاح | نوع الوصول |
|--------|---------------|------------|
| **Feature A — BYOK Chat Assistant** | مفتاح LLM يبقى على جهاز المستخدم | دردشة/تحليل داخل التطبيق |
| **Feature B — Financial MCP Server + PAT** | مفتاح `fjk_live_` مُجزَّأ SHA-256 على الخادم | وكلاء خارجيون ينفذون إجراءات مالية |

> **قرار معماري (ADR-013):** **طبقة أدوات موحدة** — كلا الميزتين تستدعيان نفس دوال
> RPC المالية (`get_account_balances`، `get_cashflow_summary`، `create_transaction`).
> لا منطق أعمال مكرر. هذا يحل مشكلة "Net worth في 5 أماكن" المكتشفة في التدقيق.

---

## 2. المعمارية الهيكلية الشاملة (End-to-End System Architecture)

```
                                      ┌──────────────────────────────────────────────┐
                                      │         Supabase Cloud / PostgreSQL          │
                                      │   • Business Logic (RPCs / RLS Policies)     │
                                      │   • Existing PAT (user_api_keys) — Feature B │
                                      │   • proxy_usage (atomic rate limit) — Feature A│
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
        │   get_cashflow_summary,       │        │  client-encrypted key, forwarded  │
        │   create_transaction)         │        └───────────────┬───────────────────┘
        └──────────────┬───────────────┘                        │
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

**طبقة الأدوات الموحدة (Unified Tool Layer) — NEW per ADR-013:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED TOOL LAYER (Shared RPCs)                         │
│                                                                             │
│  MCP Server Tools          BYOK Chat Context          Gamification          │
│  ─────────────────         ─────────────────         ───────────────       │
│  get_balances      ──────►  get_account_balances RPC ◄────── Net Worth     │
│  get_cashflow_summary ───►  get_cashflow_summary RPC ◄───  Health Score   │
│  create_transaction  ────►  create_transaction RPC   ──►  Streaks         │
│                                                                             │
│  Single RPC per capability. No duplication. Single source of truth.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. قرارات المعمارية المتفق عليها (Agreed Architecture Decisions)

| # | القرار | النتيجة | ADR |
|---|--------|---------|-----|
| AD-1 | **تقسيم الميزات** | ميزتان مستقلتان (A و B) بنماذج مفاتيح منفصلة. | ADR-001 |
| AD-2 | **مفتاح السحابة على الويب** | متصفح لا يستطيع استدعاء OpenAI/NVIDIA مباشرة (CORS). الحل: **نموذج BYOK Proxy** رفيع من جانب الخادم. | ADR-002 |
| AD-3 | **تخزين مفتاح الـ Proxy** | المفتاح **مشفَّر على جهاز المستخدم** (Web Crypto) ويُرسل **لكل طلب** ثم يُتلف؛ الخادم **لا يخزّن المفتاح إطلاقاً**. | ADR-003 |
| AD-4 | **إعادة استخدام PAT** | نظام `user_api_keys` الموجود (migration 039) يُستخدم **كما هو** لمصادقة MCP — لا نظام مفاتيح جديد. | ADR-004 |
| AD-5 | **عداد ذرّي لكل مستخدم** | جدول `proxy_usage` مع `bump_proxy_usage()` RPC — fail-fast 429 عند >30/د. | ADR-005 |
| AD-6 | **MCP كمسار Next.js** | `app/api/mcp/route.ts` يستخدم `@modelcontextprotocol/server` v2 على Streamable HTTP. | ADR-006 |
| AD-7 | **حدود معدل 30 طلب/دقيقة** | عتبة ثابتة لكل مستخدم؛ تجاوز → 429 مع `x-byok-origin: proxy`. | ADR-007 |
| AD-8 | **مصطلحات الصلاحيات بأسلوب التطبيق** | `read_balances` / `read_transactions` / `create_transaction` (ليس colon-style). | ADR-008 |
| AD-9 | **تنسيق طلب أصلي لكل مزود** | لا ترجمة صيغة — OpenAI `/chat/completions`، Anthropic `/v1/messages`، Gemini `generateContent`. الوكيل يمرر كما هو. | ADR-009 |
| AD-10 | **طبقة أدوات موحدة** | MCP tools و BYOK context يستدعيان نفس RPCs — لا تكرار منطق أعمال. | ADR-013 |
| AD-11 | **تدوير المفاتيح (Key Rotation)** | `keyId` على كل غلاف RSA-OAEP؛ مفتاح خاص قديم محتفظ به حتى إعادة تغليف كل الشظايا. | ADR-011 |
| AD-12 | **طبقة إشراف (Moderation)** | Pre-output guardrails + Post-output DOMPurify sanitization — لا يُسقَط صامتاً. | ADR-012 |
| AD-13 | **المراقبة (Observability)** | Metrics/alerts/dashboards للـ proxy، MCP، crypto، rate limits — Prime Directive #5. | ADR-015 |
| AD-14 | **التكرار المحمي (Idempotency)** | `idempotency_key` إجباري على `create_transaction` — منع double-charge. | ADR-014 |

---

## 4. الميزة A — مساعد الدردشة BYOK (Feature A: BYOK Chat Assistant)

### 4.1 مقدمة

مساعد مالي داخل التطبيق (Web + Flutter) يتيح للمستخدم توجيه أسئلة وتحليلات
لـ LLM من اختياره، مع تمرير بياناته المالية (بإذنه) لتحليل سياقي. المفتاح
يُخزَّن **حصرياً على الجهاز**.

### 4.2 إعدادات المزودين الموحدة (Cross-Platform BYOK Config Standard)

```ts
export interface LLMProviderConfig {
  id: string
  name: string
  baseUrl: string          // For cloud: points at Fajrak BYOK Proxy on web
  defaultModel: string
  requiresApiKey: ***
  apiKeyHeaderName: string
  customHeaders?: Record<string, string>
  kind: 'clientDirect' | 'proxy'   // NEW: routing decision
}

export const SUPPORTED_PROVIDERS: Record<string, LLMProviderConfig> = {
  nvidia: {
    id: 'nvidia', name: 'NVIDIA NIM',
    baseUrl: '/api/byok/proxy', defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b',
    requiresApiKey: *** apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  openai: {
    id: 'openai', name: 'OpenAI',
    baseUrl: '/api/byok/proxy', defaultModel: 'gpt-5.4-mini',
    requiresApiKey: *** apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  anthropic: {
    id: 'anthropic', name: 'Anthropic',
    baseUrl: '/api/byok/proxy', defaultModel: 'claude-sonnet-4-6',
    requiresApiKey: *** apiKeyHeaderName: 'x-api-key',
    customHeaders: { 'anthropic-version': '2023-06-01' }, kind: 'proxy',
  },
  gemini: {
    id: 'gemini', name: 'Google Gemini',
    baseUrl: '/api/byok/proxy', defaultModel: 'gemini-2.5-pro',
    requiresApiKey: *** apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter',
    baseUrl: '/api/byok/proxy', defaultModel: 'auto',
    requiresApiKey: *** apiKeyHeaderName: 'Authorization', kind: 'proxy',
  },
  ollama: {
    id: 'ollama', name: 'Ollama (Local Engine)',
    baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.1',
    requiresApiKey: *** apiKeyHeaderName: '', kind: 'clientDirect',
  },
}
```

**ملاحظة التوافق (تم التحقق عبر context7):**
- **شكل الطلب أصلي لكل مزوّد (`native per-provider pass-through`).** لا يوجد شكل
  `/chat/completions` موحد يعمل مع جميع المزوّدين.
- **القرار (إغلاق C2):** الوكيل **وكيل تمرير رفيع (thin pass-through)** — يستقبل نص الطلب الأصلي للمزوّد كما يرسله العميل، ويستبدل رأس المصادقة بالمفتاح المُفك تشفيره، ثم يعيد توجيه الطلب والاستجابة (بما فيها تدفق SSE) **دون أي تفكيك/إعادة بناء للجسم**.
- **الاستثناء الوحيد:** مسار `ollama` هو `clientDirect` (اتصال محلي مباشر بلا وكيل).
- **التدفق (streaming):** عبر `stream: true` + أحداث `SSE` — يجب تمريره كما هو (relay) عبر الوكيل والعميل معاً دون تخزين مؤقت كامل.
- **قرار نطاق (D3):** **3 مزودين فقط للإصدار v1** — Ollama، OpenRouter، NVIDIA NIM. الباقي مؤجل لـ v2 (يُضاف عبر remote config table `llm_providers`).

### 4.3 أمان مفتاح BYOK (Feature A)

**Web (Next.js):**
- يُشفر المفتاح على المتصفح عبر **Web Crypto API** (AES-GCM، مفتاح **غير قابل للتصدير** `non-extractable` يُشتق من سر محلي عبر `crypto.subtle.deriveKey`).
- **التخزين (إغلاق M3):** يُحفظ **النص المشفَّر (ciphertext) فقط في IndexedDB**، والمفتاح المشتق يبقى **غير قابل للتصدير في الذاكرة** عند الحاجة. **لا تُخزَّن المفاتيح الخام في LocalStorage إطلاقاً**.
- عند استدعاء مزود سحابي: يُرسل **مفتاح مشفَّر لكل طلب** إلى `/api/byok/proxy` **في غلاف KEK (envelope encryption)** — انظر AD-4 — ويُفك تشفيره داخل الخادم فقط لهذا الطلب ثم **يُتلف** — لا يُخزَّن.
- **مصادقة الوكيل (إغلاق C1):** الوكيل **محمي بمصادقة المستخدم** — يجب أن يكون الطلب مصحوباً بجلسة Supabase نشطة (userId صالح) وإلا يُرفض `401`. وهذا يمكّن **حدود معدل النقل لكل مستخدم** عبر جدول عداد ذرّي `proxy_usage`.
- **الوكيل عديم الحالة وتمرير أصلي:** يستقبل نص الطلب الأصلي للمزوّد (+ المفتاح المشفَّر) ويعيد توجيهه كما هو بعد تبديل رأس المصادقة — لا توجد ترجمة صيغة (انظر إغلاق C2 في §4.2).
- **المزود المحلي (Ollama):** `clientDirect` — المتصفح يتصل بـ `localhost:11434` مباشرة دون إشراك الخادم (يتطلب تهيئة CORS في Ollama).

**Flutter:**
- إضافة تبعية **`flutter_secure_storage`** لتخزين المفاتيح في Keychain / Android Keystore.
- Ollama على الموبايل:
  - المحاكي: `http://10.0.2.2:11434/v1`
  - الجهاز الحقيقي: `http://<LAN-IP>:11434/v1`
  - **Network Security Config** بأسماء المضيفين المسموحة (ليس `usesCleartextTraffic=true` الشامل) — ADR-009 pitfall fix.
  - iOS: `NSAllowsLocalNetworking` + `NSLocalNetworkUsageDescription` في `Info.plist`.
- البنية: إضافة **`CustomHttpClientAdapter`** يستخدم `http` الحالي (لا حاجة لـ Dio).

> **قرار أمني (AD-3):** الخادم **لا يخزّن** مفاتيح LLM للمستخدمين إطلاقاً، حتى المشفَّرة. المبدأ: *"Zero-Server Storage for BYOK"*.
>
> **قرار معماري (AD-4): نموذج مفتاح BYOK = تغليف غير متماثل RSA-OAEP (envelope encryption).**
> الحل المتماسك مع التزام الوكيل الرقيق (C2/HOLD SCOPE):
> - **عند التخزين (AD-3 سليم):** المفتاح غير القابل للتصدير `K` (Web: `crypto.subtle`؛ Flutter: منصة keystore) يشفر مفتاح المزوّد → ciphertext فقط في IndexedDB/keystore. `K` لا يغادر الجهاز أبداً ⇒ الخادم لا يرى `K`.
> - **لكل طلب (فك تشفير الخادم بلا تخزين، غير متماثل):** يشفّر العميل مفتاح المزوّد تحت مفتاح تغليف مؤقت (ephemeral AES-GCM envelope key) ثم يغلّف ذلك المفتاح **بالعام RSA-OAEP** (`wrapKey` بالمفتاح العام للمزوّد؛ المفتاح العام آمن للتوزيع). يرسل `[ciphertext] + [مفتاح التغليف المغلَّف بالعام]` إلى `/api/byok/proxy`. يفتح الخادم **بمفتاحه الخاص RSA-OAEP** (`unwrapKey` — سر بيئي/secret-manager، **ليس** DB/قرص)، يفك تشفير مفتاح المزوّد في الذاكرة، يبدّل رأس المصادقة، يبثّ، ثم **يُتلف** المفتاح والتغليف في `finally`.
> - **AD-3 صحيح:** الخادم لا يشاهد مفتاح المزوّد إطلاقاً غير مفتوح في الذاكرة لهذا الطلب؛ المفتاح الخاص سر لإدارة المفاتيح وليس مفتاح LLM مخزّن للمستخدم.
> - **دورة حياة المفتاح (AD-11):** زوج RSA واحد لإصدار v1 مع **وسم key-ID على كل غلاف** لتمكين **تدوير إضافي** (يُبقى المفتاح الخاص القديم حتى يُعاد تغليف كل الشظايا؛ الإبطال يعمل بعد التدوير). زوج لكل مستخدم مؤجَّل.
>
> **قرار معماري (AD-11 — Key Rotation Implementation):**  
> - **Re-wrap script:** يعيد تغليف كل الغلافات القديمة (`keyId` سابق) بالمفتاح العام الجديد.  
> - **UI in Settings:** زر "Rotate Key" يُنفّذ السكريبت ويُحدّث `BYOK_KEK_ID` و `BYOK_PRIVATE_KEY` في بيئة النشر.  
> - **Monitoring:** Alert على `unwrapProviderKey` failures مع `keyId` mismatch.  
> - **Per-user keypairs:** مؤجل لـ v2 (ADR-011).

> **قرار معماري (AD-5): عداد ذرّي لكل مستخدم لـ rate limiting (جدول `proxy_usage`).**  
> جدول عداد ذرّي جديد `proxy_usage(user_id, minute_bucket, count)` مع `INSERT ... ON CONFLICT (user_id, minute_bucket) DO UPDATE SET count=count+1 RETURNING count`؛ يُرفض الطلب عند تجاوز 30/د (fail-fast 429، لا طابور). **ممنوع صراحةً** أي عداد داخل العملية/مشترك.

### 4.4 نماذج العمليات (Web & Flutter)

**شائع (المساعد):** System prompt مالي + سياق بيانات المستخدم (أرصدة، تدفق نقدي، نظرة عامة) مع `temperature: 0.2`.

**Web (proxy flow — native pass-through):**
```
Browser ──POST /api/byok/proxy (session auth + encrypted key + provider-native payload)
   ──▶ Next.js route ──decrypt key──▶ swap auth header ──▶ fetch(provider native endpoint)
   ◀──────────────── SSE stream relayed verbatim ◀───────────────────────────────────────┘
```

**Flutter (local flow — Ollama clientDirect):**
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

**Flutter (proxy flow — cloud providers):**
- العميل يبني غلاف RSA-OAEP (`env` + `payload` + `keyId`) محلياً عبر `webcrypto`/platform channels.
- يرسل `POST {providerId, keyId, env, payload, body, stream}` إلى `{proxyBaseUrl}/api/byok/proxy` مع session JWT.
- الخادم يفك الغلاف، يبدل auth header، يمرر الطلب، يعيد SSE verbatim.

---

## 5. الميزة B — خادم MCP المالي + PAT (Feature B: Financial MCP Server + PAT)

### 5.1 مقدمة

يسمح لوكلاء الذكاء الاصطناعي الخارجيين (Cursor, Claude Desktop) بتنفيذ إجراءات
مالية نيابةً عن المستخدم **بعد التحقق من مفتاح `fjk_live_...`** الصادر من نظام
المفاتيح الموجود، مع احترام أذوناته (scopes).

### 5.2 إعادة استخدام نظام PAT الموجود (AD-4)

- **لا نظام مفاتيح جديد.** يُستخدم الجدول `public.user_api_keys` (migration 039) كما هو، مع `lib/api-keys.ts` ومسارات `app/api/api-keys/{create,revoke}`.
- كل ما يحتاجه خادم MCP: التحقق من المفتاح + فحص الـ scopes + تسجيل `api_audit_log`.
- **PAT Expiration:** إضافة عمود `expires_at` (افتراضي 90 يوماً) + UX للتدوير في الإعدادات.

### 5.3 أدوات خادم MCP الموحد (Unified Tool Layer per ADR-013)

يُنشأ عبر **`@modelcontextprotocol/server`** v2 (TypeScript) على طبقة نقل **Streamable HTTP** (مع دعم SSE).

| الأداة | الاختصاصات المطلوبة | الوصف | RPC المشتركة |
|--------|---------------------|-------|--------------|
| `get_balances` | `read_balances` | استعلام الأرصدة في حسابات المستخدم | `get_account_balances` |
| `get_cashflow_summary` | `read_transactions` | ملخص التدفق النقدي | `get_cashflow_summary` (RPC) أو استعلام مباشر |
| `create_transaction` | `create_transaction` | تسجيل مصروف/دخل | `create_transaction` (RPC جديد أو دالة موحدة) |

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
    // Unified tool layer: call shared RPC
    return { content: [{ type: 'text', text: JSON.stringify(await getBalances(userId)) }] }
  },
)
```

### 5.4 مصادقة PAT داخل MCP

- العميل يرسل المفتاح في `Authorization: Bearer ***
- الخادم: `hashKey(secret)` → بحث في `user_api_keys` بواسطة `key_hash` → فحص `is_active`, `expires_at`, الـ `scopes` → تسجيل في `api_audit_log`.
- **تطبيق الـ scopes (Dual Gate — ADR-006):**
  1. **HTTP Gate** — `enforceToolScope()` يفحص JSON-RPC `tools/call` قبل تسليم الطلب لـ SDK → 403 مع `{error: 'insufficient_scope', required_scope, tool}`.
  2. **Tool Callback Gate** — `requireScope(ctx, authInfo, scope)` يرمي خطأ إذا ناقص (defense in depth).
- **Idempotency (AD-14):** `create_transaction` يتطلب `idempotency_key` (UUID من العميل). الخادم يتحقق من المفاتيح المستخدمة في آخر 24 ساعة → يعيد المعاملة الموجودة إذا مكرر.

### 5.5 Category Validation

`create_transaction` يتحقق من الفئة ضد `INCOME_CATEGORIES` أو `EXPENSE_CATEGORIES` المطابقة لنوع المعاملة (يمنع cross-type pollution: فئة دخل على مصروف، أو العكس).

### 5.6 Sanitization

`sanitizeDescription()` يزيل HTML tags و `<>\"'&` chars.

### 5.7 Audit Log

`writeAuditLog({ apiKeyId, userId, action, payload })` fire-and-forget لكل استدعاء أداة.

---

## 6. الامتثال الأمني والشرعي (Security & Compliance)

### 6.1 أمان مفاتيح LLM (BYOK)

- مفاتيح المزودين (`nvapi-...`, `sk-...`) **تُخزَّن حصرياً على جهاز المستخدم** (Encrypted IndexedDB web / Keychain / Keystore — **لا LocalStorage للمفاتيح الخام**).
- عند المرور عبر الوكيل: **مشفَّرة لكل طلب ثم تُتلف** — الخادم لا يخزّنها (AD-3).
- الوكيل **محمي بجلسة Supabase** ويفرض **حدود معدل لكل مستخدم** عبر `proxy_usage` (AD-5).
- **Key Rotation (AD-11):** `keyId` على كل غلاف؛ سكريبت إعادة تغليف؛ UI للتدوير؛ مراقبة على فشل unwrap.

### 6.2 أمان مفاتيح فجرك (PAT)

- تُخزَّن كـ **SHA-256 hashes فقط** في `user_api_keys.key_hash` (موجود).
- معاملات خارجية مقيّدة بالـ scopes + rate limiting + سجل تدقيق.
- **PAT Expiration:** `expires_at` افتراضي 90 يوماً + rotation UX.

### 6.3 الامتثال الأحكام الشرعية

- تُدمج قواعد مطابقة للشريعة في **System Prompt** وفي **طبقة guardrail** على خادم MCP (وليس فقط نص التحفيز)، لكونها تُطبَّق أيضاً على مخرجات الأدوات.
- لا تُقترح أدوات استثمارية قائمة على الفائدة الربوية.
- **استعارة مهارة `llm-trading-agent-security`** لضوابط: حدود الإنفاق، منع حقن الفريق، سلطة كتابة المعاملات.

### 6.4 ECC Security FAILs — Fixed in This Version

| FAIL | الوصف | الإصلاح في هذا الإصدار |
|------|---------|------------------------|
| **XSS Prevention** | LLM output rendered directly دون sanitization | **Post-output DOMPurify sanitization** على كل مخرجات LLM قبل العرض (Web + Flutter). Pre-output guardrails عبر `llm-trading-agent-security` (ribا detection، hallucination check، prompt injection prevention). |
| **Dependency Security** | 8 moderate vulns (@opentelemetry) | **Pre-deploy gate:** `npm audit` zero high/critical في CI. |
| **Error Sanitization** | Proxy returns upstream error body verbatim | Proxy يُنظّف أخطاء المزود — لا تفاصيل داخلية للمستخدم. |

### 6.5 Security Warnings — Addressed

| التحذير | الإصلاح |
|----------|---------|
| PAT no expiration | عمود `expires_at` + rotation UX في الإعدادات |
| Idempotency missing | `idempotency_key` إجباري على `create_transaction` |
| Flutter cleartext blanket | **Network Security Config** بأسماء مضيفين محددة (10.0.2.2 + LAN CIDR) — لا `usesCleartextTraffic=true` الشامل |

---

## 7. خطة الاختبار والتحقق الشاملة (Validation & QA Plan)

### 7.1 البيئة المحلية (Ollama)
- **الويب:** طلبات إلى `localhost:11434` مع معالجة أخطاء CORS.
- **فلاتر:** الاختبار من محاكي Android عبر `10.0.2.2:11434` وتحليل الاستجابة.

### 7.2 تكوين NVIDIA NIM
- استعلامات مالية عبر `nvidia/nemotron-3-ultra-550b-a55b` بمفتاح `nvapi-...` عبر الوكيل، والتحقق من السرعة والدقة.

### 7.3 اختبار الصلاحيات الحازم (PAT Security Test — Mandatory)
- إرسال `create_transaction` بمفتاح يملك `read_balances` فقط.
- **المتوقع:** `403 Forbidden` مع `required_scope: create_transaction`.

### 7.4 اختبار الوكيل (Proxy)
- **المصادقة (مطلوب 401):** طلب `/api/byok/proxy` بدون جلسة Supabase صالحة يُرفض.
- **المفتاح لا يُخزَّن:** بعد إكمال الطلب، تأكيد غياب أي أثر للمفتاح في قاعدة البيانات أو السجلات.
- **تدفق SSE يُمرَّر كما هو (verbatim)** عبر الوكيل.
- **التمرير الأصلي للمزوّد:** إرسال جسم أصلي لـ Anthropic (`/v1/messages`) وجسم أصلي لـ Gemini (`generateContent`) عبر نفس الوكيل، والتأكد من نجاح كل منهما (إثبات C2).
- **Key Rotation:** تدوير المفتاح → `keyId` قديم مرفوض → `keyId` جديد يعمل.
- **Rate Limit:** 31 طلب → 429 مع `Retry-After` header.

### 7.5 اختبار طبقة الإشراف (Moderation Layer — AD-12)
- **Pre-output:** ردة فعل على مخرجات تحوي ribا suggestions → blocked/flagged.
- **Pre-output:** Prompt injection attempt → detected و blocked.
- **Post-output:** مخرجات تحوي `<script>alert(1)</script>` → DOMPurify ينظف → safe render.
- **Hallucination check:** مخرجات تحوي transaction IDs وهمية → flagged.

### 7.6 اختبار التكرار المحمي (Idempotency — AD-14)
- عميل يرسل `create_transaction` مع `idempotency_key` مكرر → يعيد المعاملة الموجودة (لا ينشئ جديداً).
- طلبين متزامنين بنفس المفتاح → واحد فقط ينجح.

### 7.7 اختبارات الواجهة والجودة الحالية
- صفحة `settings` على الويب وفلاتر مغطاة بالنقل (loading skeletons، autoFocus على أول حقل، aria-label للأزرار الأيقونية، guard `if (_saving) return;` في نماذج فلاتر، `useSafeArea` في الـ bottom sheets).

---

## 8. نطاق العمل (Scope) ونظرة التسليم

### في هذا الإصدار (In Scope)

**Feature A — BYOK Chat Assistant:**
- BYOK chat (Web + Flutter) مع **3 مزودين**: Ollama (clientDirect)، OpenRouter، NVIDIA NIM (proxy).
- Proxy `app/api/byok/proxy/route.ts` (Web) + حماية بجلسة Supabase + حدود معدل 30/د لكل مستخدم عبر `proxy_usage`.
- **Key Rotation (AD-11):** Re-wrap script، UI في الإعدادات، monitoring على unwrap failures.
- **Moderation Layer (AD-12):** Pre-output guardrails + Post-output DOMPurify sanitization.
- Vault `lib/byok/vault.ts` (Web Crypto، non-extractable key، PBKDF2 configurable iterations).
- Flutter `flutter_secure_storage` + Network Security Config (أسماء مضيفين محددة) + iOS `NSAllowsLocalNetworking`.
- i18n AR/EN لكل النصوص الجديدة.

**Feature B — Financial MCP Server + PAT:**
- MCP Server كـ Next.js route (`app/api/mcp/route.ts`) مع Streamable HTTP.
- 3 أدوات: `get_balances`، `get_cashflow_summary`، `create_transaction`.
- PAT auth reuse (`user_api_keys` + `verifyApiKey` + `rateLimit` + `writeAuditLog`).
- **HTTP Scope Gate + Tool Callback Gate** (dual layer) — 403 على scope ناقص.
- **Idempotency Key (AD-14)** على `create_transaction` — منع double-charge.
- **PAT Expiration:** `expires_at` افتراضي 90 يوماً + rotation UX.
- Category validation (income vs expense).

**Unified Tool Layer (AD-013):**
- MCP tools و BYOK chat يستدعيان نفس RPCs: `get_account_balances`، `get_cashflow_summary`، `create_transaction` (RPC موحد).
- يزيل تكرار Net worth (كان في 5 أماكن).

**Infrastructure:**
- DB Catch-up Migrations: 4 جداول prod + 15+ عمود في `profiles` + 21 فهرس غير مستخدم + 6 سياسات RLS performance fix.
- `proxy_usage` table + `bump_proxy_usage()` RPC (موجود).
- Observability (AD-13): Metrics/alerts/dashboards للـ proxy، MCP، crypto، rate limits.
- CI: BYOK provider sync check موجود.

### خارج هذا الإصدار (Out of Scope)

- نموذج "remote MCP client" المدمج داخل تطبيق فجرك لمزامنة الأدوات الداخلية.
- دعم مزودين إضافيين بعد الـ 3 المذكورين (يُضاف عبر remote config table `llm_providers` في v2).
- مزامنة أدوات MCP مع دوال RPC الداخلية — **مُنجز في هذا الإصدار** عبر Unified Tool Layer.
- Per-user RSA keypairs (key rotation v2).
- Provider config codegen (JSON → TS/Dart) — مؤجل لـ v2.
- Voice interface (STT/TTS).
- Marketplace for community MCP tools.

### أسماء الملفات المتوقعة

**Feature A (BYOK):**
- `app/api/byok/proxy/route.ts` — وكيل BYOK (Web).
- `lib/byok/providers.ts` — `SUPPORTED_PROVIDERS` (مشترك، 3 مزودين).
- `lib/byok/client.ts` — عميل استدعاء (Web).
- `lib/byok/envelope.ts` — Server-only RSA-OAEP unwrap + AES-GCM decrypt.
- `lib/byok/vault.ts` — Client-only IndexedDB vault (AES-GCM، non-extractable).
- `lib/byok/chat.ts` — Shared chat wire helpers: `buildChatBody()`، `extractDelta()`، `readStream()`.
- `lib/byok/types.ts` — Shared wire contract.
- `components/dashboard/chat-assistant.tsx` — BYOK Chat UI.
- `components/settings/byok-keys-section.tsx` — Settings UI مع زر Key Rotation.
- `mobile/.../services/llm_service.dart` — Flutter clientDirect (Ollama).
- `mobile/.../services/byok_service.dart` — Flutter proxy client.
- `mobile/.../android/app/src/main/res/xml/network_security_config.xml` — أسماء مضيفين محددة.
- `mobile/.../ios/Runner/Info.plist` — `NSAllowsLocalNetworking`.

**Feature B (MCP):**
- `app/api/mcp/route.ts` — خادم MCP (Next.js route، Streamable HTTP، 3 أدوات).
- `__tests__/api/mcp-route.test.ts` — اختبارات 401/429/403 + أدوات + idempotency.

**Shared/Unified:**
- `supabase/rpc/create_transaction.sql` — RPC موحد مع idempotency key.
- `supabase/migrations/043_user_byok_keys.sql` — BYOK metadata table (موجود).
- `supabase/migrations/040_proxy_usage.sql` — Atomic rate limit (موجود).
- `supabase/migrations/044_catchup_drift.sql` — **جديد:** Catch-up migrations للجداول/الأعمدة المفقودة.
- `supabase/migrations/045_rls_performance_fix.sql` — **جديد:** غلف `auth.uid()` في 6 سياسات.
- `supabase/migrations/046_drop_unused_indexes.sql` — **جديد:** DROP 21 فهرس غير مستخدم.
- `supabase/migrations/047_pat_expiration.sql` — **جديد:** عمود `expires_at` + default 90d.
- `supabase/migrations/048_idempotency_keys.sql` — **جديد:** جدول `idempotency_keys` + منطق dedup.

**Observability:**
- `__tests__/api/byok-proxy.test.ts` — Proxy tests: 401، 429، SSE، envelope crypto، key rotation.
- Grafana dashboards + PagerDuty alerts specs (ملفات JSON في `observability/`).

---

## 9. أسئلة مفتوحة (Open Questions) — **All Resolved**

| # | السؤال | القرار |
|---|---------|---------|
| 1 | **نموذج الملفات الافتراضي** | **محسوم:** أسماء نماذج 2026 الحالية. OpenAI: `gpt-5.4-mini`، Anthropic: `claude-sonnet-4-6`، NVIDIA: `nvidia/nemotron-3-ultra-550b-a55b` (مفضل المستخدم)، Gemini: `gemini-2.5-pro`. OpenRouter: `auto` يُستبدل بقيمة صريحة عند العرض. |
| 2 | **Rate limiting عبر `api_audit_log`** | **محسوم:** نعم — عبر جدول `proxy_usage` ذرّي، 30 طلب/دقيقة لكل مستخدم، fail-fast 429. |
| 3 | **حساب/فلترة المحتوى (Moderation)** | **محسوم:** طبقة إشراف ثنائية — Pre-output guardrails (`llm-trading-agent-security`) + Post-output DOMPurify. لا يُسقَط صامتاً. |
| 4 | **MCP كحزمة مستقلة vs Next.js route** | **محسوم:** Next.js route (`app/api/mcp/route.ts`) — وحدة نشر واحدة، وصول مباشر لـ PAT/rate-limit/audit. |
| 5 | **عدد المزودين في v1** | **محسوم:** **3 فقط** — Ollama، OpenRouter، NVIDIA NIM. الباقي عبر remote config في v2. |
| 6 | **Key Rotation** | **محسوم:** في scope — `keyId` على الغلاف، re-wrap script، UI، monitoring. |
| 7 | **Idempotency على create_transaction** | **محسوم:** إجباري — `idempotency_key` UUID، نافذة 24 ساعة، dedup جانب الخادم. |
| 8 | **Observability** | **محسوم:** في scope — metrics/alerts/dashboards للـ proxy، MCP، crypto، rate limits. |
| 9 | **DB Drift** | **محسوم:** Catch-up migrations قبل أي feature work. |
| 10 | **Flutter Cleartext** | **محسوم:** Network Security Config بأسماء مضيفين محددة. |

---

## 10. خطة التنفيذ المحدثة (Updated Execution Plan)

| Phase | التركيز | المهام الرئيسية | المدة المتوقعة |
|-------|---------|----------------|---------------|
| **0. Foundation** | DB migrations + Version sync + Typecheck fix | 4 catch-up migrations، version 3.41.0 موحد، `headroom` exclude | 2 أيام |
| **1. Security Core** | Key rotation + Moderation + Idempotency | Re-wrap script، DOMPurify integration، `idempotency_key` RPC | 1 أسبوع |
| **2. Unified Layer** | MCP Tool Sync (Shared RPCs) | RPC موحد `create_transaction`، إزالة 4 تكرارات net worth | 1 أسبوع |
| **3. Observability** | Metrics/Alerts/Dashboards | Proxy/MCP/Crypto dashboards، PagerDuty alerts | 3 أيام |
| **4. Testing** | E2E Critical Paths | BYOK chat flow، MCP auth→tool→audit، key rotation، Flutter proxy | 1 أسبوع |
| **5. Polish** | Flutter cleartext + Error rescue + Config codegen prep | Network Security Config، error rescue map، JSON schema design | 3 أيام |
| **6. Ship** | Version sync → CI → Canary → Deploy | 7 ملفات version bump، GitHub Actions Flutter job، canary 1% → 10% → 100% | 3 أيام |

**المجموع المقدر:** ~4-5 أسابيع للإصدار الإنتاجي الكامل (Feature A + B + Unified Layer).

---

## 11. قرارات gstack Decision Log (Durable Decisions)

| ID | القرار | السبب | السقف (Ceiling) | مشغل الترقية (Upgrade Trigger) |
|----|--------|-------|------------------|--------------------------------|
| D1 | Approach C: Unified Tool Layer | يمنع duplication، DRY، منصة مميزة | — | — |
| D2 | SELECTIVE EXPANSION mode | Baseline قوي، expansions مصوت عليها | — | — |
| D3 | Provider count → 3 for v1 | Test matrix 60% أقل، يغطي 90% المستخدمين | 7/10 completeness | User demand for specific provider |
| D4 | Key Rotation in scope | Security blocker — private key leak = catastrophic | 10/10 | — |
| D5 | Moderation Layer in scope | ECC Security FAIL #1 — XSS prevention | 10/10 | — |
| D6 | Observability in scope | gstack Prime Directive #5 | 10/10 | — |
| D7 | Idempotency on create_transaction | Financial correctness | 10/10 | — |
| D8 | DB Migrations in scope | Operational prerequisite | 10/10 | — |

---

## 12. مهام مؤجلة (Deferred to TODOS.md)

- [ ] Remote config table `llm_providers` (تجنب تحديث التطبيق عند تغيير النماذج)
- [ ] Per-user RSA keypairs (key rotation v2)
- [ ] Provider config codegen (JSON schema → TS/Dart)
- [ ] Voice interface (STT/TTS)
- [ ] Marketplace for community MCP tools
- [ ] 4 مزودين إضافيين (OpenAI، Anthropic، Gemini، OpenRouter explicit models)
- [ ] Web build لـ Flutter (Firebase Hosting shared مع Next.js)

---

**انتهى PRD v3.3** — جميع الأسئلة محسومة، جميع القرارات موثقة، جاهز للتنفيذ.