/**
 * BYOK proxy wire contract (Feature A) — SHARED by web client + server.
 *
 * The web client encrypts the provider key in the browser and ships this
 * envelope to /api/byok/proxy. Design per AD-4 (asymmetric RSA-OAEP envelope)
 * in docs/projects/llm-ecosystem_prd.md:
 *
 *   payload = AES-GCM(provider_api_key, ephemeral_envelope_key)  [12B IV prefixed]
 *   env     = RSA-OAEP(ephemeral_envelope_key, BYOK_RSA_PUBLIC)  // public key only
 *
 * Only the RSA PUBLIC key is ever given to the client (safe to ship in the
 * browser bundle). The server unwraps `env` with its RSA PRIVATE key
 * (BYOK_KEK_ID selects which keypair), decrypts `payload` to recover the
 * provider key IN MEMORY, swaps the auth header, forwards `body` verbatim, and
 * destroys the key + envelope in `finally`. Client also sends `keyId` so the
 * server can pick the matching private key (rotation — AD-4: old keypair
 * retained until all fragments are re-wrapped).
 *
 * Body is passed through base64 and NEVER parsed/rebuilt by the proxy
 * (C2: thin pass-through, provider-native format).
 */

/** Minimal 401/403/429/5xx error shape returned by the proxy. */
export interface ByokProxyError {
  error: string
  /** 'provider' | 'proxy' — tells the client whether the limit came from us (429) or upstream. */
  origin?: 'provider' | 'proxy'
}

export interface ByokProxyRequest {
  /** One of SUPPORTED_PROVIDERS ids — resolves the FIXED upstream (SSRF allowlist). */
  providerId: string
  /** Key-id tag of the keypair whose private key unwraps `env` (rotation). Must match server keyId. */
  keyId: string
  /** base64: the ephemeral AES-256 envelope key, wrapped (RSA-OAEP) under the server RSA public key. */
  env: string
  /** base64: AES-GCM ciphertext of the provider API key, under the envelope key. */
  payload: string
  /** base64: provider-native JSON body — passed through VERBATIM (never parsed). */
  body: string
  /**
   * Optional extra headers to forward (e.g. `anthropic-version`).
   * The auth header is ALWAYS set server-side from the decrypted key and any
   * client-supplied auth header is STRIPPED (never trusted).
   */
  headers?: Record<string, string>
  /** True to relay an SSE stream; proxy sets Content-Type: text/event-stream. */
  stream?: boolean
}

export const BYOK_PROXY_LIMIT_PER_MIN = 30
