import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchZakatPrices } from '@/lib/zakat-prices'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const currency = (req.nextUrl.searchParams.get('currency') ?? 'JOD').toUpperCase()
  const auth = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET
  const isCron = !!cronSecret && auth === `Bearer ${cronSecret}`

  if (!isCron) {
    const supabase = await createClient()
    const token = auth.replace(/^Bearer /, '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const prices = await fetchZakatPrices(currency)
    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    })
  } catch (err) {
    console.error('[zakat/prices]', err)
    return NextResponse.json({ error: 'price fetch failed' }, { status: 502 })
  }
}