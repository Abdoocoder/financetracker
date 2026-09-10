/**
 * @jest-environment node
 */
import { GET } from '@/app/api/exchange-rate/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ ok: true, headers: {} }),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({ data: [], error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}))

global.fetch = jest.fn()

describe('GET /api/exchange-rate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/exchange-rate')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when auth does not start with Bearer', async () => {
    const req = new NextRequest('http://localhost/api/exchange-rate', {
      headers: { authorization: 'Basic some-token' }
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns rate data on success', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        result: 'ok',
        rates: { USD: 1.35 },
        time_last_update_utc: '2026-01-01T00:00:00Z',
      }),
    } as Response)

    const req = new NextRequest('http://localhost/api/exchange-rate?base=JOD&target=USD', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.base).toBe('JOD')
    expect(json.target).toBe('USD')
    expect(json.rate).toBe(1.35)
    expect(json.time_last_update_utc).toBe('2026-01-01T00:00:00Z')
  })

  it('returns 400 when API returns error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ result: 'error' }),
    } as Response)

    const req = new NextRequest('http://localhost/api/exchange-rate?base=JOD&target=USD', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when fetch throws', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const req = new NextRequest('http://localhost/api/exchange-rate?base=JOD&target=USD', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})