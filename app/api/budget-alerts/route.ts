import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getLocalNow } from '@/lib/timezone'
import { mapInBatches } from '@/lib/batch'

/** Max concurrent push inserts — keeps FCM/Edge Function fan-out bounded. */
const PUSH_BATCH_SIZE = 5

/** Composite map key for a (user, category) spending bucket. */
const bucketKey = (userId: string, category: string) => `${userId}\u0000${category}`

interface PendingAlert {
  budgetId: string
  userId: string
  threshold: number
  title: string
  message: string
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  if (!verifyCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const localNow = getLocalNow()
  const year = localNow.getUTCFullYear()
  const month = localNow.getUTCMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  // جلب كل الميزانيات للشهر الحالي
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('id, user_id, category, monthly_limit')
    .eq('month', month)
    .eq('year', year)
    .is('deleted_at', null)

  if (budgetsError) {
    console.error('[budget-alerts] budgets query failed:', budgetsError.message)
    return NextResponse.json({ error: 'Failed to load budgets' }, { status: 500 })
  }
  if (!budgets?.length) return NextResponse.json({ ok: true, checked: 0, alerted: 0 })

  // `checked` counts every budget of the month, zero-limit ones included — same
  // contract as before. Zero-limit budgets can never alert, so they are excluded
  // from the spending query instead of being queried and then discarded.
  const checked = budgets.length
  const active = budgets.filter((budget) => Number(budget.monthly_limit) > 0)
  if (!active.length) return NextResponse.json({ ok: true, checked, alerted: 0 })

  // استعلام واحد لكل أزواج (مستخدم، فئة) بدل استعلام لكل ميزانية
  const { data: txs, error: txError } = await supabase
    .from('transactions')
    .select('user_id, category, amount')
    .in('user_id', [...new Set(active.map((budget) => budget.user_id))])
    .in('category', [...new Set(active.map((budget) => budget.category))])
    .eq('type', 'expense')
    .gte('transaction_date', firstDay)
    .lte('transaction_date', lastDay)
    .is('deleted_at', null)

  if (txError) {
    console.error('[budget-alerts] transactions query failed:', txError.message)
    return NextResponse.json({ error: 'Failed to load spending' }, { status: 500 })
  }

  const spentByBucket = new Map<string, number>()
  for (const tx of txs ?? []) {
    const key = bucketKey(tx.user_id, tx.category)
    spentByBucket.set(key, (spentByBucket.get(key) ?? 0) + Number(tx.amount))
  }

  const pending: PendingAlert[] = []
  for (const budget of active) {
    const spent = spentByBucket.get(bucketKey(budget.user_id, budget.category)) ?? 0
    const limit = Number(budget.monthly_limit)
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

    pending.push({ budgetId: budget.id, userId: budget.user_id, threshold, title, message })
  }

  let alerted = 0

  // Batched so a single failing push can't abort the run for everyone else.
  await mapInBatches(pending, PUSH_BATCH_SIZE, async (alert) => {
    // نستخدم نفس fingerprint الذي يولده DB Trigger (check_budget_limits)
    // حتى يتعرف كل منهما على عمل الآخر ويمنع الإرسال المكرر.
    const fingerprint = `budget_${alert.threshold}_${alert.budgetId}_${month}_${year}`
    try {
      const sent = await sendPushToUser(
        alert.userId,
        alert.title,
        alert.message,
        '/dashboard/budgets',
        alert.threshold >= 100 ? 'warning' : 'budget',
        undefined,
        fingerprint
      )
      if (sent > 0) alerted++
    } catch (error) {
      console.error(`[budget-alerts] push failed for budget ${alert.budgetId}:`, error)
    }
  })

  return NextResponse.json({ ok: true, checked, alerted })
}

// POST: تشغيل يدوي للاختبار
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return GET(request)
}
