/**
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true })
  })
})