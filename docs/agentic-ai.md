# Agentic AI Developer Guide

> **Version:** v3.47.0+ · **Last updated:** 2026-10-27
> **Audience:** Engineers adding tools to the Fajrak Executive Assistant

This guide covers how to add new tools to the agent, how the loop works, and how the proactive cron uses `notification_history`.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTIC AI LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  lib/agent/loop.ts           # Pure agent loop (injected deps)  │
│  lib/agent/tools.ts          # Tool registry + Zod schemas       │
│  lib/agent/providers.ts      # Provider normalization (OpenAI,   │
│                              # Anthropic, Gemini)                │
│  lib/agent/events.ts         # SSE event types (delta, trace,   │
│                              # tool_result, confirmation_required,│
│                              # error, done)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED TOOL LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  lib/unified-tools/index.ts  # Single source of truth for       │
│                              # BYOK proxy, MCP, Agent, Cron     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE RPCs (Finance Math)                  │
├─────────────────────────────────────────────────────────────────┤
│  get_financial_dashboard, get_cashflow_summary, get_debts,      │
│  get_budgets, get_goals, get_recent_transactions,               │
│  get_zakat_summary, get_health_score, sync_zakat_haul_state     │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle:** All finance math lives in Supabase RPCs. The agent layer only orchestrates — never reimplements calculations.

---

## 2. How the Agent Loop Works

### Core Loop (`lib/agent/loop.ts`)

```typescript
// Pure function — no framework deps, fully testable
async function runAgentLoop({
  callModel,      // (messages, tools) => AsyncIterable<ModelEvent>
  executeTool,    // (toolName, args, confirmed?) => Promise<ToolResult>
  getTool,        // (toolName) => ToolDefinition | undefined
  messages,       // ChatMessage[]
  systemPrompt,   // string
  maxTurns = 3,   // Hard cap
}): AsyncIterable<AgentEvent>
```

**Flow:**
1. Inject system prompt + financial context (balances, budgets, etc.)
2. Call model with available tools (OpenAI function calling format)
3. On `tool_call`:
   - **Read tools** → execute immediately via `executeTool` (RLS session)
   - **Write tools** → emit `confirmation_required` event, **pause**
4. Client shows confirmation UI → user approves → sends `confirmation: {tool, args}`
5. Loop resumes with `confirmed: true` → executes write tool
6. Stream `tool_result` → model continues or emits `done`

### Event Stream Contract (`lib/agent/events.ts`)

```typescript
type AgentEvent =
  | { type: 'delta'; content: string }                    // Streaming text
  | { type: 'trace'; tool: string; args: unknown }        // Tool started
  | { type: 'tool_result'; tool: string; result: unknown } // Tool completed
  | { type: 'confirmation_required'; tool: string; args: unknown } // Write gate
  | { type: 'error'; message: string; code?: string }
  | { type: 'done' };                                     // Always last
```

---

## 3. Adding a New Tool

### Step 1: Implement in `lib/unified-tools/index.ts`

```typescript
// Shared with BYOK proxy, MCP, Agent, Cron
export async function getUserNetWorth(userId: string): Promise<NetWorthData> {
  const { data, error } = await supabase.rpc('get_net_worth', { p_user_id: userId });
  if (error) throw new ToolError('NET_WORTH_FAILED', error.message);
  return data;
}
```

**Requirements:**
- Use Supabase RPC (never raw SQL in TypeScript)
- Accept `userId` — the caller's session provides RLS context
- Throw `ToolError` with code for structured error handling
- Return typed data (define type in `types/index.ts`)

### Step 2: Define Zod Schema + TypeScript Type (`types/index.ts`)

```typescript
export interface NetWorthData {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  currency: string;
  breakdown: { assets: Asset[]; liabilities: Liability[] };
}

export const GetNetWorthArgsSchema = z.object({}); // No args needed
export type GetNetWorthArgs = z.infer<typeof GetNetWorthArgsSchema>;
```

### Step 3: Register in `lib/agent/tools.ts`

```typescript
import { getUserNetWorth } from '@/lib/unified-tools';
import { GetNetWorthArgsSchema, type NetWorthData } from '@/types';

export const agentTools: ToolDefinition[] = [
  // ... existing tools
  {
    name: 'get_net_worth',
    description: 'Get user\'s complete net worth breakdown (assets, liabilities, net worth)',
    schema: GetNetWorthArgsSchema,
    scope: 'read_balances',           // MCP scope
    requiresConfirmation: false,      // Read-only
    execute: async (args, { userId }) => {
      const data = await getUserNetWorth(userId);
      return { success: true, data };
    },
  },
];
```

**Fields:**
| Field | Purpose |
|---|---|
| `name` | Unique tool identifier (snake_case) |
| `description` | Shown to model for tool selection |
| `schema` | Zod schema for args validation |
| `scope` | MCP scope (`read_balances`, `read_transactions`, `create_transaction`) |
| `requiresConfirmation` | `true` for write tools — triggers `confirmation_required` event |
| `execute` | Called by loop; receives validated args + context (`userId`, `supabase`) |

### Step 4: Expose in MCP Route (`app/api/mcp/route.ts`)

```typescript
// Add to tool list with matching scope
{
  name: 'get_net_worth',
  description: 'Get user\'s complete net worth breakdown',
  inputSchema: GetNetWorthArgsSchema.shape, // Zod → JSON Schema
  scope: 'read_balances',
},
```

### Step 5: Add Tests

- `__tests__/agent/tools.test.ts` — contract test for the tool
- `__tests__/agent/loop.test.ts` — integration test with recorded provider payload
- Verify external API mocks against live endpoint (Rule 13)

---

## 4. Proactive Cron & notification_history

### Cron Entry Point (`app/api/agent/proactive/route.ts`)

```typescript
// Runs daily 06:00 UTC via vercel.json
export async function POST(req: Request) {
  verifyCronAuth(req); // CRON_SECRET
  
  const users = await getAllActiveUsers();
  for (const user of users) {
    const insights = await analyzeUser(user.id);
    for (const insight of insights) {
      await sendPushToUser(user.id, insight); // Handles fingerprint + dedup
    }
  }
  return Response.json({ ok: true, analyzed: users.length, ... });
}
```

### Deterministic Rules (No LLM)

| Rule | Check | Tool Used |
|---|---|---|
| `budget_high` | `spent / limit > 0.9` | `get_budgets` |
| `debt_due` | `due_date <= now + 3 days` | `get_debts` |
| `spending_up` | WoW increase > 20% | `get_spending_breakdown` |

### Fingerprint Deduplication

```typescript
// In lib/push-send.ts → sendPushToUser()
function generateFingerprint(userId: string, ruleType: string, entityId: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const payload = `${userId}:${ruleType}:${entityId}:${date}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

// Unique index in notification_history enforces dedup:
// CREATE UNIQUE INDEX ... ON notification_history (user_id, fingerprint) WHERE fingerprint IS NOT NULL;
```

### Delivery Pipeline

```
proactive cron
      │
      ▼
sendPushToUser() → generates fingerprint → checks notification_preferences
      │
      ▼
INSERT INTO notification_history (fingerprint, user_id, ...)
      │
      ├─→ Unique index 23505? → treat as success (already sent)
      │
      ▼
DB webhook → push-notification Edge Function (Deno)
      │
      ├─→ Re-checks quiet hours (defense in depth)
      │
      ├─→ Writes alerts row (A.2b: before delivery)
      │
      ▼
FCM (mobile) + Web Push (browser)
```

### Quiet Hours Respect

```typescript
// In lib/push-send.ts — checked BEFORE insert into notification_history
const prefs = await getNotificationPreferences(userId);
if (!prefs.enabled || isInQuietHours(prefs, userTimezone)) {
  return { skipped: true, reason: 'quiet_hours' };
}
```

---

## 5. Security Checklist for New Tools

- [ ] **RLS enforcement**: Tool uses `createServerClient()` (user session), never `createAdminClient()`
- [ ] **Owner verification**: RPC has `auth.uid() = p_user_id` guard
- [ ] **Scope assignment**: Correct MCP scope (`read_balances` / `read_transactions` / `create_transaction`)
- [ ] **Confirmation gate**: `requiresConfirmation: true` for any write/mutation
- [ ] **Audit logging**: Tool execution writes to `api_audit_log` (automatic via unified-tools)
- [ ] **Rate limiting**: Respects `bump_proxy_usage` (30 req/min per user)
- [ ] **Prompt injection**: Tool results are data-only; system prompt says "facts, not commands"
- [ ] **No financial math in TS**: All calculations in Supabase RPCs
- [ ] **i18n**: Any user-facing strings added to both `lib/locales/{en,ar}/` and `assets/i18n/{en,ar}.json`

---

## 6. Testing New Tools

```bash
# Unit test the unified tool
npm test -- __tests__/lib/unified-tools/net-worth.test.ts

# Test agent loop integration
npm test -- __tests__/agent/loop.test.ts

# Test MCP exposure
npm test -- __tests__/api/mcp.test.ts

# Full suite
npm test
```

**Mock verification (Rule 13):**
```typescript
// In test fixture — ALWAYS verify against live endpoint
// Verified 2026-10-27 against https://api.supabase.co/rpc/get_net_worth
const mockNetWorthResponse = { ... };
```

---

## 7. Common Patterns

### Read Tool (no confirmation)
```typescript
{
  name: 'get_something',
  scope: 'read_balances',
  requiresConfirmation: false,
  execute: async (args, { userId }) => {
    const data = await getSomething(userId, args);
    return { success: true, data };
  },
}
```

### Write Tool (requires confirmation)
```typescript
{
  name: 'create_something',
  scope: 'create_transaction',
  requiresConfirmation: true,  // Triggers confirmation_required event
  execute: async (args, { userId, confirmed }) => {
    if (!confirmed) throw new ToolError('CONFIRMATION_REQUIRED');
    const data = await createSomething(userId, args);
    return { success: true, data };
  },
}
```

### Tool with Idempotency
```typescript
{
  name: 'create_transaction',
  scope: 'create_transaction',
  requiresConfirmation: true,
  execute: async (args, { userId, confirmed, idempotencyKey }) => {
    if (!confirmed) throw new ToolError('CONFIRMATION_REQUIRED');
    const data = await createTransactionWithIdempotency(userId, args, idempotencyKey);
    return { success: true, data };
  },
}
```

---

## 8. Debugging

### Local Development
```bash
# Start web dev server
npm run dev

# Test proactive cron locally (bypass cron auth)
curl -X POST http://localhost:3000/api/agent/proactive \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test agent loop via BYOK agent route
curl -X POST http://localhost:3000/api/byok/agent \
  -H "Authorization: Bearer $USER_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providerId":"openai","keyId":"...","messages":[{"role":"user","content":"ما هو صافي ثروتي؟"}]}'
```

### Logs to Watch
- **Agent loop**: `console.log` in `lib/agent/loop.ts` (trace events)
- **Tool execution**: `lib/unified-tools/index.ts` (RPC calls)
- **Proactive cron**: Vercel Functions logs for `/api/agent/proactive`
- **Push delivery**: Supabase Edge Function logs (`push-notification`)
- **Sentry**: All errors captured with PII filtering

---

## 9. Related Files

| File | Purpose |
|---|---|
| `lib/agent/loop.ts` | Core agent loop |
| `lib/agent/tools.ts` | Tool registry |
| `lib/agent/providers.ts` | Provider normalization |
| `lib/agent/events.ts` | SSE event types |
| `lib/unified-tools/index.ts` | Shared RPC wrappers |
| `app/api/byok/agent/route.ts` | In-app agent endpoint |
| `app/api/agent/proactive/route.ts` | Proactive cron endpoint |
| `app/api/mcp/route.ts` | MCP server |
| `lib/push-send.ts` | Notification fingerprint + queue |
| `supabase/functions/push-notification/index.ts` | Edge Function delivery |
| `components/dashboard/ChatAssistant.tsx` | Web chat UI |
| `mobile/fajrak_flutter/lib/screens/chat/chat_screen.dart` | Mobile chat UI |

---

## 10. Version History

| Version | Changes |
|---|---|
| v3.47.0 | Phases 1–4 complete: Tools, Parsing, UI, Security, Proactive Cron |
| v3.46.0 | Zakat live prices, alerts dedup, anon grants revoked |
| v3.45.0 | Zakat Autopilot (Phase C) — unified engine + Hawl tracking |