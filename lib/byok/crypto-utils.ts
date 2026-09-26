/**
 * Shared crypto utilities (SERVER-ONLY, Feature A).
 * Common Web Crypto helpers used by both envelope.ts and key-rotation.ts.
 * No external dependencies — safe for both modules to import.
 */

export const decoder = new TextDecoder()

/** Copy bytes into a fresh Uint8Array over a plain ArrayBuffer (Web Crypto-safe). */
export function copyToArrayBuffer(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(src.byteLength)
  out.set(src)
  return out
}

/** base64 → a fresh Uint8Array backed by a plain ArrayBuffer (Web Crypto-safe). */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = Buffer.from(b64, 'base64')
  return copyToArrayBuffer(bin)
}

/** Strip PEM armor → DER bytes (base64 body only). */
export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const bytes = Buffer.from(b64, 'base64')
  const out = new Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out.buffer as ArrayBuffer
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