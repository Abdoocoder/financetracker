/**
 * @jest-environment node
 */
import { GET } from '@/app/api/byok/config/route'
import { NextRequest } from 'next/server'

const VALID_KEY = 'fjk_live_' + 'a'.repeat(96)

describe('GET /api/byok/config', () => {
  it('returns provider list with v1 scope (ollama, openrouter, nvidia-nim)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.providers).toBeDefined()
    expect(Array.isArray(body.providers)).toBe(true)
    expect(body.providers.length).toBe(3)

    const ids = body.providers.map((p: any) => p.id).sort()
    expect(ids).toEqual(['nvidia-nim', 'ollama', 'openrouter'])
  })

  it('includes keyId and publicKey in response', async () => {
    const res = await GET()
    const body = await res.json()

    expect(body.keyId).toBeDefined()
    expect(body.publicKey).toBeDefined()
  })

  it('each provider has required fields', async () => {
    const res = await GET()
    const body = await res.json()

    for (const p of body.providers) {
      expect(p.id).toBeDefined()
      expect(p.name).toBeDefined()
      expect(p.kind).toBeDefined()
      expect(['proxy', 'clientDirect']).toContain(p.kind)
      expect(p.baseUrl).toBeDefined()
      expect(p.defaultModel).toBeDefined()
      expect(Array.isArray(p.availableModels)).toBe(true)
      expect(p.auth).toBeDefined()
      expect(p.authHeaderName).toBeDefined()
      expect(p.defaultHeaders).toBeDefined()
    }
  })

  it('ollama is clientDirect', async () => {
    const res = await GET()
    const body = await res.json()

    const ollama = body.providers.find((p: any) => p.id === 'ollama')
    expect(ollama).toBeDefined()
    expect(ollama.kind).toBe('clientDirect')
    expect(ollama.auth.kind).toBe('none')
  })

  it('openrouter and nvidia-nim are proxy', async () => {
    const res = await GET()
    const body = await res.json()

    const openrouter = body.providers.find((p: any) => p.id === 'openrouter')
    expect(openrouter).toBeDefined()
    expect(openrouter.kind).toBe('proxy')
    expect(openrouter.auth.kind).toBe('bearer')

    const nvidia = body.providers.find((p: any) => p.id === 'nvidia-nim')
    expect(nvidia).toBeDefined()
    expect(nvidia.kind).toBe('proxy')
    expect(nvidia.auth.kind).toBe('bearer')
  })
})