/**
 * @jest-environment node
 *
 * Feature A "zero-server storage" vault (lib/byok/vault.ts). The module is
 * CLIENT-ONLY (Web Crypto + IndexedDB), so these tests run in node with an
 * in-memory fake IndexedDB injected through the __setTestIndexedDB seam.
 * crypto.subtle / crypto.getRandomValues come from node's WebCrypto.
 *
 * Covers: save/get round-trip, tamper detection (AES-GCM auth), delete, has,
 * list, isVaultUnavailable, idbClearAll, resetStorageKey re-derivation.
 */

import {
  saveProviderKey,
  getProviderKey,
  deleteProviderKey,
  hasProviderKey,
  listVaultedProviders,
  idbClearAll,
  isVaultUnavailable,
  resetStorageKey,
  __setTestIndexedDB,
  type VaultRecord,
} from '@/lib/byok/vault'

interface FakeStoreData {
  keyPath?: string
  entries: Map<IDBValidKey, unknown>
}

/**
 * Minimal in-memory IDBFactory driving exactly the surface vault.ts uses:
 * open() with onupgradeneeded/onsuccess, transaction().objectStore(), and
 * get/put/delete/clear/getAllKeys requests. Operates on a shared store map so
 * multiple open() calls (vault opens + closes the DB per op) stay consistent.
 */
class FakeIndexedDB {
  private stores = new Map<string, FakeStoreData>()

  open(name: string, _version?: number): IDBOpenDBRequest {
    const db = new FakeDatabase(this.stores)
    const req = new FakeOpenDBRequest()
    req.result = db as unknown as IDBDatabase
    // Simulate upgradeneeded (first open creates the two object stores, as
    // vault.openDb does), then resolve with the database.
    queueMicrotask(() => {
      if (req.onupgradeneeded) {
        req.onupgradeneeded({} as IDBVersionChangeEvent)
      }
    })
    queueMicrotask(() => {
      if (req.onsuccess) req.onsuccess({} as Event)
    })
    return req as unknown as IDBOpenDBRequest
  }

  /** Test accessor — reach into a store to simulate tampering. */
  storeEntries(storeName: string): Map<IDBValidKey, unknown> {
    let s = this.stores.get(storeName)
    if (!s) {
      s = { entries: new Map() }
      this.stores.set(storeName, s)
    }
    return s.entries
  }

  private FakeDatabase = FakeDatabase
}

class FakeDatabase {
  constructor(private stores: Map<string, FakeStoreData>) {}

  get objectStoreNames(): DOMStringList {
    return {
      contains: (s: string) => this.stores.has(s),
    } as unknown as DOMStringList
  }

  createObjectStore(name: string, opts?: IDBObjectStoreParameters): IDBObjectStore {
    const entry: FakeStoreData = { keyPath: typeof opts?.keyPath === 'string' ? opts.keyPath : undefined, entries: new Map() }
    this.stores.set(name, entry)
    return FakeObjectStore.from(entry)
  }

  transaction(storeName: string, _mode?: IDBTransactionMode): IDBTransaction {
    const store = this.stores.get(storeName) ?? { entries: new Map() }
    if (!this.stores.has(storeName)) this.stores.set(storeName, store)
    return {
      objectStore: () => FakeObjectStore.from(store),
    } as unknown as IDBTransaction
  }

  close(): void {}
}

class FakeObjectStore {
  static from(data: FakeStoreData): IDBObjectStore {
    return new FakeObjectStore(data) as unknown as IDBObjectStore
  }

  private constructor(private data: FakeStoreData) {}

  get(query: IDBValidKey): IDBRequest<unknown> {
    return succeed(this.data.entries.get(query))
  }

  put(value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
    const keyPath = typeof this.data.keyPath === 'string' ? this.data.keyPath : undefined
    const effective = key ?? (keyPath ? (value as Record<string, unknown>)[keyPath] : undefined)
    this.data.entries.set(effective as IDBValidKey, value)
    return succeed(effective as IDBValidKey)
  }

  delete(query: IDBValidKey): IDBRequest<undefined> {
    this.data.entries.delete(query)
    return succeed(undefined)
  }

  clear(): IDBRequest<undefined> {
    this.data.entries.clear()
    return succeed(undefined)
  }

  getAllKeys(): IDBRequest<IDBValidKey[]> {
    return succeed([...this.data.entries.keys()])
  }
}

class FakeOpenDBRequest {
  result: IDBDatabase | null = null
  error: DOMException | null = null
  onupgradeneeded: ((ev: IDBVersionChangeEvent) => void) | null = null
  onsuccess: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onblocked: ((ev: Event) => void) | null = null
}

function succeed<T>(result: T): IDBRequest<T> {
  const req = { result, error: null } as unknown as IDBRequest<T>
  queueMicrotask(() => {
    if (req.onsuccess) req.onsuccess({} as Event)
  })
  return req
}

const KEY_ID = 'key-id-1'
const PROVIDER_KEY = 'sk-ant-api03-secret-abcdefghijklmnopqrstuvwxyz-1234567890'

describe('byok vault (AD-3 zero-server storage)', () => {
  let idb: FakeIndexedDB

  beforeEach(() => {
    idb = new FakeIndexedDB()
    __setTestIndexedDB(idb as unknown as IDBFactory)
    resetStorageKey()
  })

  afterEach(() => {
    __setTestIndexedDB(null)
  })

  it('saves a key as base64 ciphertext that never contains the raw key', async () => {
    const record = await saveProviderKey(KEY_ID, PROVIDER_KEY)

    expect(record.keyId).toBe(KEY_ID)
    expect(record.ciphertext).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(record.iv).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(record.salt).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(record.createdAt).toBeTruthy()
    expect(JSON.stringify(record)).not.toContain(PROVIDER_KEY)
    expect(record.ciphertext).not.toContain(PROVIDER_KEY)
  })

  it('round-trips the provider key on demand (save → get)', async () => {
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    expect(await getProviderKey(KEY_ID)).toBe(PROVIDER_KEY)
  })

  it('stores only ciphertext in IndexedDB — never the raw key', async () => {
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    const stored = idb.storeEntries('vault').get(KEY_ID) as VaultRecord
    expect(stored.ciphertext).toBeTruthy()
    expect(stored.ciphertext).not.toContain(PROVIDER_KEY)
    expect(JSON.stringify(stored)).not.toContain(PROVIDER_KEY)
  })

  it('returns null for a key that was never saved', async () => {
    expect(await getProviderKey('missing')).toBeNull()
  })

  it('detects a tampered ciphertext (AES-GCM authenticity)', async () => {
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    const stored = idb.storeEntries('vault').get(KEY_ID) as VaultRecord
    const bytes = Buffer.from(stored.ciphertext, 'base64')
    bytes[0] = (bytes[0]! ^ 0xff) & 0xff
    stored.ciphertext = bytes.toString('base64')

    await expect(getProviderKey(KEY_ID)).rejects.toThrow()
  })

  it('hasProviderKey reflects presence', async () => {
    expect(await hasProviderKey(KEY_ID)).toBe(false)
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    expect(await hasProviderKey(KEY_ID)).toBe(true)
    await deleteProviderKey(KEY_ID)
    expect(await hasProviderKey(KEY_ID)).toBe(false)
  })

  it('deleteProviderKey removes the ciphertext (get → null)', async () => {
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    await deleteProviderKey(KEY_ID)
    expect(await getProviderKey(KEY_ID)).toBeNull()
  })

  it('lists every stored provider id, keyed by BYOK metadata id', async () => {
    expect(await listVaultedProviders()).toEqual([])

    await saveProviderKey('k1', PROVIDER_KEY)
    await saveProviderKey('k2', PROVIDER_KEY)
    const listed = await listVaultedProviders()
    expect(listed.sort()).toEqual(['k1', 'k2'])
  })

  it('idbClearAll wipes secret and vault stores', async () => {
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    expect(await hasProviderKey(KEY_ID)).toBe(true)

    await idbClearAll()
    expect(await hasProviderKey(KEY_ID)).toBe(false)
    expect(await listVaultedProviders()).toEqual([])

    // A fresh device secret is minted and the new key still round-trips.
    resetStorageKey()
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    expect(await getProviderKey(KEY_ID)).toBe(PROVIDER_KEY)
  })

  it('resetStorageKey forces re-derivation from the stored device secret', async () => {
    await saveProviderKey(KEY_ID, PROVIDER_KEY)
    resetStorageKey()
    // Same stored secret ⇒ still decryptable after a forget/re-derive cycle.
    expect(await getProviderKey(KEY_ID)).toBe(PROVIDER_KEY)
  })

  it('reports unavailable and rejects when IndexedDB is missing', async () => {
    __setTestIndexedDB(null)
    await expect(saveProviderKey(KEY_ID, PROVIDER_KEY)).rejects.toThrow(/IndexedDB is not available/)
    expect(isVaultUnavailable()).toBe(true)
  })
})