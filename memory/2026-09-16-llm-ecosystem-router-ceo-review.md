# CEO Review — LLM Ecosystem Router PRD v4.0

> Review date: 2026-09-16 · Mode: **HOLD SCOPE** · Implementation approach: **C** (Router + usage log + eval; A/B + health monitoring + tuning UI deferred)
> Focus: `docs/projects/llm-ecosystem-router_prd.md` (628 lines) against shipped code at `934a899b`.
> Verdict: **DONE_WITH_CONCERNS** — 5 blocking concerns, all fixable inside approved scope, none require expansion.

## Accepted scope (approach C)
- Phase 2: task classifier (heuristic-first), router engine, cost tracker + `byok_usage_log`, user prefs UI + persistence, routing indicator. Web + mobile mirror.
- Phase 3: DeepSeek Harness eval integration + financial-Arabic benchmark dataset + weekly CI + regression alerts.
- Phase 4 (trimmed): cost alerts, fallback chain + auto-retry, routing analytics dashboard. No A/B, no provider health auto-exclusion, no tuning UI.

## NOT in scope (locked)
- New providers, fine-tuning, cross-conversation memory, multi-turn agents, voice, marketplace, MCP export of router, multi-model consensus, streaming mid-conversation model switch, implicit user-pref learning.

## Blocking concerns (must fix before/inside Phase 2)

1. **Cost-table unit bug (1000×) — corrupts the headline KPI.**
   PRD §3.4 / `ProviderRoutingProfile.costPer1kTokens` are labeled "per 1k", but the values (Anthropic $3/$15, Gemini $1.25/$5) are real **per-1M** prices. Rendered literally, `estimatedCostUsd` inflates ~1000× and `cost_optimize` strategy (the 60%-reduction goal) picks wrong providers. **Fix applied (2026-09-16):** field **renamed** `costPer1kTokens` → `costPer1MTokens` (safe — field is new/unshipped, confirmed via grep that it exists only in PRD markdown, not in `lib/byok/providers.ts`); golden unit test added (Sonnet 4 = $3.00/$15.00 per **1M**; mini = $0.15/$0.60 per **1M**). See ADR-ROUTER-001.

2. **`x-routing-decision` response header contradicts client-side routing (§7.1 vs §2/§3.3).**
   Router lives in `lib/byok/` (client). A **response** header implies server-side routing, which the thin proxy cannot do (never parses body). Decide: client router returns the decision to the UI; API contract returns SSE + routing metadata **in the request headers** (or drops it). Recommend: client sends `x-routing-decision` on the request for server-side audit; response stays unchanged.

3. **"Hard stop at monthly budget" (§8.3) is not enforceable.**
   Proxy never parses bodies → server cannot count tokens; `byok_usage_log` is client-reported and spoofable. Under HOLD SCOPE, reposition as **advisory budget + 80% alert + client-side soft-block**, not "hard stop". Real enforcement would require parsing (rejected) — do not market enforced caps.

4. **`byok_usage_log` migration has no RLS.**
   §3.4 `CREATE TABLE` omits `ENABLE ROW LEVEL SECURITY`, policies, and grants. Must mirror `proxy_usage` pattern (legacy/040): user-owns rows policy + `grant select,insert` to `authenticated`. Same for `byok_ab_assignment` (later).

5. **Router crashes on empty candidate set.**
   §3.3 `route()` calls `applyPreferences(scored[0], …)`; if `filter` elimination leaves zero candidates (streaming/tools/privacy no-match), `scored[0]` is undefined. **Fix applied (2026-09-16):** fallback added — relax `requiresStreaming`→false, then privacy-only, then default-tier provider; unit test added. See ADR-ROUTER-005.

## Secondary concerns (fix during implementation, low cost)

6. **Optional LLM-Lite classifier leaks under `local_only` + costs every message.** Gate it: heuristic-only in local_only; LLM-Lite only when `privacyMode=standard` AND heuristic confidence below threshold. Keep heuristic-only for v1 (matches PRD §13).

7. **Prefs schema redundancy.** `routing_strategy`/`routing_budget_usd` typed columns + `routing_prefs JSONB` duplicate. Pick typed columns (dashboard aggregations) and drop the JSONB, or vice-versa. One source of truth.

8. **Eval realism (Phase 3).** `deepseek-harness` 0.3.1 is a protocol-aware client wrapping `openai.OpenAI` and is DeepSeek-focused; multi-provider (`--providers anthropic,gemini`) depends on OpenAI-compat adapters / `llm-pi-ai` — verify each endpoint + `arabic_quality` metric before promising CI gating. 500+ QA Arabic dataset is domain-authoring effort (estimate ~1 week, not 3 days). Weekly eval burns real API cost — calendar it against the tracking budget. Consider adding `openrouter` (budget) to the eval provider list since cost_optimize routes there.

9. **Mobile mirror doubles Phase 2.** File map shows full `router/` Dart mirror. Sequence web-first, then mirror after web CI is green (risk sequencing within the same timeline, no effort change).

10. **Success-metric operationalization.** "Override rate <15%" and "accuracy ≥90% human eval" have no owner/sample size. Adopt: override-rate from `was_manual_override` (live), plus a small periodic human eval (20 tasks × 4 providers/quarter) instead of an undefined 90%-human-eval gate.

## Verdict
Plan is sound in shape and aligns with shipped Phase 1. All blocking concerns are corrections, not expansions — safe to proceed to Phase 2. Recommended order: fix #1/#4/#5 in the PRD + migration doc first, then heuristic classifier → engine → cost tracker → prefs UI → indicator.

**User gate (resolved 2026-09-16):** chose **"Fix the PRD now"** — write the fixes directly into the PRD document (one ADR note per fix, see new PRD §14 "Review Decision & ADR Notes"), not kept as this ADR only. All 5 blocking fixes are now applied to `docs/projects/llm-ecosystem-router_prd.md`.