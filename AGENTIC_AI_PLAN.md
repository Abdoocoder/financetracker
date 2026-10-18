# AGENTIC_AI_PLAN — Fajrak Executive Assistant (Agentic AI)

**Status:** planning · **Created:** 2026-10-21 · **Owner:** single-dev
**Preceded by:** Zakat Autopilot (Phase C) — complete and live (backend migration `20261021000000_zakat_autopilot.sql`, daily Vercel Cron `/api/zakat-autopilot`, Hawl countdown UI on Web + Mobile).

> Summary of the Phase 1–4 PRD agreed on 2026-10-21. Phase names are normative;
> the task lists inside each phase are planning-level and open to review before execution.

## Vision

Upgrade the BYOK AI chat assistant into an **Executive Assistant**: a tool-calling
agent that reads the user's live financial data — and, with explicit confirmation,
acts on it — instead of a free-form chat that only formats text.

## Current building blocks (reuse, don't rebuild)

| Building block | Location |
|---|---|
| BYOK proxy | `/api/byok/proxy` + `lib/byok/*` (RSA-OAEP + AES-256-GCM envelope) |
| MCP server | `/api/mcp` (Streamable HTTP, PAT via `verifyApiKey`) |
| Tool definitions | `lib/unified-tools/` |
| Finance math | Supabase RPCs — `get_financial_dashboard`, `get_health_score`, `get_zakat_summary`, `sync_zakat_haul_state`, … (never reimplement in TS/Dart) |
| Clients | Web chat (`/dashboard/chat`), Mobile chat screen (SSE streaming, `flutter_markdown_plus`) |
| Moderation / rate limiting | `lib/moderation/`, `lib/rate-limit*` |

## Phase 1 — Tools

Goal: a typed, server-side tool surface the assistant can call.

- Define executive-assistant tools on top of `lib/unified-tools` — read tools
  (balances, transactions, budgets, goals, zakat/hawl state, health score) and
  write-intent tools (create transaction, adjust budget) gated behind confirmation.
- Zod schema per tool; shared types in `types/index.ts`; every tool executes
  through the server Supabase client so **RLS applies unchanged**.
- Read-only MCP tools can ship first; write tools carry scopes mirroring the PAT
  model (`create_transaction`).
- TDD: Jest per-tool contract tests.

## Phase 2 — Parsing

Goal: a provider-agnostic agentic loop.

- Parse tool calls streaming back from OpenAI / Anthropic / Gemini / OpenRouter
  via the BYOK proxy; normalize each provider's function-call format.
- Loop: model → tool call → execute (RLS-safe) → result → model, with a bounded
  iteration cap, timeouts, and typed errors from `lib/errors`.
- Streaming passthrough to clients (SSE already exists on mobile).
- TDD: Jest against recorded provider payloads.

## Phase 3 — UI

Goal: the chat becomes an executive briefing + action surface.

- Tool-call cards / step visualization in Web + Mobile chat; full ar/en i18n
  (no hardcoded strings — CLAUDE.md rule 2).
- Confirmation gates for write actions before execution; deep links to the
  relevant dashboard pages.
- Zakat/Hawl answers must come from the RPCs — the assistant never computes
  Nisab or Hawl logic locally (CLAUDE.md rules 10–11).

## Phase 4 — Security

Goal: agent safety equal to the app's RLS-first posture.

- Prompt-injection guardrails (tool results are data, never instructions);
  moderation reuse; per-user rate limits; an `api_audit_log` entry for every
  tool execution.
- BYOK key hygiene unchanged (envelope encryption; keys never logged — rule 3).
- Write actions require explicit user confirmation and are fully auditable.
- Quiet hours respected for any proactive/agentic push (rule 7).
- Red-team checklist before GA.

## Success criteria

- The assistant answers "كم أنفق على الطعام هذا الشهر؟" with live RPC data, not estimates.
- Zero RLS bypasses; every tool call audited.
- One tool surface powers both Web and Mobile.

## Non-goals

- No new financial math in TypeScript/Dart (RPCs own it).
- No autonomous write actions without user confirmation.
- No storage of conversation content beyond what exists today.

## Open questions

1. Write tools in v1, or read-only first?
2. Tool-result caching strategy (e.g. the 1-hour staleTime pattern from `useZakatHawl`)?
3. Per-plan tool quotas (ties into future monetization)?
