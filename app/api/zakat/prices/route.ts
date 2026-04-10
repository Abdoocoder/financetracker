import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()

const TROY_OZ_TO_GRAM = 31.1035

async function getYahooPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch { return null }
}

async function getFreeGoldPrice(): Promise<{ gold: number; silver: number } | null> {
  try {
    const res = await fetch('https://freegoldapi.com/data/latest.json', { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    return { gold: data.gold, silver: data.silver }
  } catch { return null }
}

async function getExchangeRate(target: string): Promise<number> {
  if (target === 'USD') return 1.0
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/USD`, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data.rates?.[target.toUpperCase()] ?? 1.0
  } catch {
    // Basic fallbacks for common Arab currencies if API fails
    const fallbacks: Record<string, number> = { JOD: 0.709, SAR: 3.75, AED: 3.67, KWD: 0.307, EGP: 48.5 }
    return fallbacks[target.toUpperCase()] ?? 1.0
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const currency = (searchParams.get('currency') ?? 'JOD').toUpperCase()

  try {
    // 1. Fetch data in parallel
    const [goldUsdOz, silverUsdOz, rate] = await Promise.all([
      getYahooPrice('GC=F'),
      getYahooPrice('SI=F'),
      getExchangeRate(currency)
    ])

    let goldLocalGram = goldUsdOz ? (goldUsdOz / TROY_OZ_TO_GRAM) * rate : 0
    let silverLocalGram = silverUsdOz ? (silverUsdOz / TROY_OZ_TO_GRAM) * rate : 0

    // 2. Fallback if Yahoo fails
    if (goldLocalGram === 0 || silverLocalGram === 0) {
      const fallback = await getFreeGoldPrice()
      if (fallback) {
        if (goldLocalGram === 0 && fallback.gold) goldLocalGram = fallback.gold * rate
        if (silverLocalGram === 0 && fallback.silver) silverLocalGram = fallback.silver * rate
      }
    }

    return NextResponse.json({
      gold: parseFloat(goldLocalGram.toFixed(2)),
      silver: parseFloat(silverLocalGram.toFixed(2)),
      rate,
      currency,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
