import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createAdminClient()

function nextDateAfter(current: string, frequency: string): string {
  const d = new Date(current)
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1); break
    case 'weekly':  d.setDate(d.getDate() + 7); break
    case 'monthly': {
      const day = d.getDate()
      d.setMonth(d.getMonth() + 1)
      // handle month-end edge (e.g. Jan 31 → Feb 28)
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(day, maxDay))
      break
    }
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const dayOfMonth = localNow.getUTCDate()
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayOfMonth).padStart(2,'0')}`
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`

  let autoCount = 0
  let reminderCount = 0

  // ── Loop 1: الجدول القديم (is_recurring على transactions) ──
  const { data: templates } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_recurring', true)
    .eq('recurring_day', dayOfMonth)

  for (const tx of templates ?? []) {
    const { count: existing } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', tx.user_id)
      .eq('is_recurring', false)
      .eq('category', tx.category)
      .eq('amount', tx.amount)
      .eq('description', (tx.description ? `${tx.description} (تلقائي)` : 'معاملة تلقائية'))
      .gte('transaction_date', firstDay)

    if ((existing ?? 0) > 0) continue

    if (tx.recurring_auto !== false) {
      await supabase.from('transactions').insert({
        user_id: tx.user_id,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description ? `${tx.description} (تلقائي)` : 'معاملة تلقائية',
        transaction_date: dateStr,
        is_recurring: false,
      })
      await sendPushToUser(
        tx.user_id,
        `✅ تم تسجيل ${tx.category} تلقائياً`,
        `${tx.type === 'income' ? 'دخل' : 'مصروف'}: ${Number(tx.amount).toFixed(0)} JOD — تم التسجيل تلقائياً 🔄`,
        '/dashboard/transactions',
        'info'
      )
      autoCount++
    } else {
      await sendPushToUser(
        tx.user_id,
        `🔔 تذكير: ${tx.category} يستحق اليوم`,
        `${tx.type === 'income' ? 'دخل' : 'مصروف'}: ${Number(tx.amount).toFixed(0)} JOD — هل قمت بالدفع؟ سجّله في التطبيق.`,
        '/dashboard/transactions',
        'warning'
      )
      reminderCount++
    }
  }

  // ── Loop 2: الجدول الجديد (recurring_transactions) ──
  const { data: recurringList } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true)
    .lte('next_date', dateStr)

  for (const rec of recurringList ?? []) {
    // منع التكرار: هل يوجد معاملة لنفس المصدر اليوم؟
    const { count: dupCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('source_recurring_id', rec.id)
      .eq('transaction_date', dateStr)

    if ((dupCount ?? 0) > 0) {
      // حدّث next_date فقط إذا كانت قديمة
      await supabase.from('recurring_transactions')
        .update({ next_date: nextDateAfter(dateStr, rec.frequency), updated_at: new Date().toISOString() })
        .eq('id', rec.id)
      continue
    }

    await supabase.from('transactions').insert({
      user_id: rec.user_id,
      type: rec.type,
      amount: rec.amount,
      original_amount: rec.amount,
      original_currency: rec.currency,
      exchange_rate: 1,
      category: rec.category,
      description: rec.notes ? `${rec.name} (${rec.notes})` : rec.name,
      transaction_date: dateStr,
      is_recurring: false,
      source_recurring_id: rec.id,
    })

    await supabase.from('recurring_transactions')
      .update({ next_date: nextDateAfter(dateStr, rec.frequency), updated_at: new Date().toISOString() })
      .eq('id', rec.id)

    await sendPushToUser(
      rec.user_id,
      `🔄 ${rec.name} — تم تسجيله تلقائياً`,
      `${rec.type === 'income' ? 'دخل' : 'مصروف'}: ${Number(rec.amount).toFixed(0)} ${rec.currency}`,
      '/dashboard/transactions',
      'info'
    )
    autoCount++
  }

  return NextResponse.json({ ok: true, auto: autoCount, reminders: reminderCount })
}
