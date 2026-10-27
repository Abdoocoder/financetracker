# Domain: BYOK AI + MCP Server

> Layer 2 deep dive. Entry points: `AGENTS.md` → `PROJECT_CONTEXT.md` → this file.
> Last verified 2026-10-27.

## 1. What Feature A (BYOK) and Feature B (MCP) are

- **BYOK** — users paste their own LLM API key; the key is encrypted **on the device** before
  storage, and chat requests are forwarded through a thin server proxy to the provider. Privacy
  claim: Fajrak never holds a usable key or conversation content.
- **MCP server** — the same financial data exposed as 3 tools over Model Context Protocol
  (Streamable HTTP), authenticated with Personal Access Tokens (PATs), so external AI agents
  (Claude, etc.) can read balances and create transactions on the user's behalf.
- **Proactive Agent** — daily cron (`/api/agent/proactive`) analyzes budgets, debts, and spending trends; generates deduplicated insights via `notification_history` fingerprints; pushes alerts via FCM/Web Push.
- All three share one server-side layer: `lib/unified-tools/index.ts` (balances, cashflow, create
  transaction, idempotency, audit logging, category validation) + `lib/agent/tools.ts` (agent-specific tools). **Business logic for AI goes
  there, once** — never inside the proxy, MCP route, or proactive cron.

## 2. Envelope encryption (device side)

- `lib/byok/vault.ts` (web) / `lib/services/byok/vault.dart` (mobile): **AES-256-GCM** with a
  key derived via **PBKDF2 (100k iterations)** from the user's app password/session material.
- Envelope format (`lib/byok/envelope.ts`): `encrypted_key + salt + iv + version` — versioned so
  `lib/byok/key-rotation.ts` can re-encrypt on password change.
- Storage: `user_byok_keys` table (RLS-protected, encrypted blob only).
- Hard rules: keys are **never logged, never sent in plaintext, never included in Sentry
  events** (rule 3 + rule 12). Ollama runs `clientDirect` from the user's own machine and never
  reaches the proxy.

## 3. Providers (6, mirrored on both clients)

| id | Endpoint style |
|---|---|
| `openai` | `/v1/chat/completions` |
| `anthropic` | `/v1/messages` (different auth + body shape) |
| `nvidia-nim` | integrate.api.nvidia.com `/v1/chat/completions` |
| `openrouter` | openrouter.ai `/v1/chat/completions` |
| `gemini` | Google generativelanguage endpoint |
| `ollama` | `http://localhost:11434` — clientDirect, local-only |

Config lives in `lib/byok/providers.ts` (web) and `lib/services/byok/providers.dart` (mobile) —
**keep these two in sync**; the list is an allowlist and the SSRF boundary (see §4).
Older docs say "7 providers"; the code defines **6** — trust the code and fix the doc.

## 4. The proxy (`app/api/byok/proxy/route.ts`)

- Thin pass-through: it does **not parse or store** the chat body; it decrypts the stored
  envelope server-side only to forward the request to the provider's allowlisted `baseUrl`.
- **SSRF safety**: `baseUrl` is never derived from client input — providers and their URLs are
  hardcoded in the allowlist config.
- Rate limit: **30 req/min per user** enforced via the `bump_proxy_usage` RPC +
  `proxy_usage` table; usage and failures land in `api_audit_log`.
- Streaming: SSE parsed by `lib/byok/chat.ts`; a stalled stream is a monitored failure mode
  (runbook `byok-proxy-sse-stalled.md`).
- System prompt with user financial context is injected server-side (`lib/byok/system-prompt.ts`).

### Agent route (`/api/byok/agent` — Phase 2)

Same auth, envelope, KEK and rate-limit path as the proxy, but the server **owns the
loop** instead of relaying bytes:

- Input: `{providerId, keyId, env, payload, model, systemPrompt?, messages, confirmation?}`;
  output: normalized SSE (`delta`, `trace`, `tool_result`, `confirmation_required`,
  `error`, `done` — always last). Contract: `lib/agent/events.ts`.
- `lib/agent/loop.ts` is pure/testable (injected `callModel` / `executeTool` / `getTool`),
  bounded to **3 model turns**; `lib/agent/providers.ts` normalizes OpenAI-compatible,
  Anthropic and Gemini request bodies + streamed/JSON tool calls.
- **Read tools** (`get_financial_snapshot`, `get_spending_breakdown`) execute as the
  signed-in user through the RLS session client — never service-role.
- **Write tools** (`create_transaction`) never execute on the model's say-so: the loop
  returns `confirmation_required` with the exact args, and only a client-sent
  `confirmation: {tool, args}` (after explicit user approval) executes it with
  `confirmed: true`. `create_transaction` also enforces `confirmed` itself.
- Client-direct providers (Ollama) are rejected here and keep the direct path; the proxy
  route is unchanged for plain chat.

## 5. MCP server (`app/api/mcp/route.ts`)

- Transport: Streamable HTTP (MCP SDK), methods GET/POST/DELETE/OPTIONS.
- **Auth**: PATs (`fjk_live_…` prefix) created at `/api/api-keys/create`, stored in the
  `api_keys` table (name, key_prefix, scopes, `rate_limit_per_min`, `expires_at`,
  `is_active`, `last_used_at`). Verification: `lib/api-keys.ts` → `verifyApiKey`.
- **Scopes**: `read_balances`, `read_transactions`, `create_transaction`. Scope enforcement is
  an **HTTP-level 403 gate before tool execution** (PRD §5.4) — a scoped token cannot even
  reach a tool it lacks.
- **Tools**: `get_balances`, `get_cashflow_summary`, `create_transaction` (with idempotency keys
  via the `idempotency_keys` table so retries never double-post).
- Every tool call is written to `api_audit_log`.
- Adding a tool: implement in `lib/unified-tools/index.ts` first (shared with BYOK), then expose
  in the MCP route with its scope. Cover with tests in `__tests__/`.

## 6. Mobile parity

- `lib/services/llm_service.dart` + `lib/services/byok/` (service, chat, envelope, providers,
  vault, prompt_rules) mirror the web stack.
- Chat UI: `screens/chat/chat_screen.dart` (provider/model selector, streaming bubbles);
  web counterpart `app/(dashboard)/dashboard/chat/` + `components/dashboard/ChatAssistant`.
- The mobile proxy path uses the same `/api/byok/proxy` route — there is no second backend.
- Proxy-provider chat goes through `/api/byok/agent` on both clients (`ByokService.chatAgent`);
  `services/byok/chat.dart` mirrors the web SSE event contract (`AgentEvent`, `readAgentStream`),
  and `chat_screen.dart` renders the tool trace + confirmation card. Ollama stays on the
  client-direct path.

## 7. Known wording/compliance gap

Store copy says "keys never sent to our servers," but the architecture POSTs an **RSA-OAEP
envelope** to the proxy. Technically wrapped, not plaintext — but the copy needs legal review
(open question in `HANDOFF_REPORT.md` §12). Do not strengthen the marketing claim in code
comments or UI strings without the owner's sign-off.

## 8. BYOK Validation Flow (`/api/byok/validate`)

**New in v3.47.0** — Instant key validation before saving.

- **Endpoint**: `POST /api/byok/validate`
- **Auth**: Supabase session (Bearer token)
- **Input**: `{ providerId, apiKey, baseUrl? }`
- **Flow**:
  1. Client sends plaintext key (never stored) to validation endpoint
  2. Server makes a minimal test request to the provider's `/models` or `/chat/completions` endpoint
  3. On success: returns `{ valid: true, model: string, provider: string }` — key can be encrypted and saved
  4. On failure: returns `{ valid: false, error: string, code: 'INVALID_KEY' | 'RATE_LIMITED' | 'NETWORK_ERROR' }`
- **Security**: Key is used in-memory only for the test request; never logged, never persisted. Envelope encryption happens *after* validation passes, in the client.
- **Rate limit**: Shares the `bump_proxy_usage` counter (30 req/min per user).

## 9. Smart BYOK UX — Deep Links & Free Model Badges

**New in v3.47.0** — Improved provider onboarding in Settings.

- **Deep Links**: Each provider in the BYOK settings screen now shows a "Get API Key" button linking directly to the provider's console:
  - OpenAI → `https://platform.openai.com/api-keys`
  - Anthropic → `https://console.anthropic.com/settings/keys`
  - Google AI Studio → `https://aistudio.google.com/apikey`
  - OpenRouter → `https://openrouter.ai/settings/keys`
  - NVIDIA NIM → `https://build.nvidia.com/explore/discover`
  - Ollama → `https://ollama.com/download` (local, no key needed)
- **Free Model Badges**: Providers offering free tiers display a "Free tier available" badge in the provider selector:
  - OpenRouter (free models via `openrouter/auto`)
  - Google Gemini (free tier: 15 RPM, 1M tokens/day)
  - Ollama (completely free, runs locally)
  - NVIDIA NIM (free tier for development)
- **Implementation**: `lib/byok/providers.ts` extended with `consoleUrl` and `hasFreeTier` fields; mobile mirrors in `lib/services/byok/providers.dart`. UI reads these fields to render badges and links.

## 10. Proactive Agent (`/api/agent/proactive`)

**New in v3.47.0 (Agentic AI Phase 4)** — Daily automated financial insights.

- **Endpoint**: `POST /api/agent/proactive` (Cron only — guarded by `verifyCronAuth` with `CRON_SECRET`)
- **Schedule**: Daily 06:00 UTC via `vercel.json`
- **Analysis Rules** (deterministic, no LLM):
  1. **Budget > 90%**: Any budget category where `spent / limit > 0.9`
  2. **Debt Due**: Debt payments due within 3 days (`due_date <= now + 3 days`)
  3. **Spending Up**: Week-over-week spending increase > 20% in any category
- **Deduplication**: SHA-256 fingerprint = `hash(user_id + rule_type + entity_id + date)`. Checks `notification_history` for existing fingerprint before inserting.
- **Delivery**: Inserts into `notification_history` (triggers push-notification Edge Function via DB webhook). Writes `alerts` row before quiet-hours check (A.2b pattern from push pipeline).
- **Quiet Hours**: Respects `notification_preferences.quiet_hours_start/end` and `profiles.timezone` (default `Asia/Amman`).
- **Response**: `{ ok: true, analyzed: number, insights_generated: number, pushed: number }`
- **Shared Tool Layer**: Uses `lib/agent/tools.ts` read tools (`get_budgets`, `get_debts`, `get_spending_breakdown`) — same tools as the in-app agent.

## 11. Checklist before touching this domain

- [ ] New provider added to **both** `providers.ts` and `providers.dart`, with a fixed `baseUrl`
      (never client-controlled) — SSRF boundary intact.
- [ ] No key material in logs, errors, or Sentry events (test it).
- [ ] New AI-facing business logic lands in `lib/unified-tools/`, not in route handlers.
- [ ] New MCP tool ships with a scope + HTTP-level gate + `api_audit_log` entry.
- [ ] External-API mocks (provider responses) verified against the live endpoint (rule 13).
- [ ] Relevant runbook in `observability/runbooks/` updated if failure modes changed.
