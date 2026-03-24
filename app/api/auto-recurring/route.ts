import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-send'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManual = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManual) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const dayOfMonth = localNow.getUTCDate()
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayOfMonth).padStart(2,'0')}`
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`

  const { data: templates } = await supabase
    .from('transactions')
    .select('*')
    .eq('is_recurring', true)
    .eq('recurring_day', dayOfMonth)

  if (!templates?.length) return NextResponse.json({ ok: true, processed: 0 })

  let autoCount = 0
  let reminderCount = 0

  for (const tx of templates) {
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
      const emoji = tx.type === 'income' ? 'دخل' : 'مصروف'
      await sendPushToUser(
        tx.user_id,
        `🔔 تذكير: ${tx.category} يستحق اليوم`,
        `${emoji}: ${Number(tx.amount).toFixed(0)} JOD — هل قمت بالدفع؟ سجّله في التطبيق.`,
        '/dashboard/transactions',
        'warning'
      )
      reminderCount++
    }
  }

  return NextResponse.json({ ok: true, auto: autoCount, reminders: reminderCount })
}
