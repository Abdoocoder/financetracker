import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

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
  const supabase = createAdminClient()
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
    .select('id,user_id,type,amount,category,description,recurring_auto')
    .eq('is_recurring', true)
    .eq('recurring_day', dayOfMonth)

  if ((templates ?? []).length > 0) {
    const templateUserIds = [...new Set(templates!.map(tx => tx.user_id))]
    const { data: existingThisMonth } = await supabase
      .from('transactions')
      .select('user_id,category,amount,description')
      .in('user_id', templateUserIds)
      .eq('is_recurring', false)
      .gte('transaction_date', firstDay)

    const existingSet = new Set(
      (existingThisMonth ?? []).map(t => `${t.user_id}|${t.category}|${t.amount}|${t.description}`)
    )

    const toInsert1: Record<string, unknown>[] = []
    const pushTasks1: Promise<unknown>[] = []

    for (const tx of templates!) {
      const autoDesc = tx.description ? `${tx.description} (تلقائي)` : 'معاملة تلقائية'
      if (existingSet.has(`${tx.user_id}|${tx.category}|${tx.amount}|${autoDesc}`)) continue

      if (tx.recurring_auto !== false) {
        toInsert1.push({
          user_id: tx.user_id, type: tx.type, amount: tx.amount,
          category: tx.category, description: autoDesc,
          transaction_date: dateStr, is_recurring: false,
        })
        pushTasks1.push(sendPushToUser(
          tx.user_id,
          `✅ تم تسجيل ${tx.category} تلقائياً`,
          `${tx.type === 'income' ? 'دخل' : 'مصروف'}: ${Number(tx.amount).toFixed(0)} JOD — تم التسجيل تلقائياً 🔄`,
          '/dashboard/transactions', 'info'
        ))
        autoCount++
      } else {
        pushTasks1.push(sendPushToUser(
          tx.user_id,
          `🔔 تذكير: ${tx.category} يستحق اليوم`,
          `${tx.type === 'income' ? 'دخل' : 'مصروف'}: ${Number(tx.amount).toFixed(0)} JOD — هل قمت بالدفع؟ سجّله في التطبيق.`,
          '/dashboard/transactions', 'warning'
        ))
        reminderCount++
      }
    }

    if (toInsert1.length > 0) await supabase.from('transactions').insert(toInsert1)
    await Promise.allSettled(pushTasks1)
  }

  // ── Loop 2: الجدول الجديد (recurring_transactions) ──
  const { data: recurringList } = await supabase
    .from('recurring_transactions')
    .select('id,user_id,type,amount,currency,category,name,notes,frequency')
    .eq('is_active', true)
    .lte('next_date', dateStr)

  if ((recurringList ?? []).length > 0) {
    const recurringIds = recurringList!.map(r => r.id)
    const { data: existingToday } = await supabase
      .from('transactions')
      .select('source_recurring_id')
      .in('source_recurring_id', recurringIds)
      .eq('transaction_date', dateStr)

    const dupSet = new Set((existingToday ?? []).map(t => t.source_recurring_id))
    const updatedAt = new Date().toISOString()

    const toInsert2: Record<string, unknown>[] = []
    const updateTasks: Promise<unknown>[] = []
    const pushTasks2: Promise<unknown>[] = []

    for (const rec of recurringList!) {
      const nextDate = nextDateAfter(dateStr, rec.frequency)
      updateTasks.push(
        Promise.resolve(
          supabase.from('recurring_transactions')
            .update({ next_date: nextDate, updated_at: updatedAt })
            .eq('id', rec.id)
        )
      )

      if (dupSet.has(rec.id)) continue

      toInsert2.push({
        user_id: rec.user_id, type: rec.type, amount: rec.amount,
        original_amount: rec.amount, original_currency: rec.currency,
        exchange_rate: 1, category: rec.category,
        description: rec.notes ? `${rec.name} (${rec.notes})` : rec.name,
        transaction_date: dateStr, is_recurring: false, source_recurring_id: rec.id,
      })
      pushTasks2.push(sendPushToUser(
        rec.user_id,
        `🔄 ${rec.name} — تم تسجيله تلقائياً`,
        `${rec.type === 'income' ? 'دخل' : 'مصروف'}: ${Number(rec.amount).toFixed(0)} ${rec.currency}`,
        '/dashboard/transactions', 'info'
      ))
      autoCount++
    }

    await Promise.allSettled([
      toInsert2.length > 0 ? supabase.from('transactions').insert(toInsert2) : Promise.resolve(),
      ...updateTasks,
      ...pushTasks2,
    ])
  }

  return NextResponse.json({ ok: true, auto: autoCount, reminders: reminderCount })
}
