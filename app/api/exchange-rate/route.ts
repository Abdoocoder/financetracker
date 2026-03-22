import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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
