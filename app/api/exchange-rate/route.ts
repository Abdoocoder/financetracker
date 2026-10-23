import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { lookupExchangeRate } from '@/lib/exchange-rate'

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000, identifier: 'exchange-rate' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const base = (searchParams.get('base') || 'JOD').toUpperCase()
  const target = (searchParams.get('target') || 'USD').toUpperCase()

  const result = await lookupExchangeRate(base, target)

  if (!result.ok) {
    if (result.reason === 'upstream_error') {
      return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 })
    }
    if (result.reason === 'unknown_target') {
      return NextResponse.json({ error: 'Invalid currency code' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 })
  }

  return NextResponse.json({
    base: result.base,
    target: result.target,
    rate: result.rate,
    time_last_update_utc: result.lastUpdated,
  })
}
