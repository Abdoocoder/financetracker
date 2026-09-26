/**
 * BYOK Key Rotation Manager (SERVER-ONLY, Feature A).
 *
 * Manages multiple RSA keypairs for additive key rotation.
 * - Current key (BYOK_KEK_ID + BYOK_PRIVATE_KEY) — used for new envelopes
 * - Previous keys (BYOK_PREVIOUS_KEYS JSON) — kept for decrypting old fragments
 *
 * Rotation flow:
 * 1. Generate new RSA keypair
 * 2. Add old key to BYOK_PREVIOUS_KEYS with its keyId
 * 3. Set new key as current (BYOK_KEK_ID + BYOK_PRIVATE_KEY)
 * 4. Run re-wrap script to migrate stored fragments (if any stored server-side)
 * 5. Clients automatically use new keyId on next request
 *
 * Client envelope format includes keyId so server knows which private key to use.
 */

import { base64ToBytes, copyToArrayBuffer, zeroBytes, pemToArrayBuffer } from './crypto-utils'

const decoder = new TextDecoder()

const PREVIOUS_KEYS_JSON = process.env.BYOK_PREVIOUS_KEYS ?? '[]'

if (typeof window !== 'undefined') {
  throw new Error('lib/byok/key-rotation.ts is server-only. Never import it in client code.')
}

interface KekEntry {
  keyId: string
  privateKeyPem: string
  createdAt: string // ISO timestamp
  deprecatedAt?: string
}

let previousKeysCache: KekEntry[] | null = null

function parsePreviousKeys(): KekEntry[] {
  if (previousKeysCache) return previousKeysCache
  try {
    const parsed = JSON.parse(PREVIOUS_KEYS_JSON)
    if (Array.isArray(parsed)) {
      previousKeysCache = parsed
      return parsed
    }
  } catch {
    // ignore parse errors
  }
  previousKeysCache = []
  return []
}

function getAllPrivateKeys(): Map<string, string> {
  const map = new Map<string, string>()

  // Current key
  const currentKeyId = process.env.BYOK_KEK_ID ?? ''
  const currentPrivateKey = process.env.BYOK_PRIVATE_KEY ?? ''
  if (currentKeyId && currentPrivateKey) {
    map.set(currentKeyId, currentPrivateKey)
  }

  // Previous keys
  for (const entry of parsePreviousKeys()) {
    if (entry.keyId && entry.privateKeyPem) {
      map.set(entry.keyId, entry.privateKeyPem)
    }
  }

  return map
}

/** Get the current keyId (for clients to use when building envelopes). */
export function getCurrentKeyId(): string {
  return process.env.BYOK_KEK_ID ?? ''
}

/** Check if a keyId is valid (current or previous). */
export function isValidKeyId(keyId: string): boolean {
  return getAllPrivateKeys().has(keyId)
}

/** Get private key PEM for a given keyId (current or previous). */
export function getPrivateKeyForKeyId(keyId: string): string | undefined {
  return getAllPrivateKeys().get(keyId)
}

/** Import a private key (PKCS#8) for use with Web Crypto. */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const rsaOaep: RsaOaepParams & { hash: AlgorithmIdentifier } = { name: 'RSA-OAEP', hash: 'SHA-256' }
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bytes = Buffer.from(b64, 'base64')
  const arr = new Uint8Array(bytes.byteLength)
  arr.set(bytes)
  return crypto.subtle.importKey('pkcs8', arr.buffer, rsaOaep, false, ['unwrapKey'])
}

/** Unwrap envelope using the appropriate private key for the keyId. */
export async function unwrapProviderKeyWithRotation(
  keyId: string,
  envB64: string,
  payloadB64: string
): Promise<string> {
  const privateKeyPem = getPrivateKeyForKeyId(keyId)
  if (!privateKeyPem) {
    throw new Error(`Unsupported BYOK keyId: ${keyId} (no private key available)`)
  }

  const privKey = await importPrivateKey(privateKeyPem)
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
    zeroBytes(wrapped)
    zeroBytes(encrypted)
  }

  const keyBytes = new Uint8Array(plaintext)
  const key = decoder.decode(keyBytes)
  zeroBytes(keyBytes)
  return key
}