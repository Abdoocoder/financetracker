export interface ZakatPrices {
  gold: number
  silver: number
  rate: number
  currency: string
  timestamp: string
}

const TROY_OZ_GRAMS = 31.1034768
const FETCH_TIMEOUT_MS = 8000

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } } as RequestInit & { next?: { revalidate: number } })
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

async function fetchGoldSilverUsdPerGram(): Promise<{ gold: number; silver: number }> {
  const yahoo = 'https://query1.finance.yahoo.com/v8/finance/chart'
  const [goldRaw, silverRaw] = await Promise.all([
    fetchJson(`${yahoo}/GC%3DF?interval=1d&range=1d`),
    fetchJson(`${yahoo}/SI%3DF?interval=1d&range=1d`),
  ])
  const readClose = (raw: unknown): number => {
    const r = raw as { chart?: { result?: Array<{ indicators: { quote: Array<{ close: number[] }> } }> } }
    const c = r?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0]
    return typeof c === 'number' && c > 0 ? c : 0
  }
  const goldOz = readClose(goldRaw)
  const silverOz = readClose(silverRaw)
  if (goldOz <= 0 || silverOz <= 0) {
    const [g, s] = await Promise.all([
      fetchJson('https://api.gold-api.com/price/XAU'),
      fetchJson('https://api.gold-api.com/price/XAG'),
    ])
    const gPrice = (g as { price?: number }).price ?? 0
    const sPrice = (s as { price?: number }).price ?? 0
    if (gPrice <= 0 || sPrice <= 0) throw new Error('all gold/silver sources failed')
    return { gold: gPrice / TROY_OZ_GRAMS, silver: sPrice / TROY_OZ_GRAMS }
  }
  return { gold: goldOz / TROY_OZ_GRAMS, silver: silverOz / TROY_OZ_GRAMS }
}

async function fetchUsdToLocal(currency: string): Promise<number> {
  if (currency === 'USD') return 1
  const raw = await fetchJson('https://open.er-api.com/v6/latest/USD')
  const rates = (raw as { rates?: Record<string, number> }).rates ?? {}
  const r = rates[currency]
  if (typeof r !== 'number' || !isFinite(r) || r <= 0) throw new Error(`no FX rate for ${currency}`)
  return r
}

export async function fetchZakatPrices(currency: string): Promise<ZakatPrices> {
  const code = currency.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) throw new Error(`invalid currency: ${currency}`)
  const [metals, rate] = await Promise.all([fetchGoldSilverUsdPerGram(), fetchUsdToLocal(code)])
  return {
    gold: Math.round(metals.gold * rate * 10000) / 10000,
    silver: Math.round(metals.silver * rate * 10000) / 10000,
    rate: Math.round(rate * 1e6) / 1e6,
    currency: code,
    timestamp: new Date().toISOString(),
  }
}