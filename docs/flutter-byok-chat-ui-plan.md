# Flutter BYOK Chat UI — Implementation Plan (Feature A, Mobile)

> Status: **Approved & Ready to execute** (verified 2026-09-07 via context7 docs + Supabase MCP + skill-scout). D1, D3, D8, .env mirror confirmed; hardening pass S1–S5 applied. Provenance: webcrypto `/google/webcrypto.dart` confirms BoringSSL/CMake native build + AES-GCM/RSA-OAEP API surface (S3 NDK pin correct); flutter_secure_storage `read()` = String-only (no zeroing beyond owned Uint8List — S2); supabase_flutter `setHeader('Authorization','Bearer $jwt')` pattern confirmed (D1/T5.1); Supabase project `ujwcvtpwsaidljecqbaa` has migration `043 user_byok_keys` applied with RLS on + `proxy_usage` present; skill-scout found no missing execution skill (executing-plans/TDD suffice). Execute via executing-plans.
>
> **Checkpoints:** Phases 0–3 → **Phase 4 complete (2026-09-08)**: `webcrypto:setup` run (cmake BoringSSL build, needed for VM tests); `envelope.dart` `buildEnvelope` + `pemToDer` + zeroing (S2) implemented; dotenv reads catch `NotInitializedError` (missing config → `StateError`). T4.2 vectors all green: (a) deterministic AES-GCM payload byte-equals captured WebCrypto fixture, (b) generated RSA-2048 keypair roundtrip recovers the 32-byte key, (c) cross-decrypt of web `env` fixture recovers the captured key, plus end-to-end decrypt of `browser_envelope.json`. D3 **layout proof gate satisfied** — `flutter analyze` clean, `flutter test test/services/byok/` 40/40. → **Phase 5 complete (2026-09-08)**: `byok_service.dart` proxy + clientDirect (D2) + error mapping (T5.4) + `PROXY_BASE_URL` dotenv fallback (S4/D8) + stop-vs-timeout race (T5.3/T5.5); 13/13 service tests, suite 53/53, `flutter analyze` clean. **Env wiring (D8 + D2/Dec #4) applied**: `PROXY_BASE_URL="https://fajrak.com"`, `BYOK_KEK_ID="kek-fajrak-v1"`, `BYOK_PUBLIC_KEY` (SPKI PEM from root `.env.local`) added to `mobile/fajrak_flutter/.env` + `.env.example` (mirrors web `NEXT_PUBLIC_BYOK_*`).
> Source of truth: `docs/projects/llm-ecosystem_prd.md` (v3.2, Feature A, AD-3/AD-4/AD-5, §7.4/§7.5, §8).
> Skill: writing-plans (TDD bite-sized tasks, human review gates).

## 1. Goal

Deliver the **mobile (Flutter) BYOK chat experience** in `mobile/fajrak_flutter/`,
feature-identical to the shipped web chat (`/dashboard/chat` + `/dashboard/settings` BYOK section):

- Chat with any supported provider: **OpenAI, Anthropic, NVIDIA NIM, OpenRouter, Gemini**
  (route through the existing server proxy `/api/byok/proxy`, C2 thin pass-through)
  **and local Ollama** (`clientDirect`, no proxy, no key).
- Provider API keys are stored **device-only** (flutter_secure_storage → Keychain / Android
  Keystore), never sent to Fajrak servers **in the clear** (AD-3). Per request the key leaves
  the device only as an **AD-4 RSA-OAEP/AES-GCM envelope** decryptable only by the server's
  RSA private key.
- A **BYOK keys manager** section under Settings (mirror of `byok-keys-section.tsx`) plus a
  **Chat screen** reachable from More / Settings.

## 2. Scope

### In scope
- New Dart BYOK layer: provider registry, chat wire helpers, device vault, envelope builder,
  and a `ByokService` that dispatches proxy (`user_byok_keys` + vault) vs `clientDirect` (Ollama).
- Chat screen UI + BYOK keys section UI (mirroring web), i18n AR/EN via `easy_localization`.
- New tests mirroring the web suite (`__tests__/lib/byok/*`).
- Platform network config for local Ollama (Android/iOS) per PRD §8.
- **One small web-side dependency change** (see D1): the proxy must accept a Supabase JWT via
  `Authorization` header, since Flutter cannot send the web session cookie.

### Out of scope (per PRD HOLD SCOPE)
- Any new provider, changing server proxy behavior, key material on the server, per-key
  rotation UI, model tuning, or migrating the existing one-shot `LlmService` consumers
  (`ai_generator_card.dart`, `financial_advisor_card.dart`) to proxy providers.
- `user_byok_keys` TEST button behavior parity is included; live "last_used_at" stamping included.

## 3. Existing assets (verified in repo)

| Asset | Location | Notes |
|---|---|---|
| DB migration | `supabase/migrations/043_user_byok_keys.sql` | `user_byok_keys(id uuid pk, user_id→profiles cascade, provider_id, key_name, key_prefix, is_active, last_used_at, created_at)`, indexes on `(user_id, created_at desc)` + provider, RLS owner=`auth.uid()`. Applied upstream. |
| Server proxy | `app/api/byok/proxy/route.ts` | Session-cookie auth via `createClient()`; `bump_proxy_usage()` RPC → 429 `x-byok-origin: proxy` (>30/min/user); unwraps envelope (`unwrapProviderKey`, `zeroBytes`, `isKekConfigured`); SSRF allowlist via `getProvider()`; `force-dynamic`, `maxDuration=120`; key-free logs. |
| Web provider registry | `lib/byok/providers.ts` | `SUPPORTED_PROVIDERS` (openai, anthropic, nvidia-nim, openrouter, gemini = `proxy`; ollama = `clientDirect`), `auth` kinds bearer / x-api-key / x-goog-api-key / none, fixed `baseUrl`, `defaultModel`, `authHeaderName`. |
| Web chat wire | `lib/byok/chat.ts` | `ChatMsg {role, content}`, `TEMPERATURE=0.2`, `buildChatBody` (anthropic, gemini, openai-compatible), `extractDelta`, `readStream` (SSE `data:` frames, `[DONE]`). |
| Web client/envelope | `lib/byok/client.ts`, `lib/byok/envelope.ts` | Envelope: `payload=AES-GCM(provider_key, ephemeral)[12B IV prefix]`, `env=RSA-OAEP-256(ephemeral_key, RSA_PUBLIC)`, `keyId=BYOK_KEK_ID`; server unwraps with RSA private (PKCS#8), non-extractable, `zeroBytes` in `finally`. |
| Web vault | `lib/byok/vault.ts` | IndexedDB v1, `save/get/delete/hasProviderKey`, `isVaultUnavailable`. Mobile replaces this with `flutter_secure_storage` (hardware-backed), same security contract (device-only). |
| Web chat UI | `components/dashboard/chat-assistant.tsx` | Provider/key/model selectors (key rows from `user_byok_keys` `is_active`, ordered `created_at`), streaming + appendDelta, AbortController stop, error mapping (no-key/unauthorized/ollama-cors/generic/vault), monthly+tier stats in system prompt, `autoFocus` input, Enter-to-send. |
| Web BYOK section | `components/settings/byok-keys-section.tsx` | Proxy-only providers; rows show `key_prefix`, created/last-used, `hasKey` (vault presence), Test/Remove buttons, Add form (provider/name/value, show/hide, `crypto.randomUUID` id), ConfirmDialog for revoke, vault-unavailable banner. |
| Web i18n | `lib/locales/{ar,en}/chat.ts` + `settings.ts` | Full `chat_*` (27 keys, AR+EN) and `settings_byok_*` (22 keys) literal strings captured below. |
| Web pages | `app/(dashboard)/dashboard/chat/page.tsx`, `.../settings/page.tsx` | Chat = `PageHeader(chat_title, chat_subtitle)` + dynamic `ChatAssistant`; Settings composes `ApiKeysSection` + `BYOKKeysSection`. |
| Mobile secure storage | `lib/services/llm_service.dart` | `SecureStore` interface + `SecureKeyStore` (flutter_secure_storage, `aOptions: AndroidOptions()`), key prefix `llm_key_`, `queryFinancialInsight` single-shot, test seam `send()`. |
| Mobile tests | `test/services/llm_service_test.dart` | `InMemorySecureStore` + `MockClient` (package:http/testing). |
| Mobile entry points | `lib/screens/more/more_screen.dart`, `lib/screens/settings/settings_screen.dart`, `lib/screens/main_screen.dart` | More/Settings = pushed routes; settings already reads `Supabase.instance.client.auth.currentUser` + PackageInfo. |
| Mobile deps | `pubspec.yaml` | `flutter_secure_storage ^11.0.0`, `http ^1.2.1`, `supabase_flutter ^2.3.4`, `easy_localization ^3.0.3`, `flutter_dotenv ^6.0.0`. **No crypto package yet** → add `webcrypto` (see D3). |
| Android build | `android/app/build.gradle.kts` | **Already pins `ndkVersion = "28.2.13676358"`** (the version webcrypto's native-assets build was verified against), `compileSdk 37`, Java 17. **No change needed** — guard the executing agent against "fixing" or drifting this pin (S3). |
| Mobile dotenv | `main.dart` loads `.env`; `investments_service.dart` pattern | `dotenv.env['...']` reads; public build-time values only. |

## 4. Architecture decisions

### D1 — Proxy auth for mobile: Bearer JWT (REQUIRED small web change)
- **Problem:** `/api/byok/proxy` authenticates via the Supabase session **cookie**. Flutter
  cannot send that cookie.
- **Decision:** extend `app/api/byok/proxy/route.ts` to accept the Supabase JWT via
  `Authorization: Bearer <jwt>` and authenticate with `supabase.auth.getUser(token)` (RLS +
  `bump_proxy_usage` unchanged; cookie path retained for web).
  - Implementation sketch: in the route, read `authorization` header; if present, create the
    server client with a token (`supabase.auth.getUser(accessToken)`); RPC `bump_proxy_usage`
    continues to key off `auth.uid()`. `anon` key is safe to send; the JWT is short-lived and
    HTTPS-only.
- **Flutter side:** `ByokService` obtains `ClientAuth` from
  `Supabase.instance.client.auth.currentSession?.accessToken` at send time.
- Review gate: server route change is approved together with this plan (server stays C2).

### D2 — Mobile config: public key + KEK id via `.env` (flutter_dotenv)
- No public-key endpoint exists (`app/api/byok/**` exposes only the proxy). The RSA **public**
  key and KEK id are safe to ship to clients (public material, AD-4 comment in `envelope.ts`).
- **Decision:** add `BYOK_PUBLIC_KEY` (SPKI PEM, single line) and `BYOK_KEK_ID` to
  `mobile/fajrak_flutter/.env` **and** `.env.example`, read via `dotenv.env`. `.env` is already
  loaded in `main.dart`. Must equal web's `NEXT_PUBLIC_BYOK_PUBLIC_KEY` / `NEXT_PUBLIC_BYOK_KEK_ID`
  (single keypair, AD-4). Missing config ⇒ `buildEnvelope` throws a clear message (like web
  `client.ts`).

### D3 — Dart crypto: `package:webcrypto` (NEW dependency)
- Requirement: Dart must produce the **byte-identical AD-4 envelope** WebCrypto produces
  (`client.ts`), so `envelope.ts`/proxy can unwrap it unchanged.
- **Decision:** add `webcrypto: ^0.6.1` (only new Flutter dep; BoringSSL on Android/iOS via
  Dart native assets + CMake; SDK `^3.10.0` satisfied by project `>=3.11.0`; NDK 28.2 + cmake
  confirmed on this machine). Uses `RsaOaepPublicKey` + `AesGcmSecretKey` from the Web
  Cryptography API — **byte-identical to browser WebCrypto by construction** (same spec,
  same primitive). Wire format (must match):
  - `payload = base64( [12-byte IV] ++ [AES-256-GCM ciphertext || GCM tag] )` —
    `AesGcmSecretKey.encryptBytes(plaintext, iv)` returns raw ciphertext+tag; encode as
    `[12-byte IV][cipherText||tag]` (server `subtle.decrypt` treats `[ct|tag]` as one block,
    so this is byte-compatible).
  - `env = base64( RSA-OAEP-SHA256 encrypt of the raw ephemeral 32-byte AES key )` —
    `RsaOaepPublicKey.encryptBytes(ephemeralKey)` with SHA-256 hash (set at import); empty
    label (default, matching web `client.ts`).
  - `keyId = BYOK_KEK_ID`.
  PEM→DER parsing: `NEXT_PUBLIC_BYOK_PUBLIC_KEY` is SPKI PEM (single line). `webcrypto`
  imports SPKI DER; add a 3-line helper to strip PEM markers + base64-decode (no external dep).
- Deterministic nonce (fixed IV) for tests only; production uses `webcrypto`'s CSPRNG.
- **Key hygiene (S2):** raw key material must be handled as `Uint8List` and zeroed in `finally`
  via `bytes.fillRange(0, bytes.length, 0)` — every `Uint8List` this code owns (the utf8-encoded
  key copy, the ephemeral 32-byte key passed to `encryptBytes`). **Caveat (verified):** Dart
  `String` is immutable and `SecureStore.read()` returns `String?`
  (`llm_service.dart:96`), so the vault-read/form String copies cannot be zeroed and are left to
  GC — exactly like JS strings on web (same accepted residual). Never claim "all traces removed";
  state the boundary honestly.
- Review gate: Dart unit test must **cross-decrypt** a WebCrypto `env` fixture captured from
  `client.ts` using the matching test private key (OAEP is randomized, so byte-equality on
  `env` cannot be asserted; interop is proven by decryption). AES-GCM **is** deterministic
  with fixed key+IV, so byte-equality assertion on `payload` is valid.

### D4 — Mobile vault = `flutter_secure_storage` (replaces IndexedDB)
- Web IndexedDB + PBKDF2/AES-GCM exists because browsers lack a hardware vault. Mobile already
  has one: `SecureKeyStore` (Keychain / Android Keystore). Same contract: device-only, encrypted
  at rest, never sent to our servers.
- **Decision:** reuse `SecureStore`/`SecureKeyStore`; new key scheme `byok_key_<keyRecordId>`
  (keyed by `user_byok_keys.id`, mirroring web `saveProviderKey(keyId, raw)`), separate from the
  legacy `llm_key_<providerId>` (left intact for `LlmService`).
- `hasProviderKey(id)` = presence check (`read != null`) without exposing the value; existence is
  set in row `hasKey` on the keys list (mirror `byok-keys-section.tsx`).
- No `isVaultUnavailable` state needed on mobile (flutter_secure_storage doesn't fail under
  private browsing); keep the flag in the `ByokVault` abstraction as `false` for API parity but
  do not gate real devices on it.

### D5 — `ByokService` dispatch (proxy vs clientDirect), software-only mirror of `ChatAssistant`
- New `lib/services/byok/byok_service.dart`:
  - `chat({required ByokProvider provider, required List<ChatMsg> messages, required String systemPrompt, String? providerKeyOrId, String? keyRecordId, required void Function(String) onDelta, required CancelToken/StopHandle onStop, ...})` — returns a `Future` that completes when the stream ends or is stopped.
  - proxy path: resolve key record → `getProviderKey(recordId)` from vault → `buildEnvelope` → POST `/api/byok/proxy` with `Authorization: Bearer <jwt>` → SSE loop `readStream`.
  - clientDirect path: POST `chat/completions` directly to Ollama `baseUrl` (no proxy, no key).
- Errors surfaced as typed codes so the UI maps them to the same i18n strings as web
  (`chat_error_no_key`, `chat_error_unauthorized`, `chat_error_ollama_cors`, `chat_error_generic`,
  `chat_error_vault`), plus mobile-only `chat_error_timeout` for the `readStream` stall guard (S1).
- Cancellation: Dart `http` has no `AbortController`; the stop button closes the
  `StreamedResponse` (cancels the request) via a cancel token the service exposes. Tested.
- `LlmService` is **not** modified; new chat feature uses `ByokService`. Existing
  `ai_generator_card.dart` / `financial_advisor_card.dart` keep using `LlmService` (local-only,
  unchanged behavior). A follow-up (out of scope) can route those through `ByokService` later.

### D6 — UI surface & navigation
- **Chat screen:** new `lib/screens/chat/chat_screen.dart`, **pushed route** from the More list
  (mirroring how settings is reached). Header via existing AppBar pattern; body mirrors
  `chat-assistant.tsx` (provider dropdown, key dropdown from `user_byok_keys` rows for proxy
  providers, model text field, greeting bubble, streaming bubbles, Stop / Clear / Send, error
  banner, financial-context note). Model default = provider `defaultModel` (Auto placeholder for
  OpenRouter).
- **BYOK keys section:** new `lib/widgets/settings/byok_keys_section.dart` embedded in
  `settings_screen.dart` (below the PAT `api_keys_section.dart`), mirroring
  `byok-keys-section.tsx`: provider chips (proxy-only), rows (key_prefix, Added/Last-used,
  "stored on this device" badge, Test ⏳→✅, Remove w/ `ConfirmDialog`), Add form
  (provider/name/key with show-hide, `autoFocus` on key field, add button disabled until valid,
  saving label ⏳ + disabled + not-allowed per CLAUDE.md UX rules). `ConfirmDialog` for all
  destructive actions; every icon-only button gets a descriptive `aria-label`/`Semantics` label.
- i18n: new `chat_*` and `settings_byok_*` keys added to `assets/i18n/ar.json` + `en.json`
  (exact strings listed in §7).

### D7 — Local Ollama platform config (PRD §8)
- Android: ensure `android/app/src/main/res/xml/network_security_config.xml` permits
  cleartext to `10.0.2.2`/`localhost` for the dev Ollama origin, and reference it in
  `AndroidManifest.xml` (`android:networkSecurityConfig`). Add if missing (check existing first —
  `LlmService` may already rely on it).
- iOS: `Info.plist` → `NSAppTransportSecurity` → `NSAllowsLocalNetworking = true`.
- Ollama `baseUrl` on Android emulator is `http://10.0.2.2:11434/v1` (reuse
  `LlmService.defaultOllamaBaseUrl`).

## 5. File map

### New (mobile)
```
mobile/fajrak_flutter/lib/services/byok/providers.dart    # SUPPORTED_PROVIDERS registry + getProvider (mirror providers.ts)
mobile/fajrak_flutter/lib/services/byok/chat.dart         # ChatMsg, TEMPERATURE, buildChatBody, extractDelta, readStream (mirror chat.ts)
mobile/fajrak_flutter/lib/services/byok/vault.dart        # ByokVault wrapper on SecureStore (byok_key_<id>), has/get/save/delete
mobile/fajrak_flutter/lib/services/byok/envelope.dart     # buildEnvelope (AES-256-GCM + RSA-OAEP) — mirror client.ts
mobile/fajrak_flutter/lib/services/byok/byok_service.dart # proxy vs clientDirect dispatch, auth, SSE, cancel
mobile/fajrak_flutter/lib/screens/chat/chat_screen.dart    # chat UI (mirror chat-assistant.tsx)
mobile/fajrak_flutter/lib/widgets/settings/byok_keys_section.dart  # BYOK manager section
mobile/fajrak_flutter/lib/services/byok/http_stream.dart  # SSE line-parser (data:, [DONE], JSON) — extractable for tests
test/services/byok/providers_test.dart
test/services/byok/chat_test.dart
test/services/byok/vault_test.dart
test/services/byok/envelope_test.dart   # incl. WebCrypto fixture round-trip vector
test/services/byok/byok_service_test.dart (or integration barrel)
test/widgets/settings/byok_keys_section_test.dart
test/screens/chat/chat_screen_test.dart
```

### Modified (mobile)
```
pubspec.yaml                                    # + webcrypto
lib/main.dart?                                  # only if a ByokService/Provider registration is needed — prefer constructor injection, likely NO change
lib/screens/more/more_screen.dart              # + "AI Chat" list entry → push ChatScreen
lib/screens/settings/settings_screen.dart      # + ByokKeysSection in the accordion
assets/i18n/ar.json / en.json                  # + chat_* and settings_byok_* keys
.env / .env.example                            # + BYOK_PUBLIC_KEY, BYOK_KEK_ID
android/app/src/main/AndroidManifest.xml        # networkSecurityConfig (add if missing)
android/app/src/main/res/xml/network_security_config.xml  # add if missing
ios/Runner/Info.plist                          # NSAllowsLocalNetworking
```

### Modified (web — D1 dependency)
```
app/api/byok/proxy/route.ts                    # accept Authorization: Bearer <Supabase JWT>
```

## 6. Task breakdown (ordered, TDD)

> Each task follows red → green → review → optional commit. Verification gates:
> `flutter analyze`, `flutter test test/services/byok/`, targeted widget tests, finally
> `make doctor` (analyze + test, zero issues) + `make build-apk`.

### Phase 0 — Web proxy Bearer-JWT support (D1) — **1 small task, review gate**
- T0.1: `/api/byok/proxy`: parse `Authorization: Bearer …`; authenticate via
  `supabase.auth.getUser(token)` (or create client with that token); keep cookie path. Add a
  unit test against the route handler for both auth paths. Verify web chat unaffected (existing
  cookie path).
- Gate: server remains C2; rate limit + RLS unchanged; run web `npm run test` (byok tests) +
  `npm run build`.

### Phase 1 — Dart provider registry (no deps)
- T1.1: `providers.dart` — `ByokProvider` + `SUPPORTED_PROVIDERS` + `getProvider`, mirroring
  `providers.ts` exactly (ids, kinds, baseUrls, defaultModels, auth kinds, authHeaderNames,
  anthropic defaultHeaders).
- T1.2: `providers_test.dart` — every entry has a fixed non-empty `baseUrl`; exactly one
  `clientDirect` (ollama); proxy set == web list. Red first (empty registry).

### Phase 2 — Chat wire helpers (pure functions)
- T2.1: `chat.dart` — `ChatMsg`, `TEMPERATURE=0.2`, `buildChatBody` for the three shapes.
- T2.2: `chat.dart` — `extractDelta` (anthropic `/gemini`/openai-compatible branches).
- T2.3: `chat.dart` — `readStream`: parse SSE lines (`data:`, skip `[DONE]`, tolerate malformed
  JSON frames), call `onDelta`; expose as `readStream(http.StreamedResponse, providerId, onDelta)`.
  **Silent-stall protection (S1):** wrap the body stream in
  `stream.timeout(const Duration(seconds: 20))` (dart:async `Stream.timeout` — fires
  `TimeoutException` on any >20s gap between events) and surface it as a typed error. Web lacks
  this (web awaits the fetch forever); mobile is deliberately more resilient. Pass through a
  stop/abort flag so a timeout that races a user Stop is swallowed (T5.3/T5.4).
- T2.4: `chat_test.dart` — golden body maps per provider; delta extraction per provider; SSE
  parser across chunk-split boundaries (emulating `chat.test.ts`). Red first.

### Phase 3 — Device vault (AD-3)
- T3.1: `vault.dart` — `ByokVault` over `SecureStore` (constructor injectable, default
  `SecureKeyStore`): `saveProviderKey(keyId, raw)`, `getProviderKey(keyId)`,
  `deleteProviderKey(keyId)`, `hasProviderKey(keyId)`.
- T3.2: `vault_test.dart` — `InMemorySecureStore` round-trips + deletion + hasKey (no
  persistence assumptions). Red first.

### Phase 4 — Envelope builder (AD-4, crypto dep) — review gate
- T4.1: add `webcrypto` dep; `envelope.dart` — `buildEnvelope(providerKey, {keyId, publicKeyPem})`
  → `{env, payload, keyId}` per D3. Throws clearly when config missing. Add a 3-line PEM→DER
  helper for `RsaOaepPublicKey.importSpkiKey` (strip PEM markers + base64 decode). **Zeroing
  (S2):** every `Uint8List` intermediate (encoded key, ephemeral key) wiped with
  `fillRange(0, length, 0)` in `finally`; document that vault-read `String` copies are immutable
  and not zeroable.
- T4.2: `envelope_test.dart` — **vector test**: (a) AES-GCM payload is deterministic with a fixed
  key+IV, so assert byte-equality against a captured WebCrypto `payload` fixture (`[12B IV][ct||tag]`).
  (b) RSA-OAEP is randomized; prove interop by generating an RSA-2048 test keypair via
  `RsaOaepPrivateKey.generateKey`, encrypting with `RsaOaepPublicKey`, and decrypting with the
  matching `RsaOaepPrivateKey` to recover the original 32-byte key. (c) Cross-decrypt: load a
  captured WebCrypto `env` fixture (from `client.ts`) and decrypt with the matching test private
  key to prove byte-level interop. Red first.
- Gate: layout proof (D3) reviewed before the proxy integration is enabled on any device.

### Phase 5 — `ByokService` (proxy + clientDirect)
- T5.1: `byok_service.dart` — `chat()`: proxy path builds envelope from `getProviderKey(recordId)`,
  POSTs to `<SUPABASE_URL>/functions/v1/...`? **No** — proxy is a Next.js route: relative path is
  web-only. Mobile must POST to the **same origin as the web app**. Flutter base URL =
  web production origin. **Decision (D8):** add `PROXY_BASE_URL` to `.env` (e.g.
  `https://fajrak.com`) and call `${PROXY_BASE_URL}/api/byok/proxy`; JWT via
  `Supabase.instance.client.auth.currentSession?.accessToken` in `Authorization`. Include
  `keyId`, `env`, `payload`, `body` (base64), `providerId`, `stream:true`, and provider-specific
  extra headers (`anthropic-version`). **Missing-env resilience (S4):** read via
  `dotenv.env['PROXY_BASE_URL'] ?? 'https://fajrak.com'` (house pattern — `main.dart` already
  uses `?? fallback` for Firebase) plus a debug-only `assert(env != null, 'PROXY_BASE_URL not
  set — add it to mobile/fajrak_flutter/.env')`; production proceeds with the fallback instead of
  crashing. Document the default in `.env.example`.
- T5.2: clientDirect path — direct POST to Ollama `chat/completions` (no key), `readStream`.
- T5.3: cancellation — stop handle closes the streamed response; a stopped request must not
  throw a user-facing error.
- T5.4: error mapping — `401/403`→`unauthorized`; proxy `429` → rate-limit message; clientDirect
  non-200 → `ollama-cors`/`generic`; missing key → `no-key`; **`TimeoutException` (S1) →
  `chat_error_timeout`**, unless the stop flag is set (Stop must not surface a timeout error,
  T5.3).
- T5.5: `byok_service_test.dart` — `MockClient` + `InMemorySecureStore`; verify proxy POST body
  shape (envelope fields present, body base64, auth header), SSE deltas surfaced, stop works,
  error mapping. Red first.

### Phase 6 — Chat screen UI
- T6.1: `chat_screen.dart` — provider dropdown (all providers), key dropdown (rows from
  `user_byok_keys` where `provider_id` matches and `is_active`, ordered `created_at`) shown for
  proxy providers, Ollama note for clientDirect, model field with default.
- T6.2: message list + streaming bubbles (assistant placeholder empty bubble, growing content),
  auto-scroll, greeting bubble when empty, "Thinking…" during stream, financial-context footer.
  **Keyboard-safe auto-scroll (S5):** bottom-anchor via `ListView(reverse: true)` (offset 0 =
  visual bottom) and re-assert offset 0 on every `onDelta` **only when the user is already at the
  bottom** (offset ~0) — never yank while the user reads an upper part (web always yanks;
  `chat-assistant.tsx:110`). Re-anchor to bottom when the keyboard opens/closes
  (`MediaQuery.viewInsets.bottom` + post-frame `animateTo`).
- T6.3: composer — `autoFocus`, Enter sends, Send disabled unless `canSend`, Stop (cancels),
  Clear (with confirm? web clears without confirm — **mirror web**: no confirm), error banner.
- T6.4: financial context — pull total balance + this-month income/
  expense from Supabase (same queries as `chat-assistant.tsx`), build `chat_financial_context`
  system prompt.
- T6.5: More screen entry — add "AI Chat" item (`more_ai_chat` key) → `Navigator.push` to
  `ChatScreen`.
- T6.6: `chat_screen_test.dart` — widget test: renders providers, sends a message (MockClient),
  renders streamed reply; button states (disabled/no-key hint, Stop while sending).
- Gate: manual dogfood on emulator (chat to Ollama locally) before phase 7.

### Phase 7 — BYOK keys section (Settings)
- T7.1: `byok_keys_section.dart` — rows from `user_byok_keys` (id, provider_id, key_name,
  key_prefix, created_at, last_used_at, is_active), sorted `created_at desc`, `hasKey` via vault
  presence; loading skeleton (`className: skeleton` equivalent) per CLAUDE.md.
- T7.2: Add form (provider dropdown proxy-only, name, key with show/hide, `autoFocus`,
  disabled-until-valid add button with ⏳ saving); save order = **vault first, then metadata
  insert; rollback vault on insert error** (mirror `handleSave`); generate `uuid` for the id.
- T7.3: Test button — get raw key from vault (not stored → `settings_byok_keys_no_local`), call
  proxy with non-streamed 1-shot body, on success update `last_used_at` in DB + UI; 🔒/✅/❌ states
  with `settings_byok_keys_testing/test_ok/test_fail`. Uses `buildChatBody(provider,"",[user:"Hi"],
  defaultModel,false)` exactly like web.
- T7.4: Remove — `ConfirmDialog` (AR: "هل أنت متأكد من حذف هذا المفتاح؟؟") → delete DB row then
  vault ciphertext; toast "Key removed".
- T7.5: Provider chips (proxy-kind only) under a collapsible "Supported Providers"; desc
  paragraph `settings_byok_keys_desc`.
- T7.6: embed `ByokKeysSection` in `settings_screen.dart` accordion below PAT section.
- T7.7: `byok_keys_section_test.dart` — renders rows, add flow (vault+metadata rollback on
  failure), test/remove flows.
- Gate: manual emulator flow (add key → chat with a proxy provider if a test key exists; at
  minimum assert 401/unauthorized handling).

### Phase 8 — i18n (AR/EN)
- T8.1: add all `chat_*` (27) + `settings_byok_*` (22) keys to `assets/i18n/{ar,en}.json` using
  the **exact strings** from §7. Add `more_ai_chat`, `chat_error_rate_limit`, `chat_error_timeout`.
- T8.2: verify `easy_localization` picks them up (test: `context.t('chat_send')` resolves in AR/EN).

### Phase 9 — Platform network config
- T9.1: Android emulator cleartext to `10.0.2.2` (network security config) if missing.
- T9.2: iOS `NSAllowsLocalNetworking` (if missing).
- Gate: run `make doctor`, `make build-apk`.

### Phase 10 — Full verification & handoff
- T10.1: `make doctor` (flutter analyze + flutter test — zero issues).
- T10.2: `make build-apk` release build succeeds.
- T10.3: optional `npm run test && npm run build` web regressions for the T0.1 proxy change.

## 7. i18n keys (exact strings to add — copy from web, adjust for mobile wording)

### `chat_*` (AR + EN; EN shown, AR from `lib/locales/ar/chat.ts`)
`chat_title, chat_subtitle, chat_provider, chat_model, chat_auto_model, chat_key,
chat_key_none ({provider}), chat_key_select, chat_ollama_no_key, chat_setup_keys,
chat_setup_keys_hint ({provider}), chat_input_placeholder, chat_send, chat_stop, chat_clear,
chat_greeting, chat_thinking, chat_error_generic, chat_error_no_key, chat_error_insecure,
chat_error_ollama_cors, chat_error_unauthorized, chat_error_vault, chat_context_label,
chat_context_included, chat_financial_context`

Document `chat_error_insecure` wording for mobile ("this app is served over …") and add
`chat_error_rate_limit` ("You've reached the free limit — wait a minute and try again.") and
`chat_error_timeout` ("The connection stalled — check your network and try again.").

### `settings_byok_*` (AR + EN; EN shown, AR from `lib/locales/ar/settings.ts`)
`settings_byok_keys_desc, settings_byok_keys, settings_byok_providers_title,
settings_byok_keys_none, settings_byok_keys_add_new, settings_byok_keys_select_provider,
settings_byok_keys_name_placeholder, settings_byok_keys_value_placeholder,
settings_byok_keys_add, settings_byok_keys_created, settings_byok_keys_created_at,
settings_byok_keys_last_used, settings_byok_keys_never, settings_byok_keys_test,
settings_byok_keys_testing, settings_byok_keys_test_ok, settings_byok_keys_test_fail,
settings_byok_keys_revoke, settings_byok_keys_revoked, settings_byok_keys_local,
settings_byok_keys_not_local, settings_byok_keys_no_local, settings_byok_keys_vault_unavailable`

`settings_byok_keys_vault_unavailable` wording → mobile: "The secure key storage could not be
opened on this device."

## 8. Test list summary

| Test file | Coverage |
|---|---|
| `providers_test.dart` | registry integrity: fixed baseUrls, one clientDirect, proxy set match |
| `chat_test.dart` | body shapes ×3, extractDelta ×3, SSE chunk-split streaming, **20s no-data stall → `TimeoutException` (S1)** |
| `vault_test.dart` | save/get/delete/hasKey over InMemorySecureStore |
| `envelope_test.dart` | **WebCrypto fixture cross-decrypt (env) + byte-equality (payload)**, RSA-OAEP SHA-256, layout `[12B IV][ct][tag]`, missing-config throw, **owned `Uint8List` intermediates zeroed after use (S2)** |
| `byok_service_test.dart` | proxy POST shape + auth header, clientDirect, SSE deltas, cancel, error mapping, **`PROXY_BASE_URL` fallback when `.env` missing (S4)**, timeout-vs-stop race |
| `byok_keys_section_test.dart` | rows/add rollback/test/remove flows |
| `chat_screen_test.dart` | render, send, streaming reply, button states |
| i18n | AR/EN key resolution |
| web `__tests__/lib/byok/*` | unchanged (regression after T0.1) |

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Envelope layout mismatch Dart↔server | D3 vector test vs WebCrypto fixture in Phase 4 gate |
| JWT exposure in proxy logs | Route logs body size + sha-256 only (existing); never log key or JWT |
| Ollama cleartext on Android release | network config scoped to dev; note in PRD §8 |
| Reaching proxy rate limit during dev | error surfaced via `chat_error_rate_limit` |
| Silence/stall on mobile network drop | `readStream` 20s timeout → `chat_error_timeout`; user retries (S1) |
| Raw key copies lingering in heap | zero owned `Uint8List` intermediates in `finally`; immutable String copies left to GC, same as web (S2) |
| Missing `PROXY_BASE_URL` in release | debug-only `assert` + runtime fallback to `https://fajrak.com` (S4) |
| crypto dependency supply chain | pin `webcrypto`; review gate on dep + vector test |
| `LlmService` consumers must not break | `LlmService` untouched; only additive `ByokService` |

## 10. Decisions — ALL APPROVED 2026-09-07

1. **D1** — **APPROVED.** Extend `/api/byok/proxy` to accept `Authorization: Bearer <Supabase JWT>`
   (cookie path unchanged).
2. **D8** — **APPROVED.** `PROXY_BASE_URL` (`https://fajrak.com`) in Flutter `.env` as the proxy
   origin.
3. **D3** — **APPROVED.** Add `webcrypto: ^0.6.1` (only new Flutter dep) to reflect the AD-4
   envelope in Dart.
4. **APPROVED.** Mirror `NEXT_PUBLIC_BYOK_PUBLIC_KEY` + `NEXT_PUBLIC_BYOK_KEK_ID` into
   `mobile/fajrak_flutter/.env` (+ `.env.example`).

## 11. Acceptance criteria (definition of done)

- `make doctor` and `make build-apk` pass with zero issues.
- Chat + BYOK keys manager match web behavior (providers, key flows, streaming, stop/clear,
  error text, twelve 4-space/skeleton loading states per CLAUDE.md).
- Provider keys never leave the device unencrypted; every proxy request sends an AD-4 envelope +
  never the raw key; web regression suite passes.
- i18n AR/EN complete for all keys in §7.