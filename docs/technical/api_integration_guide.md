# Fajrak API — AI Assistant Integration Guide

Connect AI assistants (ChatGPT, Claude, Zapier, custom bots) to Fajrak for conversational finance tracking.

## Overview

Fajrak exposes a webhook API that allows external AI assistants to **create** financial transactions and **read** transaction/balance data on behalf of the user. The AI translates natural language into structured JSON and POSTs/GETs the webhook.

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

Each API key is assigned one or more scopes at creation:

| Scope | HTTP Method | Description |
|-------|------------|-------------|
| `create_transaction` | POST | Create new transactions |
| `read_transactions` | GET | Fetch transaction history with filters |
| `read_balances` | GET | Fetch account balances via RPC |

Keys created before Phase 2 have only `create_transaction`. To enable reads, revoke the old key and create a new one (which gets all three scopes by default).

## Setup

### 1. Generate an API Key

1. Open Fajrak → **Settings** → **🔑 API Keys**
2. Enter a name (e.g., "ChatGPT", "My Bot")
3. Click **Generate New Key**
4. **Copy the key immediately** — it won't be shown again

The key format is: `fjk_live_<96-hex-chars>`

### 2. Configure Your AI Assistant

Add the following to your AI's system prompt or tool definition:

```
You have access to the Fajrak finance API. When the user mentions
recording a transaction, use the webhook to create it.

Endpoint: POST https://fajrak.com/api/webhook/transaction
Headers:
  Authorization: Bearer fjk_live_YOUR_KEY_HERE
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
| `عملحر` | Freelance |
| `استثمار` | Investment |
| `مكافأة` | Bonus |
| `أخرى` | Other |

## Example Requests

### Record an expense

```bash
curl -X POST https://fajrak.com/api/webhook/transaction \
  -H "Authorization: Bearer fjk_live_abc123..." \
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

### Record income

```bash
curl -X POST https://fajrak.com/api/webhook/transaction \
  -H "Authorization: Bearer fjk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "amount": 1500,
    "category": "راتب",
    "description": "راتب أغسطس",
    "transaction_date": "2026-08-01"
  }'
```

## Read Operations (GET)

### Fetch recent transactions

```bash
curl "https://fajrak.com/api/webhook/transaction?action=transactions&limit=10" \
  -H "Authorization: Bearer fjk_live_abc123..."
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

### Fetch account balances

```bash
curl "https://fajrak.com/api/webhook/transaction?action=balances" \
  -H "Authorization: Bearer fjk_live_abc123..."
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

## Error Responses

| Status | Meaning | How to Fix |
|--------|---------|-----------|
| `400` | Validation error | Check body fields or query params (see schema above) |
| `401` | Invalid/revoked key | Generate a new key in Settings |
| `403` | Key lacks scope | Ensure key has the required scope (`create_transaction`, `read_transactions`, or `read_balances`) |
| `413` | Payload too large | Keep POST request body under 1KB |
| `429` | Rate limited | Wait and retry (default: 10 req/min per key) |

## Rate Limits

- Default: **10 requests per minute** per API key
- Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- Max **5 active keys** per user

## Security

- API keys are **hashed with SHA-256** — never stored in plaintext
- Keys are shown **only once** at creation
- Each key is independent from your login credentials
- Revoke any key instantly from Settings → API Keys
- All API calls are **audit logged** with IP and user agent
- **Scoped access**: each key can be limited to specific operations (create, read transactions, read balances)
- READ endpoints return only the authenticated user's own data

## ChatGPT Custom GPT Setup

1. Go to ChatGPT → Create a GPT
2. In Instructions, paste:
   ```
   When the user wants to log a financial transaction, use the
   Fajrak webhook API to create it. Always confirm the details
   with the user before sending. Use the user's current date for
   transaction_date unless they specify otherwise.
   ```
3. Add an Action (OpenAPI schema):
   ```json
   {
     "openapi": "3.1.0",
     "info": { "title": "Fajrak Finance", "version": "1.1" },
     "paths": {
       "/api/webhook/transaction": {
         "post": {
           "operationId": "createTransaction",
           "description": "Create a financial transaction in Fajrak",
           "parameters": [{
             "name": "Authorization",
             "in": "header",
             "required": true,
             "schema": { "type": "string" }
           }],
           "requestBody": {
             "required": true,
             "content": {
               "application/json": {
                 "schema": {
                   "type": "object",
                   "required": ["type", "amount", "category", "transaction_date"],
                   "properties": {
                     "type": { "type": "string", "enum": ["income", "expense"] },
                     "amount": { "type": "number", "minimum": 0.01 },
                     "category": { "type": "string" },
                     "description": { "type": "string", "maxLength": 500 },
                     "transaction_date": { "type": "string", "format": "date" }
                   }
                 }
               }
             }
           }
         },
         "get": {
           "operationId": "readTransactions",
           "description": "Read transactions or account balances from Fajrak",
           "parameters": [
             { "name": "Authorization", "in": "header", "required": true, "schema": { "type": "string" } },
             { "name": "action", "in": "query", "schema": { "type": "string", "enum": ["transactions", "balances"] } },
             { "name": "limit", "in": "query", "schema": { "type": "integer", "maximum": 50 } },
             { "name": "type", "in": "query", "schema": { "type": "string", "enum": ["income", "expense"] } },
             { "name": "category", "in": "query", "schema": { "type": "string" } },
             { "name": "from", "in": "query", "schema": { "type": "string", "format": "date" } },
             { "name": "to", "in": "query", "schema": { "type": "string", "format": "date" } }
           ]
         }
       }
     }
   }
   ```
4. Set the Authentication to **API Key** → Header → `Authorization` → Bearer → your `fjk_live_...` key

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Key may be revoked. Generate a new one in Settings. |
| Category rejected | Use exact Arabic category names from the table above. |
| Transaction not showing | Check the Fajrak app — triggers may have auto-assigned an account. |
| Rate limited | Reduce request frequency (default: 10/min). |
