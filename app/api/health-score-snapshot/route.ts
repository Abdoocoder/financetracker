import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { mapInBatches } from '@/lib/batch'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Max concurrent `calculate_health_score` RPCs — keeps the Nano-tier pool alive. */
const RPC_BATCH_SIZE = 10

interface SnapshotRow {
  user_id: string
  score: number
  income: number
  expenses: number
  total_debt: number
  inv_value: number
  goals_saved: number
  recorded_at: string
}

/** Groups rows by a key and sums a numeric projection. */
function sumBy<T>(
  rows: readonly T[] | null,
  key: (row: T) => string,
  value: (row: T) => number
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const row of rows ?? []) {
    const k = key(row)
    totals.set(k, (totals.get(k) ?? 0) + value(row))
  }
  return totals
}

async function snapshotScores(userId?: string) {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const profilesQuery = supabase.from('profiles').select('id, monthly_income')
  const { data: profiles, error: profilesError } = userId
    ? await profilesQuery.eq('id', userId)
    : await profilesQuery

  if (profilesError) throw new Error(`profiles query failed: ${profilesError.message}`)
  if (!profiles?.length) return 0

  const userIds = profiles.map((profile) => profile.id)

  // 4 set-based queries for the whole run instead of 4 per user.
  const [txRes, debtRes, invRes, goalRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('user_id,type,amount')
      .in('user_id', userIds)
      .gte('transaction_date', firstDay)
      .is('deleted_at', null),
    supabase
      .from('debts')
      .select('user_id,remaining_amount')
      .in('user_id', userIds)
      .eq('is_paid', false)
      .is('deleted_at', null),
    supabase
      .from('investments')
      .select('user_id,shares,current_price')
      .in('user_id', userIds)
      .is('deleted_at', null),
    supabase
      .from('savings_goals')
      .select('user_id,current_amount')
      .in('user_id', userIds)
      .is('deleted_at', null),
  ])

  // Fail loudly. Writing a zeroed snapshot silently would corrupt score history
  // for every user, which is worse than a failed cron run.
  const failures: Array<[string, { message: string }]> = []
  if (txRes.error) failures.push(['transactions', txRes.error])
  if (debtRes.error) failures.push(['debts', debtRes.error])
  if (invRes.error) failures.push(['investments', invRes.error])
  if (goalRes.error) failures.push(['savings_goals', goalRes.error])
  if (failures.length > 0) {
    throw new Error(
      `batch queries failed: ${failures.map(([table, error]) => `${table}: ${error.message}`).join('; ')}`
    )
  }

  const txByUser = new Map<string, { income: number; expenses: number }>()
  for (const tx of txRes.data ?? []) {
    const entry = txByUser.get(tx.user_id) ?? { income: 0, expenses: 0 }
    const amount = Number(tx.amount)
    if (tx.type === 'income') entry.income += amount
    else if (tx.type === 'expense') entry.expenses += amount
    txByUser.set(tx.user_id, entry)
  }

  const debtByUser = sumBy(debtRes.data, (d) => d.user_id, (d) => Number(d.remaining_amount))
  const invByUser = sumBy(
    invRes.data,
    (i) => i.user_id,
    (i) => Number(i.shares) * Number(i.current_price)
  )
  const goalByUser = sumBy(goalRes.data, (g) => g.user_id, (g) => Number(g.current_amount))

  // The score itself stays owned by the database RPC — never recomputed in JS.
  // TODO: calculate_health_score RPC also needs .is('deleted_at', null) filter on
  // transactions, debts, investments, savings_goals. Add when Supabase recovers.
  const scores = await mapInBatches(profiles, RPC_BATCH_SIZE, async (profile) => {
    const { data, error } = await supabase.rpc('calculate_health_score', {
      p_user_id: profile.id,
    })
    if (error) {
      throw new Error(`calculate_health_score failed for ${profile.id}: ${error.message}`)
    }
    return Number(data ?? 0)
  })

  const rows: SnapshotRow[] = profiles.map((profile, index) => {
    const tx = txByUser.get(profile.id)
    const txIncome = tx?.income ?? 0
    const fallbackIncome = Number(profile.monthly_income ?? 0)

    return {
      user_id: profile.id,
      score: scores[index],
      income: txIncome > 0 ? txIncome : fallbackIncome,
      expenses: tx?.expenses ?? 0,
      total_debt: debtByUser.get(profile.id) ?? 0,
      inv_value: invByUser.get(profile.id) ?? 0,
      goals_saved: goalByUser.get(profile.id) ?? 0,
      recorded_at: today,
    }
  })

  const { error: upsertError } = await supabase
    .from('health_score_history')
    .upsert(rows, { onConflict: 'user_id,recorded_at' })

  if (upsertError) {
    throw new Error(`health_score_history upsert failed: ${upsertError.message}`)
  }

  return rows.length
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rawId = request.nextUrl.searchParams.get('userId')
  const userId = rawId && UUID_RE.test(rawId) ? rawId : undefined

  try {
    const saved = await snapshotScores(userId)
    return NextResponse.json({ ok: true, saved })
  } catch (error) {
    console.error('[health-score-snapshot]', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'snapshot failed' },
      { status: 500 }
    )
  }
}
