import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') ?? 'SPUS'

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }, // cache 5 دقائق
      }
    )

    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`)

    const data = await res.json()
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
    const previousClose = data?.chart?.result?.[0]?.meta?.previousClose
    const change = price && previousClose ? ((price - previousClose) / previousClose * 100) : null

    if (!price) throw new Error('Price not found in response')

    return NextResponse.json({ symbol, price, previousClose, changePercent: change })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
