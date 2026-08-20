import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

async function processAutoDebts() {
  const supabase = createAdminClient()
  const now = new Date()
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const dayOfMonth = localNow.getUTCDate()
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayOfMonth).padStart(2,'0')}`

  // جلب كل الديون التي auto_deduct=true ويوم الدفع = اليوم
  const { data: debts } = await supabase
    .from('debts')
    .select('id, user_id, name, monthly_payment, remaining_amount, payment_day, debt_type')
    .eq('auto_deduct', true)
    .eq('is_paid', false)
    .eq('payment_day', dayOfMonth)
    .gt('remaining_amount', 0)


  // ── الديون اليدوية (auto_deduct = false) ──
  const { data: manualDebts } = await supabase
    .from('debts')
    .select('id, user_id, name, monthly_payment, remaining_amount, payment_day')
    .eq('auto_deduct', false)
    .eq('is_paid', false)
    .eq('payment_day', dayOfMonth)
    .gt('remaining_amount', 0)

  if (manualDebts?.length) {
    for (const debt of manualDebts) {
      // تحقق إن ما في دفعة لهذا الشهر عبر الـ UNIQUE index
      const { count: existing } = await supabase
        .from('debt_payments')
        .select('id', { count: 'exact', head: true })
        .eq('debt_id', debt.id)
        .gte('payment_date', `${year}-${String(month).padStart(2,'0')}-01`)

      // إذا دفع بالفعل → لا ترسل إشعار (هنا لا نُدرج شيئاً فالتحقق للإشعار فقط)
      if ((existing ?? 0) > 0) continue

      // أرسل إشعار تذكير
      await sendPushToUser(
        debt.user_id,
        `💳 قسط ${debt.name} يستحق اليوم`,
        `المبلغ: ${debt.monthly_payment.toFixed(0)} JOD — هل قمت بالدفع؟ افتح التطبيق لتسجيله.`,
        '/dashboard/debts',
        'debt-reminder'
      )

      // إضافة تنبيه داخل التطبيق
      await supabase.from('alerts').insert({
        user_id: debt.user_id,
        type: 'warning',
        title: `💳 تذكير: قسط ${debt.name}`,
        message: `قسط ${debt.name} (${debt.monthly_payment.toFixed(0)} JOD) يستحق اليوم — يرجى الدفع وتسجيله في التطبيق.`,
        frequency: 'once',
        is_read: false,
        is_active: true,
      })
    }
  }

  let count = 0
  if (!debts) return NextResponse.json({ success: true, count: 0 })

  for (const debt of debts) {
    const payment = Math.min(debt.monthly_payment, debt.remaining_amount)
    const newRemaining = Math.max(0, debt.remaining_amount - payment)
    const isPaid = newRemaining === 0

    // تحقق يدوي من وجود دفعة تلقائية لهذا الدين في نفس الشهر
    const { count: existingAutoPayment } = await supabase
      .from('debt_payments')
      .select('id', { count: 'exact', head: true })
      .eq('debt_id', debt.id)
      .eq('notes', 'دفعة تلقائية')
      .gte('payment_date', `${year}-${String(month).padStart(2,'0')}-01`)
      .lt('payment_date', `${year}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2,'0')}-01`)

    if ((existingAutoPayment ?? 0) > 0) continue // تم الدفع التلقائي مسبقاً هذا الشهر

    const { error: insertError } = await supabase.from('debt_payments').insert({
      debt_id: debt.id,
      user_id: debt.user_id,
      amount: payment,
      payment_date: dateStr,
      notes: 'دفعة تلقائية',
    })
    if (insertError) throw insertError

    // تحديث المبلغ المتبقي
    await supabase.from('debts').update({
      remaining_amount: newRemaining,
      is_paid: isPaid,
      updated_at: new Date().toISOString(),
    }).eq('id', debt.id)

    // إضافة معاملة (مصروف للديون المستحقة، دخل لاستلام أقساط الديون المقرضة)
    const isReceivable = debt.debt_type === 'receivable'
    await supabase.from('transactions').insert({
      user_id: debt.user_id,
      type: isReceivable ? 'income' : 'expense',
      amount: payment,
      category: 'ديون',
      description: isReceivable
        ? `استلام قسط ${debt.name} (تلقائي)`
        : `دفعة ${debt.name} (تلقائي)`,
      transaction_date: dateStr,
    })

    // إشعار Push
    await sendPushToUser(
      debt.user_id,
      isPaid ? `🎉 تم سداد ${debt.name} بالكامل!` : `💳 تم خصم قسط ${debt.name}`,
      isPaid
        ? `مبروك! أنهيت سداد دين "${debt.name}" بالكامل. إنجاز رائع! 🏆`
        : `تم خصم ${payment.toFixed(0)} JOD تلقائياً. المتبقي: ${newRemaining.toFixed(0)} JOD`,
      '/dashboard/debts',
      isPaid ? 'debt-paid' : 'debt-auto'
    )

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
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await processAutoDebts()
  return NextResponse.json({ ok: true, processed: count })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
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
      .select('id, name, monthly_payment, remaining_amount, debt_type')
      .eq('user_id', user.id)
      .eq('auto_deduct', true)
      .eq('is_paid', false)
      .gt('remaining_amount', 0)

    if (!debts?.length) return NextResponse.json({ ok: false, message: 'لا توجد ديون مفعّل عليها الخصم التلقائي' })

    let count = 0
    for (const debt of debts) {
      const payment = Math.min(debt.monthly_payment, debt.remaining_amount)
      const newRemaining = Math.max(0, debt.remaining_amount - payment)

      // تحقق يدوي من وجود دفعة تلقائية لهذا الدين في نفس الشهر
      const now2 = new Date(now.getTime() + 3 * 60 * 60 * 1000)
      const y2 = now2.getUTCFullYear()
      const m2 = now2.getUTCMonth() + 1
      const { count: existingPay } = await supabase
        .from('debt_payments')
        .select('id', { count: 'exact', head: true })
        .eq('debt_id', debt.id)
        .eq('notes', 'دفعة تلقائية')
        .gte('payment_date', `${y2}-${String(m2).padStart(2,'0')}-01`)
        .lt('payment_date', `${y2}-${String(m2 + 1 > 12 ? 1 : m2 + 1).padStart(2,'0')}-01`)

      if ((existingPay ?? 0) > 0) continue // تم الدفع مسبقاً

      const { error: insertError } = await supabase.from('debt_payments').insert({
        debt_id: debt.id, amount: payment,
        payment_date: dateStr, notes: 'دفعة تلقائية',
      })
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      await supabase.from('debts').update({
        remaining_amount: newRemaining,
        is_paid: newRemaining === 0,
        updated_at: new Date().toISOString(),
      }).eq('id', debt.id)
      const isReceivable = debt.debt_type === 'receivable'
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: isReceivable ? 'income' : 'expense',
        amount: payment,
        category: 'ديون',
        description: isReceivable
          ? `استلام قسط ${debt.name} (تلقائي)`
          : `دفعة ${debt.name} (تلقائي)`,
        transaction_date: dateStr,
      })
      count++
    }

    return NextResponse.json({ ok: true, message: `تم معالجة ${count} دفعة تلقائية ✅` })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
