/**
 * @jest-environment node
 */
import { GET } from '@/app/api/stock-price/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({ data: [], error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      }),
    },
  })),
})

describe('GET /api/stock-price', () => {
  // Mock fetch implementations
  const cryptoPrice = { json: async () => ({ bitcoin: { usd: 45000 } }) }
  const twelvedataPrice = { json: async () => ({ price: '150.25' }) }
  const yahooPrice = { json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 2800 } }] } }) }

  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/stock-price')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when symbol missing', async () => {
    const req = new NextRequest('http://localhost/api/stock-price?symbol=', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid symbol', async () => {
    const req = new NextRequest('http://localhost/api/stock-price?symbol=invalid!', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns crypto price from CoinGecko', async () => {
    ;(global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({ json: async () => ({ bitcoin: { usd: 45000 } }) })
    ))

    const req = new NextRequest('http://localhost/api/stock-price?symbol=BTC', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.symbol).toBe('BTC')
    expect(json.source).toBe('coingecko')
    expect(json.type).toBe('crypto')
  })

  it('stock price falls back to TwelveData', async () => {
    ;(global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({}) })) // crypto null
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({ price: '150.25' }) })) // twelvedata
    )

    const req = new NextRequest('http://localhost/api/stock-price?symbol=AAPL', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.source).toBe('twelvedata')
    expect(json.type).toBe('stock')
  })

  it('yahoo fallback when crypto and twelvedata fail', async () => {
    ;(global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({}) })) // crypto null
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({}) })) // twelvedata null
      .mockImplementationOnce(() =>
        Promise.resolve({ json: async () => ({ chart: { result: [{ meta: { regularMarketPrice: 2800 } }] } } }))
      ) // yahoo
    )

    const req = new NextRequest('http://localhost/api/stock-price?symbol=GOOG', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    const json = await res.json()
    expect(json.source).toBe('yahoo')
    expect(json.type).toBe('stock')
  })

  it('returns 500 when all providers fail', async () => {
    ;(global.fetch = jest.fn()
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({}) })) // crypto
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({}) })) // twelvedata
      .mockImplementationOnce(() => Promise.resolve({ json: async () => ({}) })) // yahoo
    )

    const req = new NextRequest('http://localhost/api/stock-price?symbol=UNKNOWN', {
      headers: { authorization: 'Bearer token' }
    })
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})