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
  auth: ProviderAuth
  /** Extra headers to always add (e.g. anthropic-version). Overridden by the request if present. */
  defaultHeaders?: Record<string, string>
  /** Header name to REMOVE from the forwarded request before adding the key.
   *  Prevents the client from smuggling a different key in. */
  authHeaderName: string
}

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
    defaultModel: 'gpt-5.4-mini',
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'proxy',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    auth: { kind: 'x-api-key' },
    authHeaderName: 'x-api-key',
    defaultHeaders: { 'anthropic-version': '2023-06-01' },
  },
  'nvidia-nim': {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    kind: 'proxy',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'proxy',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'auto',
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
    auth: { kind: 'x-goog-api-key' },
    authHeaderName: 'x-goog-api-key',
  },
}

/** Resolve a provider by id. Returns undefined if unknown/unsupported. */
export function getProvider(id: string): ByokProvider | undefined {
  return SUPPORTED_PROVIDERS[id]
}
