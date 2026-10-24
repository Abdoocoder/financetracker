import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchZakatPrices, type ZakatPrices } from '@/lib/zakat-prices'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data: users, error: userErr } = await supabase
    .from('profiles').select('id, currency').not('currency', 'is', null)
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })

  const cache = new Map<string, ZakatPrices>()
  const distinctCurrencies = [...new Set(users.map(u => u.currency))]
  await Promise.all(distinctCurrencies.map(async (currency) => {
    try {
      const p = await fetchZakatPrices(currency)
      if (p.gold > 0 && p.silver > 0 && p.rate > 0) cache.set(currency, p)
    } catch (err) { console.error(`[zakat-autopilot] prices failed for ${currency}`, err) }
  }))

  let synced = 0, skipped = 0, failed = 0
  for (const u of users) {
    const prices = cache.get(u.currency)
    if (!prices) { skipped++; continue }
    const { error } = await supabase.rpc('sync_zakat_haul_state', {
      p_user_id: u.id, p_gold_price: prices.gold,
      p_silver_price: prices.silver, p_fx_rate: prices.rate,
    })
    if (error) { failed++; console.error(`[zakat-autopilot] user=${u.id}`, error) }
    else synced++
  }
  return NextResponse.json({ synced, skipped, failed, currencies: distinctCurrencies,
    prices_ok: [...cache.keys()],
    prices_missing: distinctCurrencies.filter(c => !cache.has(c)) })
}