import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowMs: 60_000, identifier: 'exchange-rate' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })

  const { searchParams } = new URL(request.url)
  const base = searchParams.get('base') || 'JOD'
  const target = searchParams.get('target') || 'USD'

  try {
    // استخدمنا ER-API لأنه مجاني وسريع ولا يتطلب مفتاح لمثل هذه العمليات البسيطة
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      next: { revalidate: 3600 } // تخزين مؤقت لمدة ساعة
    })
    const data = await res.json()

    if (data.result === 'error') {
      return NextResponse.json({ error: data['error-type'] }, { status: 400 })
    }

    const rate = data.rates[target]
    if (!rate) {
      return NextResponse.json({ error: 'target currency not found' }, { status: 404 })
    }

    return NextResponse.json({
      base,
      target,
      rate,
      time_last_update_utc: data.time_last_update_utc
    })
  } catch (err) {
    return NextResponse.json({ error: 'failed to fetch exchange rate' }, { status: 500 })
  }
}
