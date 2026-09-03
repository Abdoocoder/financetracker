/**
 * BYOK envelope decryption (SERVER-ONLY, Feature A).
 *
 * Per AD-4 (asymmetric correction): the client sends
 *   payload = AES-GCM(provider_api_key, ephemeral_envelope_key)   [12B IV prefixed]
 *   env     = RSA-OAEP(ephemeral_envelope_key, BYOK_RSA_PUBLIC)   (public key)
 * with keyId tagging which RSA keypair wrapped `env` (BYOK_KEK_ID) so the server
 * can select the matching private key during additive rotation.
 *
 * The server:
 *   1. unwraps the ephemeral envelope key from `env` with its RSA **private** key
 *      (RSA-OAEP, SHA-256),
 *   2. decrypts `payload` to recover the provider key (AES-GCM),
 *   3. returns it — the caller MUST destroy it in `finally`.
 *
 * The RSA private key is a PEM (PKCS#8) held in env (Vercel secret), NEVER in
 * DB/disk. Only the matching PUBLIC key is ever distributed to clients (it is
 * safe to ship in the browser bundle). The provider key never touches DB/disk
 * (AD-3).
 *
 * SERVER-ONLY: imports Node's global Web Crypto. Do not import into client code.
 */

const PRIVATE_KEY_PEM = process.env.BYOK_PRIVATE_KEY ?? ''
const KEK_ID = process.env.BYOK_KEK_ID ?? ''

if (typeof window !== 'undefined') {
  throw new Error('lib/byok/envelope.ts is server-only. Never import it in client code.')
}
if (!PRIVATE_KEY_PEM) {
  console.error('[byok/envelope] BYOK_PRIVATE_KEY is not set in this environment.')
}
if (!KEK_ID) {
  console.error('[byok/envelope] BYOK_KEK_ID is not set in this environment.')
}

const decoder = new TextDecoder()

/** base64 → a fresh Uint8Array backed by a plain ArrayBuffer (Web Crypto-safe). */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = Buffer.from(b64, 'base64')
  return copyToArrayBuffer(bin)
}

/** Copy bytes into a fresh Uint8Array over a plain ArrayBuffer (Web Crypto-safe). */
function copyToArrayBuffer(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(src.byteLength)
  out.set(src)
  return out
}

/** Strip PEM armor → DER bytes (base64 body only). */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bytes = Buffer.from(b64, 'base64')
  const out = new Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out.buffer as ArrayBuffer
}

/** Import the RSA private key once (PKCS#8, RSA-OAEP SHA-256). */
let keyPromise: Promise<CryptoKey> | null = null
function getPrivateKey(): Promise<CryptoKey> {
  if (!PRIVATE_KEY_PEM) throw new Error('BYOK_PRIVATE_KEY is not configured.')
  if (!keyPromise) {
    // lib typings for RsaOaepParams omit `hash`; intersect to include it.
    const rsaOaep: RsaOaepParams & { hash: AlgorithmIdentifier } = { name: 'RSA-OAEP', hash: 'SHA-256' }
    keyPromise = crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(PRIVATE_KEY_PEM),
      rsaOaep,
      false, // non-extractable — the private key can never be exported
      ['unwrapKey']
    )
  }
  return keyPromise
}

/**
 * Unwrap `env` (RSA-OAEP, using the server's RSA private key) to recover the
 * ephemeral AES-GCM envelope key, then decrypt `payload` (AES-GCM — 12-byte IV
 * prefixed) to recover the provider key.
 *
 * Returns the RAW provider key bytes as a UTF-8 string (ASCII keys such as
 * sk-..., nvapi-..., xai-... are the norm) for easy header injection. Callers
 * must destructively zero any buffers they control in `finally` (@see zeroBytes).
 *
 * Throws on wrong keyId, tampering (RSA-OAEP/AES-GCM auth), or malformed input.
 */
export async function unwrapProviderKey(
  keyId: string,
  envB64: string,
  payloadB64: string
): Promise<string> {
  if (keyId !== KEK_ID) {
    // Rotation: if the tag doesn't match the CURRENT keypair, keep old private
    // keys around until fragments are re-wrapped (AD-4). v1 ships one keypair,
    // so a mismatch is a hard failure rather than a silent fallback.
    throw new Error(`Unsupported BYOK keyId: ${keyId} (expected ${KEK_ID || '(unset)'})`)
  }

  const privKey = await getPrivateKey()
  const wrapped = base64ToBytes(envB64)

  let envelopeKey: CryptoKey
  try {
    const rsaOaep: RsaOaepParams & { hash: AlgorithmIdentifier } = { name: 'RSA-OAEP', hash: 'SHA-256' }
    envelopeKey = await crypto.subtle.unwrapKey(
      'raw',
      wrapped as BufferSource,
      privKey,
      rsaOaep,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
  } catch (err) {
    throw new Error(`Envelope unwrap failed (bad key or tampered envelope): ${(err as Error).message}`)
  }

  const encrypted = base64ToBytes(payloadB64)
  // Layout: [12-byte IV][ciphertext] — the client prepends its AES-GCM IV.
  const iv = copyToArrayBuffer(encrypted.slice(0, 12))
  const ct = copyToArrayBuffer(encrypted.slice(12))

  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      envelopeKey,
      ct as BufferSource
    )
  } catch (err) {
    throw new Error(`Provider key decryption failed (tampered payload): ${(err as Error).message}`)
  } finally {
    // The envelope key is no longer needed — release it immediately.
    zeroBytes(wrapped)
    zeroBytes(encrypted)
  }

  const keyBytes = new Uint8Array(plaintext)
  const key = decoder.decode(keyBytes)
  zeroBytes(keyBytes)
  return key
}

/** Zero a Uint8Array in place so the secret doesn't linger in memory. */
export function zeroBytes(bytes: Uint8Array | ArrayBuffer): void {
  try {
    const view = bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes as ArrayBuffer)
    view.fill(0)
  } catch {
    /* best-effort — ignore */
  }
}

/** Whether the RSA private key env is configured (short-circuit 500 early). */
export function isKekConfigured(): boolean {
  return Boolean(PRIVATE_KEY_PEM && KEK_ID)
}
