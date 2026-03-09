import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') ?? 'SPUS'

  try {
    const key = process.env.TWELVE_DATA_KEY

    // Twelve Data API - رسمي وموثوق
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${key}`,
      { next: { revalidate: 300 } } // cache 5 دقائق
    )

    if (!res.ok) throw new Error(`Twelve Data returned ${res.status}`)

    const data = await res.json()

    if (data.status === 'error') throw new Error(data.message)

    const price = parseFloat(data.price)
    if (isNaN(price)) throw new Error('Invalid price')

    return NextResponse.json({ symbol, price, source: 'twelvedata' })

  } catch (err: any) {
    // fallback: Yahoo Finance كاحتياط
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }
      )
      const data = await res.json()
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (price) return NextResponse.json({ symbol, price, source: 'yahoo_fallback' })
    } catch {}

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
