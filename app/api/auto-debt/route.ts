import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function processAutoDebts() {
  const now = new Date()
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const dayOfMonth = localNow.getUTCDate()
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayOfMonth).padStart(2,'0')}`

  // جلب كل الديون التي auto_deduct=true ويوم الدفع = اليوم
  const { data: debts } = await supabase
    .from('debts')
    .select('id, user_id, name, monthly_payment, remaining_amount, payment_day')
    .eq('auto_deduct', true)
    .eq('is_paid', false)
    .eq('payment_day', dayOfMonth)
    .gt('remaining_amount', 0)

  if (!debts?.length) return 0

  let count = 0
  for (const debt of debts) {
    // تحقق إن ما في دفعة لهذا الشهر مسبقاً
    const { count: existing } = await supabase
      .from('debt_payments')
      .select('id', { count: 'exact', head: true })
      .eq('debt_id', debt.id)
      .gte('payment_date', `${year}-${String(month).padStart(2,'0')}-01`)

    if ((existing ?? 0) > 0) continue

    const payment = Math.min(debt.monthly_payment, debt.remaining_amount)
    const newRemaining = Math.max(0, debt.remaining_amount - payment)
    const isPaid = newRemaining === 0

    // إضافة سجل الدفعة
    await supabase.from('debt_payments').insert({
      debt_id: debt.id,
      amount: payment,
      payment_date: dateStr,
      notes: 'دفعة تلقائية',
    })

    // تحديث المبلغ المتبقي
    await supabase.from('debts').update({
      remaining_amount: newRemaining,
      is_paid: isPaid,
      updated_at: new Date().toISOString(),
    }).eq('id', debt.id)

    // إضافة معاملة مصروف
    await supabase.from('transactions').insert({
      user_id: debt.user_id,
      type: 'expense',
      amount: payment,
      category: 'ديون',
      description: `دفعة ${debt.name} (تلقائي)`,
      transaction_date: dateStr,
    })

    // تنبيه للمستخدم
    await supabase.from('alerts').insert({
      user_id: debt.user_id,
      type: isPaid ? 'achievement' : 'info',
      title: isPaid ? `🎉 تم سداد ${debt.name} بالكامل!` : `💳 دفعة ${debt.name} تلقائية`,
      message: isPaid
        ? `مبروك! أنهيت سداد دين "${debt.name}" بالكامل.`
        : `تم خصم ${payment.toFixed(0)} JOD من دين "${debt.name}". المتبقي: ${newRemaining.toFixed(0)} JOD`,
      frequency: 'once',
      is_read: false,
      is_active: true,
    })

    count++
  }
  return count
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManualCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManualCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await processAutoDebts()
  return NextResponse.json({ ok: true, processed: count })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const now = new Date()
    const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const year = localNow.getUTCFullYear()
    const month = localNow.getUTCMonth() + 1
    const day = localNow.getUTCDate()
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`

    const { data: debts } = await supabase
      .from('debts')
      .select('id, name, monthly_payment, remaining_amount')
      .eq('user_id', user.id)
      .eq('auto_deduct', true)
      .eq('is_paid', false)
      .gt('remaining_amount', 0)

    if (!debts?.length) return NextResponse.json({ ok: false, message: 'لا توجد ديون مفعّل عليها الخصم التلقائي' })

    let count = 0
    for (const debt of debts) {
      const { count: existing } = await supabase
        .from('debt_payments')
        .select('id', { count: 'exact', head: true })
        .eq('debt_id', debt.id)
        .gte('payment_date', `${year}-${String(month).padStart(2,'0')}-01`)

      if ((existing ?? 0) > 0) continue

      const payment = Math.min(debt.monthly_payment, debt.remaining_amount)
      const newRemaining = Math.max(0, debt.remaining_amount - payment)

      await supabase.from('debt_payments').insert({
        debt_id: debt.id, amount: payment,
        payment_date: dateStr, notes: 'دفعة تلقائية',
      })
      await supabase.from('debts').update({
        remaining_amount: newRemaining,
        is_paid: newRemaining === 0,
        updated_at: new Date().toISOString(),
      }).eq('id', debt.id)
      await supabase.from('transactions').insert({
        user_id: user.id, type: 'expense', amount: payment,
        category: 'ديون', description: `دفعة ${debt.name} (تلقائي)`,
        transaction_date: dateStr,
      })
      count++
    }

    return NextResponse.json({ ok: true, message: `تم معالجة ${count} دفعة تلقائية ✅` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
