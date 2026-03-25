import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCronAuth } from '@/lib/cron-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function calcScore(income: number, expenses: number, totalDebt: number, invValue: number, goalsSaved: number, txCount: number): number {
  let score = 0
  const savingsRate = income > 0 ? (income - expenses) / income : 0
  if (savingsRate >= 0.2) score += 30
  else if (savingsRate >= 0.1) score += 20
  else if (savingsRate > 0) score += 10

  const debtRatio = income > 0 ? totalDebt / (income * 12) : 1
  if (debtRatio === 0) score += 25
  else if (debtRatio < 0.3) score += 20
  else if (debtRatio < 0.6) score += 10

  const emergencyRatio = income > 0 ? goalsSaved / (income * 3) : 0
  if (emergencyRatio >= 1) score += 20
  else if (emergencyRatio >= 0.5) score += 12
  else if (emergencyRatio > 0) score += 6

  if (invValue > 0) score += 15

  if (txCount >= 10) score += 10
  else if (txCount >= 5) score += 6
  else if (txCount > 0) score += 3

  return Math.min(score, 100)
}

async function snapshotScores(userId?: string) {
  const today = new Date().toISOString().split('T')[0]
  const query = supabase.from('profiles').select('id, monthly_income')
  const { data: profiles } = userId ? await query.eq('id', userId) : await query
  if (!profiles?.length) return 0

  let saved = 0
  for (const profile of profiles) {
    const uid = profile.id
    const income = Number(profile.monthly_income ?? 0)
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [txRes, debtRes, invRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('type,amount').eq('user_id', uid).gte('transaction_date', firstDay),
      supabase.from('debts').select('remaining_amount').eq('user_id', uid).eq('is_paid', false),
      supabase.from('investments').select('shares,current_price').eq('user_id', uid),
      supabase.from('savings_goals').select('current_amount').eq('user_id', uid),
    ])

    const txs = txRes.data ?? []
    const txIncome = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const effectiveIncome = txIncome > 0 ? txIncome : income
    const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const totalDebt = (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0)
    const invValue = (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0)
    const goalsSaved = (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0)
    const score = calcScore(effectiveIncome, expenses, totalDebt, invValue, goalsSaved, txs.length)

    await supabase.from('health_score_history').upsert({
      user_id: uid,
      score,
      income: effectiveIncome,
      expenses,
      total_debt: totalDebt,
      inv_value: invValue,
      goals_saved: goalsSaved,
      recorded_at: today,
    }, { onConflict: 'user_id,recorded_at' })
    saved++
  }
  return saved
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = request.nextUrl.searchParams.get('userId') ?? undefined
  const saved = await snapshotScores(userId)
  return NextResponse.json({ ok: true, saved })
}
