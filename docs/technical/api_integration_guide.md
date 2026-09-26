# Fajrak API — AI Assistant Integration Guide

Connect AI assistants (ChatGPT, Claude, Zapier, custom bots) to Fajrak for conversational finance tracking.

## Overview

Fajrak exposes **two API transports** that allow external AI assistants to **create** financial transactions and **read** transaction/balance data on behalf of the user:

1. **REST Webhook** (`/api/webhook/transaction`) — Simple HTTP integration
2. **MCP Server** (`/api/mcp`) — Model Context Protocol over Streamable HTTP for native LLM function-calling

The AI translates natural language into structured JSON and calls the appropriate endpoint.

```
User: "سجل 15 دينار بنزين في محطة الوقود"
  ↓
AI Assistant parses → { type: "expense", amount: 15, category: "مواصلات", ... }
  ↓
POST /api/webhook/transaction → Transaction created in Fajrak

User: "كم صرفت هالشهر؟"
  ↓
GET /api/webhook/transaction?action=transactions&from=2026-08-01 → Returns transactions
```

## API Scopes

Each API key (`fjk_live_...`) is assigned one or more scopes at creation:

| Scope | HTTP Method | Description |
|-------|------------|-------------|
| `create_transaction` | POST | Create new transactions |
| `read_transactions` | GET | Fetch transaction history with filters |
| `read_balances` | GET | Fetch account balances via RPC |

Keys created before v3.39 had only `create_transaction`. To enable reads, revoke the old key and create a new one (which gets all three scopes by default).

---

## 1. REST Webhook API (`/api/webhook/transaction`)

### Setup

#### 1. Generate an API Key

1. Open Fajrak → **Settings** → **🔑 API Keys**
2. Enter a name (e.g., "ChatGPT", "My Bot")
3. Click **Generate New Key**
4. **Copy the key immediately** — it won't be shown again

The key format is: `fjk_live_<96-hex-chars>`

#### 2. Configure Your AI Assistant

Add the following to your AI's system prompt or tool definition:

```
You have access to the Fajrak finance API. When the user mentions
recording a transaction, use the webhook to create it.

Endpoint: POST https://fajrak.com/api/webhook/transaction
Headers:
  Authorization: Bearer fjk_li...HERE
  Content-Type: application/json

Body schema:
{
  "type": "income" | "expense",
  "amount": number (required, must be positive),
  "category": string (required, must be from the valid list below),
  "description": string (optional, max 500 chars),
  "transaction_date": "YYYY-MM-DD" (required),
  "account_id": "uuid" (optional, auto-assigned if omitted)
}
```

### 3. Valid Categories

**Expense categories:**

| Category | Translation |
|----------|------------|
| `إيجار / قسط` | Rent / Installment |
| `مواصلات` | Transportation |
| `طعام وشراب` | Food & Drink |
| `فواتير` | Bills |
| `صحة` | Health |
| `تعليم` | Education |
| `ترفيه` | Entertainment |
| `صلة رحم` | Family Relations |
| `ملابس` | Clothing |
| `أخرى` | Other |

**Income categories:**

| Category | Translation |
|----------|------------|
| `راتب` | Salary |
| `عمل حر` | Freelance |
| `استثمار` | Investment |
| `مكافأة` | Bonus |
| `أخرى` | Other |

### Example Requests

#### Record an expense

```bash
curl -X POST https://fajrak.com/api/webhook/transaction \
  -H "Authorization: Bearer fjk_li...3..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": 15,
    "category": "مواصلات",
    "description": "بنزين محطة الوقود",
    "transaction_date": "2026-08-26"
  }'
```

**Response (200):**
```json
{
  "ok": true,
  "message": "Transaction created successfully",
  "transaction": {
    "id": "uuid...",
    "type": "expense",
    "amount": 15,
    "category": "مواصلات",
    "transaction_date": "2026-08-26",
    "created_at": "2026-08-26T..."
  }
}
```

#### Record income

```bash
curl -X POST https://fajrak.com/api/webhook/transaction \
  -H "Authorization: Bearer fjk_li...3..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "amount": 1500,
    "category": "راتب",
    "description": "راتب أغسطس",
    "transaction_date": "2026-08-01"
  }'
```

---

### Read Operations (GET)

#### Fetch recent transactions

```bash
curl "https://fajrak.com/api/webhook/transaction?action=transactions&limit=10" \
  -H "Authorization: Bearer fjk_li...3..."
```

**Query parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `action` | `transactions` | `transactions` or `balances` |
| `limit` | `20` | Max 50 |
| `offset` | `0` | Pagination offset |
| `type` | — | Filter: `income` or `expense` |
| `category` | — | Exact category name |
| `from` | — | Start date `YYYY-MM-DD` |
| `to` | — | End date `YYYY-MM-DD` |

**Response (200):**
```json
{
  "ok": true,
  "transactions": [
    {
      "id": "uuid...",
      "type": "expense",
      "amount": 15,
      "category": "مواصلات",
      "description": "بنزين",
      "transaction_date": "2026-08-26",
      "account_id": "uuid...",
      "created_at": "2026-08-26T..."
    }
  ],
  "count": 10
}
```

#### Fetch account balances

```bash
curl "https://fajrak.com/api/webhook/transaction?action=balances" \
  -H "Authorization: Bearer fjk_li...3..."
```

**Response (200):**
```json
{
  "ok": true,
  "accounts": [
    { "account_name": "البنك الأهلي", "current_balance": 1250.50 },
    { "account_name": "المحفظة", "current_balance": 85.00 }
  ]
}
```

---

### Error Responses

| Status | Meaning | How to Fix |
|--------|---------|-----------|
| `400` | Validation error | Check body fields or query params |
| `401` | Invalid/revoked key | Generate a new key in Settings |
| `403` | Key lacks scope | Ensure key has required scope |
| `413` | Payload too large | Keep POST request body under 1KB |
| `429` | Rate limited | Wait and retry (default: 10 req/min per key) |

### Rate Limits

- Default: **10 requests per minute** per API key
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Max **5 active keys** per user
- ⚠️ In-memory limiter (single-instance). On multi-region Vercel, limit is per-region instance.

### Security

- API keys **hashed with SHA-256** — never stored in plaintext
- Keys shown **only once** at creation
- Each key independent from login credentials
- Revoke instantly from Settings → API Keys
- All calls **audit logged** with IP and user agent
- **Scoped access**: each key limited to specific operations
- READ endpoints return only authenticated user's data

---

## 2. MCP Server (`/api/mcp`)

For LLMs that support MCP function-calling (Claude Desktop, Cursor, etc.), Fajrak exposes an MCP server over **Streamable HTTP** — no webhook wiring required.

### Endpoint

```
POST https://fajrak.com/api/mcp
```

**Auth:** Same `Authorization: Bearer fjk_live_...` header.

### Available Tools

| Tool | Scope Required | Description |
|------|---------------|-------------|
| `get_balances` | `read_balances` | Returns all account names and current balances |
| `get_cashflow_summary` | `read_transactions` | Monthly income vs. expenses summary |
| `create_transaction` | `create_transaction` | Record a new income or expense |

### Example — List Tools

```bash
curl -X POST https://fajrak.com/api/mcp \
  -H "Authorization: Bearer fjk_li...3..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Example — Get Balances

```bash
curl -X POST https://fajrak.com/api/mcp \
  -H "Authorization: Bearer fjk_li...3..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_balances"},"id":2}'
```

### Example — Create Transaction with Idempotency

```bash
curl -X POST https://fajrak.com/api/mcp \
  -H "Authorization: Bearer fjk_li...3..." \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"create_transaction",
      "arguments":{
        "type":"expense",
        "amount":15,
        "category":"مواصلات",
        "transaction_date":"2026-08-26",
        "idempotency_key":"unique-key-123"
      }
    },
    "id":3
  }'
```

**Idempotency:** The `idempotency_key` (UUID) prevents double-charge on retries. Duplicate requests with the same key return the original transaction.

### MCP Authentication & Scopes

- **PAT reuse:** Uses existing `fjk_live_...` keys (SHA-256 hashed, flat scopes)
- **Dual scope gate:** HTTP-level (403 before tool) + tool-callback (defense in depth)
- **Per-key rate limit:** 10 req/min (configurable per key)
- **Audit logging:** Every tool call logged to `api_audit_log`

### Transport Choice

| Use Case | Transport |
|----------|-----------|
| Simple HTTP, Zapier, n8n, custom bots | **Webhook** (`/api/webhook/transaction`) |
| Native MCP support (Claude, Cursor, etc.) | **MCP Server** (`/api/mcp`) |

---

## 3. BYOK Chat Assistant (Feature A)

Fajrak includes a built-in **BYOK (Bring Your Own Key) Chat Assistant** for in-app conversational finance.

### Features

- **3 Providers:** Ollama (local, clientDirect), OpenRouter, NVIDIA NIM (via proxy)
- **SSE Streaming** — real-time token streaming
- **Key Rotation UI** — Settings → BYOK Keys → Rotate Key
- **Vault-aware filtering** — Only shows keys with ciphertext on this device
- **Moderation Layer** — Pre-output guardrails + DOMPurify post-output sanitization

### Supported Providers (v1)

| Provider | Kind | Default Model |
|----------|------|---------------|
| Ollama | clientDirect | llama3.1 |
| OpenRouter | proxy | auto |
| NVIDIA NIM | proxy | nvidia/nemotron-3-ultra-550b-a55b |

### Client Configuration

Fetch runtime config:

```bash
curl https://fajrak.com/api/byok/config
```

**Response:**
```json
{
  "providers": [...],
  "keyId": "kek-1",
  "publicKey": "-----BEGIN PUBLIC KEY-----..."
}
```

---

## ChatGPT Custom GPT Setup

1. Go to ChatGPT → Create a GPT
2. In Instructions, paste:
   ```
   When the user wants to log a financial transaction, use the
   Fajrak webhook API to create it. Always confirm the details
   with the user before sending. Use the user's current date for
   transaction_date unless they specify otherwise.
   ```
3. Add an Action (OpenAPI schema) — see [original guide](#chatgpt-custom-gpt-setup)
4. Set Authentication: **API Key** → Header → `Authorization` → Bearer → your `fjk_live_...` key

---

## Rate Limits Summary

| Endpoint | Limit | Window |
|----------|-------|--------|
| Webhook API | 10 req/min | per key |
| MCP Server | 10 req/min | per key (configurable) |
| BYOK Proxy | 30 req/min | per user (atomic counter) |

---

## Error Responses

| Status | Meaning | How to Fix |
|--------|---------|-----------|
| `400` | Validation error | Check body fields or query params |
| `401` | Invalid/revoked key | Generate a new key in Settings |
| `403` | Key lacks scope | Ensure key has required scope |
| `409` | Idempotency key processing | Wait and retry |
| `410` | Model/endpoint gone | Choose another model |
| `429` | Rate limited | Wait and retry |
| `502` | Upstream error | Retry or contact support |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Key may be revoked. Generate a new one in Settings. |
| Category rejected | Use exact Arabic category names from the table above. |
| Transaction not showing | Check the Fajrak app — triggers may have auto-assigned an account. |
| Rate limited | Reduce request frequency (default: 10/min). |
| Idempotency duplicate | Expected — returns existing transaction with `idempotent_replay: true` |

---

## Version

Current API version: **v3.42.0** (September 2026)

See [Changelog](https://github.com/Abdoocoder/financetracker/blob/main/README.md#-changelog) for full history.