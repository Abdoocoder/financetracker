/**
 * BYOK LLM proxy — CLIENT (web/browser). Feature A.
 *
 * Produces the exact envelope the server's `envelope.ts` unwraps (AD-4,
 * asymmetric correction):
 *   payload = AES-GCM(provider_api_key, ephemeral_envelope_key)  [12B IV prefixed]
 *   env     = RSA-OAEP(ephemeral_envelope_key, BYOK_RSA_PUBLIC)
 * and POSTs it to `/api/byok/proxy` (session-authenticated cookie).
 *
 * The provider key NEVER leaves the device except AES-GCM-encrypted under an
 * ephemeral key that only the server's RSA private key can unwrap (AD-3).
 *
 * CLIENT-ONLY: uses browser Web Crypto (globalThis.crypto.subtle). Do not import
 * into Node/server code (see lib/byok/envelope.ts for the server side).
 */

import { BYOK_PROXY_LIMIT_PER_MIN, type ByokProxyRequest } from './types'

const RSA_PUBLIC_PEM = process.env.NEXT_PUBLIC_BYOK_PUBLIC_KEY ?? ''
const KEY_ID = process.env.NEXT_PUBLIC_BYOK_KEK_ID ?? ''

const IV_BYTES = 12

/** bytes → base64 (browser-safe). */
function b64FromBytes(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

/** base64 → Uint8Array (browser-safe). */
function bytesFromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Strip PEM armor → DER bytes (SPKI for a public key). */
function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  return bytesFromB64(b64)
}

/** Import the server's RSA public key (SPKI) once. Safe to cache — public. */
let pubKeyPromise: Promise<CryptoKey> | null = null
export function getPublicKey(publicKeyPem: string = RSA_PUBLIC_PEM): Promise<CryptoKey> {
  if (!publicKeyPem) throw new Error('NEXT_PUBLIC_BYOK_PUBLIC_KEY is not configured.')
  if (!pubKeyPromise) {
    pubKeyPromise = crypto.subtle.importKey(
      'spki',
      pemToBytes(publicKeyPem).buffer as ArrayBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['wrapKey']
    )
  }
  return pubKeyPromise
}

export interface Envelope {
  env: string
  payload: string
  keyId: string
}

/**
 * Build the AD-4 envelope for `providerKey` so only the server can recover it.
 *
 * @param providerKey the raw provider API key (UTF-8)
 * @param keyId       BYOK keypair id tag (defaults to NEXT_PUBLIC_BYOK_KEK_ID)
 */
export async function buildEnvelope(
  providerKey: string,
  keyId: string = KEY_ID
): Promise<Envelope> {
  if (!keyId) throw new Error('BYOK keyId is not configured on the client.')
  const providerKeyBytes = new TextEncoder().encode(providerKey)

  // 1. Ephemeral AES-GCM envelope key — extractable (needed so wrapKey can
  //    export it raw). Lives only in memory for this request.
  const envelopeKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — required to wrap to raw under the RSA public key
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  )

  // 2. env = RSA-OAEP(envelope key, server RSA public key)
  const pubKey = await getPublicKey()
  // lib typings for RsaOaepParams omit `hash`; intersect to include it.
  const rsaOaep: RsaOaepParams & { hash: AlgorithmIdentifier } = { name: 'RSA-OAEP', hash: 'SHA-256' }
  const wrappedRaw = await crypto.subtle.wrapKey(
    'raw',
    envelopeKey,
    pubKey,
    rsaOaep
  )

  // 3. payload = [12-byte IV][AES-GCM(provider_key, envelope key)]
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    envelopeKey,
    providerKeyBytes as BufferSource
  )

  const payload = new Uint8Array(IV_BYTES + ct.byteLength)
  payload.set(iv, 0)
  payload.set(new Uint8Array(ct), IV_BYTES)

  return {
    env: b64FromBytes(new Uint8Array(wrappedRaw)),
    payload: b64FromBytes(payload),
    keyId,
  }
}

export interface ByokChatOptions {
  providerId: string
  providerKey: string
  /** Base64 of the provider-native JSON body (or a plain object to be JSON-stringified). */
  body: string | object
  /** Non-auth extra headers (e.g. anthropic-version). Auth is injected server-side. */
  headers?: Record<string, string>
  /** SSE streaming? Controls the accept header on the proxy. */
  stream?: boolean
  signal?: AbortSignal
  keyId?: string
}

/**
 * Encrypt the provider key and forward a chat request through the proxy.
 * Returns the raw `Response` so the caller can consume it (JSON or SSE stream).
 */
export async function byokChat(options: ByokChatOptions): Promise<Response> {
  const bodyB64 =
    typeof options.body === 'string'
      ? options.body
      : b64FromBytes(new TextEncoder().encode(JSON.stringify(options.body)))

  const envelope = await buildEnvelope(options.providerKey, options.keyId)

  const req: ByokProxyRequest = {
    providerId: options.providerId,
    keyId: envelope.keyId,
    env: envelope.env,
    payload: envelope.payload,
    body: bodyB64,
    headers: options.headers,
    stream: options.stream ?? false,
  }

  return fetch('/api/byok/proxy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal: options.signal,
    // Session cookie rides along automatically.
    credentials: 'same-origin',
  })
}

export { BYOK_PROXY_LIMIT_PER_MIN }
