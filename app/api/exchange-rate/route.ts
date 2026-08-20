import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const CURRENCY_RE = /^[A-Z]{3}$/

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

  if (!CURRENCY_RE.test(base) || !CURRENCY_RE.test(target)) {
    return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      next: { revalidate: 3600 }
    })
    const data = await res.json()

    if (data.result === 'error') {
      return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 })
    }

    const rate = data.rates[target]
    if (!rate) {
      return NextResponse.json({ error: 'Invalid currency code' }, { status: 404 })
    }

    return NextResponse.json({ base, target, rate, time_last_update_utc: data.time_last_update_utc })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch exchange rate' }, { status: 500 })
  }
}
