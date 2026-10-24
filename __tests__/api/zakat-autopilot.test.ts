/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/zakat-autopilot/route'

jest.mock('@/lib/zakat-prices', () => ({
  fetchZakatPrices: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { fetchZakatPrices } from '@/lib/zakat-prices'
import { createAdminClient } from '@/lib/supabase/admin'

const mockFetchZakatPrices = fetchZakatPrices as jest.MockedFunction<typeof fetchZakatPrices>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('/api/zakat-autopilot', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env.CRON_SECRET = originalEnv
  })

  it('returns 401 when cron secret is missing', async () => {
    const req = new NextRequest('http://localhost/api/zakat-autopilot')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when cron secret is wrong', async () => {
    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('syncs both users with live prices when all prices succeed', async () => {
    mockFetchZakatPrices
      .mockResolvedValueOnce({
        gold: 85.5,
        silver: 1.05,
        rate: 0.306,
        currency: 'KWD',
        timestamp: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        gold: 85.5,
        silver: 1.05,
        rate: 0.709,
        currency: 'JOD',
        timestamp: new Date().toISOString(),
      })

    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          not: jest.fn(() => Promise.resolve({
            data: [
              { id: 'user-kwd', currency: 'KWD' },
              { id: 'user-jod', currency: 'JOD' },
            ],
            error: null,
          })),
        })),
      })),
      rpc: mockRpc,
    } as any)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.synced).toBe(2)
    expect(json.skipped).toBe(0)
    expect(json.failed).toBe(0)
    expect(mockRpc).toHaveBeenCalledTimes(2)

    // Verify prices passed to RPC are live (not stale defaults)
    // mockRpc.mock.calls returns [[rpcName, params], ...]
    const calls = mockRpc.mock.calls
    calls.forEach((call) => {
      const args = call[1] // Second argument is the params object
      expect(args.p_gold_price).toBeGreaterThan(0)
      expect(args.p_silver_price).toBeGreaterThan(0)
      expect(args.p_fx_rate).toBeGreaterThan(0)
      // Not the stale defaults: gold=30, silver=0.35, fx=1.0
      expect(args.p_gold_price).not.toBe(30)
      expect(args.p_silver_price).not.toBe(0.35)
      expect(args.p_fx_rate).not.toBe(1.0)
    })
  })

  it('skips user when their currency price fetch fails', async () => {
    mockFetchZakatPrices
      .mockResolvedValueOnce({
        gold: 85.5,
        silver: 1.05,
        rate: 0.306,
        currency: 'KWD',
        timestamp: new Date().toISOString(),
      })
      .mockRejectedValueOnce(new Error('price fetch failed'))

    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          not: jest.fn(() => Promise.resolve({
            data: [
              { id: 'user-kwd', currency: 'KWD' },
              { id: 'user-jod', currency: 'JOD' },
            ],
            error: null,
          })),
        })),
      })),
      rpc: mockRpc,
    } as any)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.synced).toBe(1)
    expect(json.skipped).toBe(1)
    expect(json.failed).toBe(0)
    expect(mockRpc).toHaveBeenCalledTimes(1)
    // Check the second argument (params object) of the RPC call
    expect(mockRpc).toHaveBeenCalledWith('sync_zakat_haul_state', expect.objectContaining({
      p_user_id: 'user-kwd',
    }))
  })

  // --- NEW TESTS: cover new route behavior (price fetching + RPC dispatch) ---

  it('returns 200 with zero counts when there are no users', async () => {
    const mockRpc = jest.fn()
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.synced).toBe(0)
    expect(json.skipped).toBe(0)
    expect(json.failed).toBe(0)
    expect(json.currencies).toEqual([])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns 500 when the profiles query fails', async () => {
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
        }),
      }),
      rpc: jest.fn(),
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(500)
  })

  it('fetches prices once per distinct currency (dedupes shared currencies)', async () => {
    mockFetchZakatPrices.mockResolvedValue({
      gold: 85.5, silver: 1.05, rate: 0.306, currency: 'KWD', timestamp: 'x',
    })
    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { id: 'u1', currency: 'KWD' },
              { id: 'u2', currency: 'KWD' },
              { id: 'u3', currency: 'KWD' },
            ],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    await GET(req)
    expect(mockFetchZakatPrices).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledTimes(3)
  })

  it('fetches prices separately for each distinct currency', async () => {
    mockFetchZakatPrices.mockImplementation(async (currency: string) => ({
      gold: 85.5, silver: 1.05, rate: currency === 'KWD' ? 0.306 : 0.709,
      currency, timestamp: 'x',
    }))
    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { id: 'u1', currency: 'KWD' },
              { id: 'u2', currency: 'JOD' },
              { id: 'u3', currency: 'SAR' },
            ],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    await GET(req)
    expect(mockFetchZakatPrices).toHaveBeenCalledTimes(3)
  })

  it('continues syncing other users when one RPC call fails', async () => {
    mockFetchZakatPrices.mockResolvedValue({
      gold: 85.5, silver: 1.05, rate: 0.306, currency: 'KWD', timestamp: 'x',
    })
    const rpc = jest.fn()
      .mockResolvedValueOnce({ error: { message: 'fail one' } })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { id: 'u1', currency: 'KWD' },
              { id: 'u2', currency: 'KWD' },
              { id: 'u3', currency: 'KWD' },
            ],
            error: null,
          }),
        }),
      }),
      rpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.synced).toBe(2)
    expect(json.failed).toBe(1)
  })

  it('reports prices_ok and prices_missing per currency', async () => {
    mockFetchZakatPrices
      .mockResolvedValueOnce({ gold: 85.5, silver: 1.05, rate: 0.306, currency: 'KWD', timestamp: 'x' })
      .mockRejectedValueOnce(new Error('yahoo down'))
    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { id: 'u1', currency: 'KWD' },
              { id: 'u2', currency: 'JOD' },
            ],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.prices_ok).toContain('KWD')
    expect(json.prices_missing).toContain('JOD')
  })

  it('skips ALL users when every price fetch fails', async () => {
    mockFetchZakatPrices.mockRejectedValue(new Error('network down'))
    const mockRpc = jest.fn()
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { id: 'u1', currency: 'KWD' },
              { id: 'u2', currency: 'JOD' },
            ],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.synced).toBe(0)
    expect(json.skipped).toBe(2)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('treats zero-price response as missing and skips those users', async () => {
    mockFetchZakatPrices.mockResolvedValue({
      gold: 0, silver: 0, rate: 0, currency: 'KWD', timestamp: 'x',
    })
    const mockRpc = jest.fn()
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [{ id: 'u1', currency: 'KWD' }],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.synced).toBe(0)
    expect(json.skipped).toBe(1)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('never passes stale default prices to the RPC', async () => {
    mockFetchZakatPrices.mockResolvedValue({
      gold: 85.5, silver: 1.05, rate: 0.306, currency: 'KWD', timestamp: 'x',
    })
    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [{ id: 'u1', currency: 'KWD' }],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    await GET(req)
    const call = mockRpc.mock.calls[0]
    const params = call[1]
    expect(params.p_gold_price).not.toBe(30)
    expect(params.p_silver_price).not.toBe(0.35)
    expect(params.p_fx_rate).not.toBe(1.0)
    expect(params.p_gold_price).toBe(85.5)
  })

  it('rejects requests with empty Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: '' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('rejects requests with malformed Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns correct currencies list even when some fetches fail', async () => {
    mockFetchZakatPrices
      .mockResolvedValueOnce({ gold: 85, silver: 1, rate: 0.3, currency: 'KWD', timestamp: 'x' })
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ gold: 100, silver: 1.2, rate: 0.7, currency: 'SAR', timestamp: 'x' })
    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [
              { id: 'u1', currency: 'KWD' },
              { id: 'u2', currency: 'JOD' },
              { id: 'u3', currency: 'SAR' },
            ],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.currencies).toEqual(expect.arrayContaining(['KWD', 'JOD', 'SAR']))
    expect(json.currencies).toHaveLength(3)
  })

  it('does not throw when profile currency is null (filtered by query)', async () => {
    mockFetchZakatPrices.mockResolvedValue({
      gold: 85, silver: 1, rate: 0.3, currency: 'KWD', timestamp: 'x',
    })
    const mockRpc = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [{ id: 'u1', currency: 'KWD' }],
            error: null,
          }),
        }),
      }),
      rpc: mockRpc,
    } as unknown as ReturnType<typeof createAdminClient>)

    const req = new NextRequest('http://localhost/api/zakat-autopilot', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })
})