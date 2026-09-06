/**
 * @jest-environment node
 *
 * Round-trips the AD-4 asymmetric envelope: the CLIENT builds it with only the
 * RSA public key (NEXT_PUBLIC_*), the SERVER unwraps it with the RSA private key
 * (BYOK_*). Modules read their env at load time, so each test re-requires them
 * inside jest.isolateModules with the env it needs.
 */

const KEK_ID = 'kek-test'

let pubPem: string
let privPem: string

function derToPem(label: string, der: ArrayBuffer): string {
  const b64 = Buffer.from(new Uint8Array(der)).toString('base64')
  const lines = b64.match(/.{1,64}/g)?.join('\n') ?? b64
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`
}

beforeAll(async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  )
  pubPem = derToPem('PUBLIC KEY', await crypto.subtle.exportKey('spki', keyPair.publicKey))
  privPem = derToPem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', keyPair.privateKey))
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BYOK_PUBLIC_KEY
  delete process.env.NEXT_PUBLIC_BYOK_KEK_ID
  delete process.env.BYOK_PRIVATE_KEY
  delete process.env.BYOK_KEK_ID
})

function load(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  let client: typeof import('@/lib/byok/client') | undefined
  let envelope: typeof import('@/lib/byok/envelope') | undefined
  jest.isolateModules(() => {
    client = require('@/lib/byok/client')
    envelope = require('@/lib/byok/envelope')
  })
  return { client: client!, envelope: envelope! }
}

const FULL_ENV = {
  NEXT_PUBLIC_BYOK_PUBLIC_KEY: 'set',
  NEXT_PUBLIC_BYOK_KEK_ID: KEK_ID,
  BYOK_PRIVATE_KEY: 'set',
  BYOK_KEK_ID: KEK_ID,
}

describe('AD-4 envelope round-trip', () => {
  it('lets the client encrypt a key the server can recover (public key only on client)', async () => {
    const { client, envelope } = load({ ...FULL_ENV, NEXT_PUBLIC_BYOK_PUBLIC_KEY: pubPem, BYOK_PRIVATE_KEY: privPem })
    const secret = 'sk-ant-my-secret-12345'

    const env = await client.buildEnvelope(secret, KEK_ID)
    expect(env.keyId).toBe(KEK_ID)
    expect(env.env).not.toContain(secret)
    expect(env.payload).not.toContain(secret)

    const recovered = await envelope.unwrapProviderKey(env.keyId, env.env, env.payload)
    expect(recovered).toBe(secret)
  })

  it('rejects a mismatched keyId (rotation tag mismatch)', async () => {
    const { client, envelope } = load({ ...FULL_ENV, NEXT_PUBLIC_BYOK_PUBLIC_KEY: pubPem, BYOK_PRIVATE_KEY: privPem })
    const env = await client.buildEnvelope('k', KEK_ID)
    await expect(envelope.unwrapProviderKey('kek-old', env.env, env.payload)).rejects.toThrow(
      /Unsupported BYOK keyId/
    )
  })

  it('fails on a tampered envelope (RSA-OAEP auth) and a tampered payload (AES-GCM auth)', async () => {
    const { client, envelope } = load({ ...FULL_ENV, NEXT_PUBLIC_BYOK_PUBLIC_KEY: pubPem, BYOK_PRIVATE_KEY: privPem })
    const env = await client.buildEnvelope('k', KEK_ID)

    const badEnv = flipFirstByte(env.env)
    await expect(envelope.unwrapProviderKey(KEK_ID, badEnv, env.payload)).rejects.toThrow(/unwrap failed/)

    const badPayload = flipFirstByte(env.payload)
    await expect(envelope.unwrapProviderKey(KEK_ID, env.env, badPayload)).rejects.toThrow(/decryption failed/)
  })

  it('isKekConfigured reflects configured/unconfigured env', () => {
    const configured = load(FULL_ENV).envelope
    expect(configured.isKekConfigured()).toBe(true)

    const unconfigured = load({
      NEXT_PUBLIC_BYOK_PUBLIC_KEY: undefined,
      NEXT_PUBLIC_BYOK_KEK_ID: undefined,
      BYOK_PRIVATE_KEY: undefined,
      BYOK_KEK_ID: undefined,
    }).envelope
    expect(unconfigured.isKekConfigured()).toBe(false)
  })

  it('throws client-side when the keyId env is missing', async () => {
    const { client } = load({ ...FULL_ENV, NEXT_PUBLIC_BYOK_PUBLIC_KEY: pubPem, NEXT_PUBLIC_BYOK_KEK_ID: undefined })
    await expect(client.buildEnvelope('k')).rejects.toThrow(/BYOK keyId is not configured/)
  })

  it('zeroBytes wipes buffers without throwing on odd inputs', () => {
    const buf = new Uint8Array([1, 2, 3])
    const { envelope } = load(FULL_ENV)
    envelope.zeroBytes(buf)
    expect(Array.from(buf)).toEqual([0, 0, 0])
    expect(() => envelope.zeroBytes(new ArrayBuffer(4))).not.toThrow()
  })
})

function flipFirstByte(b64: string): string {
  const bytes = Buffer.from(b64, 'base64')
  bytes[0] = (bytes[0]! ^ 0xff) & 0xff
  return bytes.toString('base64')
}