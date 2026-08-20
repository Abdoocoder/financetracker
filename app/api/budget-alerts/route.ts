import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  // جلب كل الميزانيات للشهر الحالي
  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, user_id, category, monthly_limit')
    .eq('month', month)
    .eq('year', year)

  if (!budgets?.length) return NextResponse.json({ ok: true, checked: 0, alerted: 0 })

  let checked = 0
  let alerted = 0

  for (const budget of budgets) {
    checked++

    // مجموع المصاريف لهذه الفئة هذا الشهر
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', budget.user_id)
      .eq('category', budget.category)
      .eq('type', 'expense')
      .gte('transaction_date', firstDay)
      .lte('transaction_date', lastDay)

    const spent = (txs ?? []).reduce((a, t) => a + Number(t.amount), 0)
    const limit = Number(budget.monthly_limit)
    if (limit <= 0) continue

    const pct = (spent / limit) * 100

    // تنبيه عند 80% فأكثر
    if (pct < 80) continue

    const threshold = pct >= 100 ? 100 : 80

    const remaining = Math.max(0, limit - spent)
    const emoji = threshold >= 100 ? '🚨' : '⚠️'
    const title = threshold >= 100
      ? `${emoji} تجاوزت ميزانية ${budget.category}!`
      : `${emoji} ميزانية ${budget.category} وصلت ${pct.toFixed(0)}%`
    const message = threshold >= 100
      ? `أنفقت ${spent.toFixed(0)} من أصل ${limit.toFixed(0)} — تجاوزت الميزانية بـ ${(spent - limit).toFixed(0)}`
      : `أنفقت ${spent.toFixed(0)} من أصل ${limit.toFixed(0)} — تبقى ${remaining.toFixed(0)}`

    // نستخدم نفس fingerprint الذي يولده DB Trigger (check_budget_limits)
    // حتى يتعرف كل منهما على عمل الآخر ويمنع الإرسال المكرر.
    const fingerprint = `budget_${threshold}_${budget.id}_${month}_${year}`
    const sent = await sendPushToUser(
      budget.user_id,
      title,
      message,
      '/dashboard/budgets',
      threshold >= 100 ? 'warning' : 'budget',
      undefined,
      fingerprint
    )

    if (sent > 0) alerted++
  }

  return NextResponse.json({ ok: true, checked, alerted })
}

// POST: تشغيل يدوي للاختبار
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return GET(request)
}
