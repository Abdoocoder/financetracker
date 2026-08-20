import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function snapshotScores(userId?: string) {
  const supabase = createAdminClient()
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
    
    // Use the centralized database logic for the score
    const { data: score } = await supabase.rpc('calculate_health_score', { p_user_id: uid })

    await supabase.from('health_score_history').upsert({
      user_id: uid,
      score: score || 0,
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
  const rawId = request.nextUrl.searchParams.get('userId')
  const userId = rawId && UUID_RE.test(rawId) ? rawId : undefined
  const saved = await snapshotScores(userId)
  return NextResponse.json({ ok: true, saved })
}
