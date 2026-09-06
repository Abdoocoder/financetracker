/**
 * BYOK key vault (Feature A) — CLIENT-ONLY (browser Web Crypto + IndexedDB).
 *
 * Per PRD §4.3: provider API keys are stored ONLY as AES-GCM ciphertext in
 * IndexedDB (never raw, never localStorage, never on the server — AD-3
 * "Zero-Server Storage").
 *
 *   deviceSecret (32B random, created once, kept in IndexedDB) ─┐
 *                                                               ├─ PBKDF2 → storageKey (NON-extractable)
 *   device.salt  (16B random, fixed per device vault) ──────────┘
 *
 * The salt is persisted NEXT TO the secret (single vault record), so the same
 * storageKey is re-derived on every page load — rotating the salt would
 * silently discard all previously stored ciphertext. Each ciphertext record
 * keeps a copy of the salt for self-consistency.
 *
 * The resulting AES-GCM key is NON-extractable and cached in memory for the
 * session, so a script reading IndexedDB only ever sees ciphertext. Nobody —
 * including the Fajrak server — holds a provider key in the clear.
 *
 * Each provider key lives in its own record keyed by the BYOK metadata row
 * `id` (uuid), so a user can store multiple keys per provider and revoking or
 * re-adding one never touches another.
 */

const DB_NAME = 'fajrak-byok'
const DB_VERSION = 1
const SECRET_STORE = 'secret'
const VAULT_STORE = 'vault'
const SECRET_ID = 'deviceSecret'

const SECRET_BYTES = 32
const SALT_BYTES = 16
const IV_BYTES = 12
const PBKDF2_ITERATIONS = 310_000

export interface VaultRecord {
  keyId: string
  iv: string // base64
  salt: string // base64
  ciphertext: string // base64
  createdAt: string
}

// Browsers without IndexedDB (rare/privacy mode) degrade to "no vault".
let idbUnavailable = false

// Test seam — lets tests inject an in-memory IndexedDB factory (Node/jsdom
// environments have no browser IndexedDB). Never set in production paths.
let testIdbFactory: IDBFactory | undefined

/** Test seam: inject a fake IndexedDB factory (pass `null` to restore the ambient global). */
export function __setTestIndexedDB(factory: IDBFactory | null): void {
  testIdbFactory = factory ?? undefined
}

function resolveIndexedDB(): IDBFactory | undefined {
  if (testIdbFactory) return testIdbFactory
  return typeof indexedDB !== 'undefined' ? indexedDB : undefined
}

// ─────────────────────────────────────────────────────────────
// Minimal IndexedDB promise wrappers (no third-party dependency)
// ─────────────────────────────────────────────────────────────
function openDb(): Promise<IDBDatabase> {
  const idb = resolveIndexedDB()
  if (!idb) {
    idbUnavailable = true
    return Promise.reject(new Error('IndexedDB is not available'))
  }
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(SECRET_STORE)) {
        db.createObjectStore(SECRET_STORE)
      }
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE, { keyPath: 'keyId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      // E.g. Safari private mode historically threw SecurityError/QuotaExceeded.
      idbUnavailable = true
      reject(req.error ?? new Error('Failed to open IndexedDB'))
    }
    req.onblocked = () => reject(new Error('IndexedDB blocked by another tab'))
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      const req = fn(tx.objectStore(storeName))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function idbGetMinted(): Promise<{ secret: Uint8Array; salt: Uint8Array } | undefined> {
  try {
    const raw = await withStore(SECRET_STORE, 'readonly', s => s.get(SECRET_ID) as IDBRequest<{ secret: Uint8Array; salt: Uint8Array }>)
    return raw?.secret && raw.salt ? { secret: raw.secret, salt: raw.salt } : undefined
  } catch {
    return undefined
  }
}

async function idbPutMinted(secret: Uint8Array, salt: Uint8Array): Promise<void> {
  await withStore(SECRET_STORE, 'readwrite', s => s.put({ secret, salt }, SECRET_ID))
}

async function idbGetVault(keyId: string): Promise<VaultRecord | undefined> {
  try {
    return await withStore(VAULT_STORE, 'readonly', s => s.get(keyId) as IDBRequest<VaultRecord>)
  } catch {
    return undefined
  }
}

async function idbPutVault(record: VaultRecord): Promise<void> {
  await withStore(VAULT_STORE, 'readwrite', s => s.put(record))
}

async function idbDeleteVault(keyId: string): Promise<void> {
  await withStore(VAULT_STORE, 'readwrite', s => s.delete(keyId))
}

export async function idbClearAll(): Promise<void> {
  await withStore(SECRET_STORE, 'readwrite', s => s.clear())
  await withStore(VAULT_STORE, 'readwrite', s => s.clear())
}

/** True if the vault could not open (private mode / unsupported). */
export function isVaultUnavailable(): boolean {
  return idbUnavailable
}

// ─────────────────────────────────────────────────────────────
// base64 helpers (browser-safe; mirrors lib/byok/client.ts)
// ─────────────────────────────────────────────────────────────
function b64FromBytes(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function bytesFromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ─────────────────────────────────────────────────────────────
// Key derivation (PBKDF2 → AES-GCM, NON-extractable)
// ─────────────────────────────────────────────────────────────

/** Cache the derived key (+ its salt) for the session — non-extractable, memory only. */
let storageKeyPromise: Promise<{ key: CryptoKey; salt: Uint8Array }> | null = null

async function deriveStorageKey(secret: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  // Import the device secret as a raw PBKDF2 base key.
  const baseKey = await crypto.subtle.importKey(
    'raw',
    secret.buffer as ArrayBuffer,
    { name: 'PBKDF2' },
    false, // never extractable
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // NON-extractable (PRD §4.3) — cannot be exported, survives in memory only
    ['encrypt', 'decrypt']
  )
}

/** Create the device secret on first use and cache the derived storage key. */
async function getOrInitStorageKey(): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  if (storageKeyPromise) return storageKeyPromise

  const promise = (async () => {
    const minted = await idbGetMinted()
    // Both secret AND salt are minted once and persisted together. Keeping the
    // salt stable is what lets resetStorageKey() re-derive the same key after a
    // forget; a fresh salt each time would brick every existing ciphertext.
    if (minted) {
      return deriveStorageKey(minted.secret, minted.salt).then(key => ({ key, salt: minted.salt }))
    }
    const secret = crypto.getRandomValues(new Uint8Array(SECRET_BYTES))
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
    await idbPutMinted(secret, salt)
    return deriveStorageKey(secret, salt).then(key => ({ key, salt }))
  })()

  storageKeyPromise = promise
  try {
    return await promise
  } catch (err) {
    storageKeyPromise = null // allow retry on transient IDB failure
    throw err
  }
}

/** Forget the in-memory derived key (e.g. full vault reset). */
export function resetStorageKey(): void {
  storageKeyPromise = null
}

// ─────────────────────────────────────────────────────────────
// Public vault API
// ─────────────────────────────────────────────────────────────

/** Encrypt a provider API key and store the ciphertext in the IndexedDB vault. */
export async function saveProviderKey(keyId: string, providerKey: string): Promise<VaultRecord> {
  const { key, salt } = await getOrInitStorageKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(providerKey).buffer as ArrayBuffer
  )
  const record: VaultRecord = {
    keyId,
    iv: b64FromBytes(iv),
    salt: b64FromBytes(salt),
    ciphertext: b64FromBytes(new Uint8Array(ct)),
    createdAt: new Date().toISOString(),
  }
  await idbPutVault(record)
  return record
}

/**
 * Recover a stored provider key ON DEMAND (returns null when the vault is
 * empty or unavailable). The raw key returns to the caller's memory only —
 * it is never re-persisted.
 */
export async function getProviderKey(keyId: string): Promise<string | null> {
  const record = await idbGetVault(keyId)
  if (!record) return null
  const { key } = await getOrInitStorageKey()
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytesFromB64(record.iv).buffer as ArrayBuffer },
    key,
    bytesFromB64(record.ciphertext).buffer as ArrayBuffer
  )
  return new TextDecoder().decode(pt)
}

/** Remove a key's ciphertext from the vault. */
export async function deleteProviderKey(keyId: string): Promise<void> {
  await idbDeleteVault(keyId)
}

/** Cheap existence check — true when this browser holds ciphertext for keyId. */
export async function hasProviderKey(keyId: string): Promise<boolean> {
  const record = await idbGetVault(keyId)
  return record !== undefined
}

/** List providers that have a decryptable key in this browser's vault. */
export async function listVaultedProviders(): Promise<string[]> {
  const db = await openDb().catch(() => null)
  if (!db) return []
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE, 'readonly')
      const req = tx.objectStore(VAULT_STORE).getAllKeys()
      req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(k => String(k)))
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}