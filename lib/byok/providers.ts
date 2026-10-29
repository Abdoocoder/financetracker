/**
 * BYOK LLM providers + SSRF allowlist (Feature A).
 *
 * The proxy is a THIN pass-through (C2 / HOLD SCOPE): it never parses or
 * rebuilds the provider-native body. It only:
 *   1. looks the provider up here by `providerId` to get the FIXED upstream
 *      host/endpoint (this is the SSRF allowlist — the proxy never accepts an
 *      arbitrary URL, so it can't be turned into an open relay / SSRF vector),
 *   2. swaps the auth header with the decrypted key,
 *   3. relays body + response (incl. SSE) verbatim.
 *
 * Auth model per provider:
 *   - Most OpenAI-compatible providers: `Authorization: Bearer <key>`
 *   - Anthropic       : `x-api-key: <key>` + `anthropic-version` header
 *   - Gemini          : `x-goog-api-key: <key>`
 *
 * Shared SERVER + CLIENT (imported by the web client to know which providers
 * route through the proxy vs direct). Never put secrets here.
 */

/** Authentication style for a provider. */
export type ProviderAuth =
  | { kind: 'bearer' }                       // Authorization: Bearer <key>
  | { kind: 'x-api-key' }                    // Anthropic
  | { kind: 'x-goog-api-key' }               // Gemini
  | { kind: 'none' }                         // Ollama local – clientDirect

export interface ByokProvider {
  id: string
  name: string
  kind: 'proxy' | 'clientDirect'
  /** Fixed upstream URL — the only host the proxy may dial for this id. */
  baseUrl: string
  defaultModel: string
  /** Available models for this provider (shown in UI model selector). */
  availableModels?: string[]
  /** Models that are free to use (no/low cost). */
  freeModels?: string[]
  auth: ProviderAuth
  /** Extra headers to always add (e.g. anthropic-version). Overridden by the request if present. */
  defaultHeaders?: Record<string, string>
  /** Header name to REMOVE from the forwarded request before adding the key.
   *  Prevents the client from smuggling a different key in. */
  authHeaderName: string
}

/**
 * Model used to validate an NVIDIA NIM key.
 *
 * Must be a model that exists in the LIVE catalogue and that every NVIDIA key
 * can call. NVIDIA's `GET /v1/models` is public (it answers 200 with no key at
 * all), so validation has to spend one real completion: see
 * `app/api/byok/validate/route.ts`.
 *
 * Verified present in https://integrate.api.nvidia.com/v1/models on 2026-10-29.
 * It is also listed in `nvidia-nim.availableModels` — a test asserts that, so
 * the probe can never drift to a slug the UI does not offer.
 */
export const NVIDIA_VALIDATION_MODEL = 'nvidia/nemotron-3.5-bolt-e4b'

/**
 * Fixed allowlist. Changing hosts here is a security decision (SSRF surface) —
 * never derive `baseUrl` from client input.
 */
export const SUPPORTED_PROVIDERS: Record<string, ByokProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    kind: 'proxy',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'proxy',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    auth: { kind: 'x-api-key' },
    authHeaderName: 'x-api-key',
    defaultHeaders: { 'anthropic-version': '2023-06-01' },
  },
  'nvidia-nim': {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    kind: 'proxy',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    // Catalogue + validation probe verified against the LIVE
    // https://integrate.api.nvidia.com/v1/models list on 2026-10-29. The three
    // previous entries (meta/llama-3.1-8b-instruct, meta/llama-3.1-70b-instruct,
    // mistralai/mixtral-8x7b-instruct-v0.1) are retired: llama-3.1-8b returns
    // HTTP 410 (end of life 2026-08-26) and none of them appear in the live
    // list, so every chat attempt failed with "provider returned 410/generic".
    defaultModel: 'nvidia/nemotron-3-super-120b-a12b',
    availableModels: [
      'nvidia/nemotron-3-super-120b-a12b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      'nvidia/nemotron-3.5-bolt-e4b',
      'nvidia/nemotron-nano-3-30b-a3b',
      'openai/gpt-oss-20b',
      'deepseek-ai/deepseek-v4.1-flash',
      'moonshotai/kimi-k2.6',
      'z-ai/glm-5.3-flash',
      'mistralai/mistral-large',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'google/gemma-4-31b-it',
    ],
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'proxy',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o-mini',
    availableModels: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-8b-instruct'],
    freeModels: ['meta-llama/llama-3.1-8b-instruct', 'openai/gpt-4o-mini'],
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    kind: 'proxy',
    baseUrl:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    defaultModel: 'gemini-2.5-pro',
    availableModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    auth: { kind: 'x-goog-api-key' },
    authHeaderName: 'x-goog-api-key',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local Engine)',
    kind: 'clientDirect',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    availableModels: ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5', 'phi3.5'],
    auth: { kind: 'none' },
    authHeaderName: '',
  },
}

/** Resolve a provider by id. Returns undefined if unknown/unsupported. */
export function getProvider(id: string): ByokProvider | undefined {
  return SUPPORTED_PROVIDERS[id]
}
