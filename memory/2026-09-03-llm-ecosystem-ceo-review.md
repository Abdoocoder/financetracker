# CEO Review Summary — Fajrak LLM Ecosystem (PRD v3.2)

**Date:** 2026-09-03
**Mode:** HOLD SCOPE — the two-feature scope (A: BYOK chat; B: MCP server) is accepted as-is and made bulletproof. No silent scope changes.
**Verdict:** DONE_WITH_CONCERNS — every concern below is resolved with an explicit decision and an in-scope fix. No open blockers.

> **⚠️ AD-4 CORRECTION (2026-09-04):** the "server-held symmetric KEK" model below
> was **corrected to an asymmetric RSA-OAEP envelope** during implementation.
> Rationale: a symmetric KEK the client must wrap-under would have to ship to the
> browser as `NEXT_PUBLIC_*` — i.e. inside the bundle where anyone can read it,
> defeating the security goal. Final contract:
> `payload = AES-GCM(provider_key, ephemeral_envelope_key)` `[12B IV prefixed]`,
> `env = RSA-OAEP(ephemeral_envelope_key, BYOK_RSA_PUBLIC)`; only the RSA **public**
> key reaches the client; the server unwraps with its **private** key
> (`BYOK_PRIVATE_KEY`, env/secret-manager). Env vars are now
> `BYOK_PRIVATE_KEY` (server) + `NEXT_PUBLIC_BYOK_PUBLIC_KEY` + `NEXT_PUBLIC_BYOK_KEK_ID`
> (client). The `BYOK_KEK`/AES-KW-`BYOK_KEK_ID` values previously set in Vercel are
> **superseded** — replace them with an RSA keypair. Everything below that says
> "KEK"/"AES-KW" reflects the original (pre-correction) plan.

---

## Accepted scope (unchanged)
- **Feature A:** BYOK LLM chat (Web + Flutter) with Ollama (clientDirect) + 5 cloud providers (nvidia, openai, anthropic, gemini, openrouter) via a thin proxy.
- **Feature B:** MCP server exposing the app's LLM/tool surfaces to MCP clients.

## Top challenges & decisions (all resolved this review)

### 1. Feature A key model was internally contradictory (the #1 landmine) → **KEK envelope**
The plan claimed all three simultaneously, which MDN proves impossible:
1. key is `non-extractable` (lines 155-156)
2. server **decrypts** it per request
3. AD-3: server stores nothing

A non-extractable key CANNOT be exported (`exportKey`) or wrapped (`wrapKey` requires the key-to-wrap to be exportable) — so it can never reach a server. Since the plan already **committed to the thin proxy as core architecture** (C2), the only coherent resolution is the standard **envelope/key-wrapping** pattern:
- **At-rest:** non-extractable key encrypts provider key → ciphertext in IndexedDB / platform keystore; server never sees it (AD-3 hold).
- **Per-request:** client re-encrypts under an ephemeral envelope key, wraps it to a **server-held KEK**, ships `[ciphertext]+[wrapped key]`; server unwraps, decrypts in-memory, uses, destroys.
- **AD-3 holds:** the KEK is a key-management secret in env/secret-manager (never DB/disk), not a stored user key.

**Scope cost (explicit, small):** server KEK env secret + `wrapKey`/`unwrapKey` helper + GCM-wrap lib (e.g. `gcmwrap`/`iron-webcrypto` style) + PRD threat-model wording tweak. **Record as an ADB in the PRD.**

### 2. Streaming SSE vs. serverless-function timeout → **small in-scope hardening**
Proxy relays SSE verbatim but had no handling for the function timeout firing mid-stream (client would hang). Fix: explicit `export const maxDuration` on the route + hard server-side cutoff emitting a terminal SSE `error` frame + client `AbortController` (unmount/nav/429). Not a runtime change.

### 3. Orphaned upstream connections on client cancel → **in scope now**
Client abort was only tearing down the client↔proxy leg; the provider kept generating and silently burned per-user quota. Fix: proxy forwards the client abort to the upstream fetch signal and destroys the decrypted key in the same `finally`; add a mid-stream-cancel acceptance test asserting the upstream `AbortController` fired.

### 4. KEK blast radius → **single global KEK + rotation plan**
v1 uses one env KEK (secret manager, never DB/disk), a **key-ID tag on every ciphertext** so future rotation is possible, and an **additive rotation procedure** (old KEK retained until all fragments re-wrapped). Documented; per-user KEKs deferred.

### 5. Proxy SSRF / credential-exfiltration relay → **allowlist-only upstream**
Proxy is a strict **provider-id → fixed allowlisted host** map. Client never supplies an upstream host; off-allowlist targets are rejected (never key-swapped). Closure of SSRF + "ship the user's key to attacker host" path. Add rejection to proxy tests.

### 6. Rate-limit counter correctness → **atomic Postgres counter**
30/min must actually be 30/min. Use `INSERT ... ON CONFLICT (user_id, minute_bucket) DO UPDATE SET count=count+1 RETURNING count`, reject when >30. Atomic, durable, single round-trip, reuses existing DB. **Explicitly forbid** in-process/shared-nothing counters (stateless serverless = per-instance = silently broken).

### 7. Burst behavior on MCP/proxy → **fail-fast 429, never queue**
MCP agents are parallel; in-function queuing dies on timeout and hides the limit. Fail-fast returns 429 (+ origin header) immediately so the agent's retry/backoff works naturally.

### 8. Two distinct auth surfaces → **session for proxy, PAT for MCP**
- **Web proxy:** session-cookie auth (per plan §9 Q1/Q2).
- **MCP endpoint:** **PAT bearer** (`fjk_live_` + `hashKey` + `api_audit_log`), because non-browser MCP clients (Claude Desktop, IDE agents) can't send session cookies. Reuses existing PAT infra; auditable; binds calls to a user.

### 9. Error differentiation → **origin header + 401/403 split**
- Proxy tags relayed upstream errors with `x-byok-origin: provider|proxy` so provider-quota 429s ("add credits at your provider") and app rate-limit 429s show different copy. No body rewrite; C2 intact.
- **401** = session invalid → re-login; **403** = authenticated but no usable key for this provider → deep-link to add/repair key.

### 10. Flutter crypto parity → **Web/Flutter key-split**
The non-extractable model is Web-Crypto-specific (`crypto.subtle`); Dart/Flutter has no equivalent. Adopt: at-rest via **platform keystore** (Android Keystore / iOS Keychain) on Flutter, `crypto.subtle` non-extractable on Web; **same KEK-wrapped AES-GCM envelope contract** on both; add a Dart unit test proving wrap/decrypt.

### 11. Proxy observability without leaking → **key-free structured logging**
Log `user_id`, `provider_id`, `model`, `status`, `latency`, `stream_duration`, `trace_id`, body **size** + sha-256 hash (not content); **never** the key or raw auth header. Auth-header redaction enforced as a unit test (test #8).

### 12. Test coverage → **all 7 proxy acceptance tests required**
§7.4 was happy-path only. Add: (1) KEK-unwrap failure, (2) origin header, (3) allowlist rejection, (4) abort propagation, (5) timeout cutoff, (6) 401/403 split, (7) key-destroy-in-`finally` — plus (8) no-key-in-logs. Pure Node/integration-testable with a mock upstream.

### 13. Key-onboarding UX → **one in-scope Key Management screen** (web)
Per-provider encrypted add-key, ready-to-paste MCP `Authorization` snippet, and a **test-connection** button validating the key through the proxy end-to-end. Closes the setup funnel for both the chat UI and headless MCP clients.

---

## Concrete next steps (post-review)
1. **Write the ADB** for the KEK envelope key model into the PRD (§4.3) and update the threat model wording.
2. **New migration:** `proxy_usage` per-user-minute atomic counter (`user_id`, `minute_bucket`, `count`, PK on both) + RLS.
3. **New env secret:** server KEK (Vercel env / secret manager) — single global, key-ID tagged.
4. **Proxy route** (`app/api/byok/proxy/route.ts`): allowlist map, KEK unwrap, origin header, 401/403 split, AbortController propagation, fail-fast 429, key-free logging, `maxDuration`.
5. **MCP route** (`app/api/mcp/route.ts`): Streamable HTTP, PAT bearer auth.
6. **Client:** AbortController streaming hooks (Web) + platform-keystore key storage (Flutter).
7. **Key Management screen** (web) with test-connection.
8. **§7.4 test set:** all 8 proxy tests + Dart wrap/decrypt test.

## Deferred / NOT in scope (HOLD SCOPE)
- Per-user KEKs (deferred; documented rotation path instead).
- Provider-native request translation inside the proxy (explicitly NOT — thin verbatim pass-through, C2).
- Full provider-body logging / content-level observability (out — would leak data).
- New runtime (long-lived process) — rejected; the small in-scope hardening covers the serverless cap.

## Post-review backlog candidates
Existing `.taskmaster` pending tasks #41–#50 (backlog) remain; this review's additions (key-mgmt screen, proxy tests, KEK rotation doc, migration) are candidate new tasks.
