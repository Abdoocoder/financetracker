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
})