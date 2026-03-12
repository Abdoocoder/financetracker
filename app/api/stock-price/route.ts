import { NextResponse } from 'next/server'

// خريطة العملات الرقمية الشائعة
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  TRX: 'tron',
}

async function getCryptoPrice(symbol: string): Promise<number | null> {
  const coinId = CRYPTO_IDS[symbol.toUpperCase()]
  if (!coinId) return null
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    )
    const data = await res.json()
    return data?.[coinId]?.usd ?? null
  } catch { return null }
}

async function getStockPrice(symbol: string): Promise<number | null> {
  try {
    const key = process.env.TWELVE_DATA_KEY
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${key}`,
      { next: { revalidate: 300 } }
    )
    const data = await res.json()
    if (data.status === 'error') throw new Error(data.message)
    const price = parseFloat(data.price)
    return isNaN(price) ? null : price
  } catch { return null }
}

async function getStockPriceYahoo(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    const data = await res.json()
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch { return null }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') ?? '').toUpperCase()
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  // ١. جرّب crypto أولاً
  const cryptoPrice = await getCryptoPrice(symbol)
  if (cryptoPrice) {
    return NextResponse.json({ symbol, price: cryptoPrice, source: 'coingecko', type: 'crypto' })
  }

  // ٢. جرّب Twelve Data للأسهم
  const stockPrice = await getStockPrice(symbol)
  if (stockPrice) {
    return NextResponse.json({ symbol, price: stockPrice, source: 'twelvedata', type: 'stock' })
  }

  // ٣. Yahoo كاحتياط
  const yahooPrice = await getStockPriceYahoo(symbol)
  if (yahooPrice) {
    return NextResponse.json({ symbol, price: yahooPrice, source: 'yahoo', type: 'stock' })
  }

  return NextResponse.json({ error: `تعذّر جلب سعر ${symbol}` }, { status: 500 })
}
