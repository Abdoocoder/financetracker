import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { verifyCronAuth } from '@/lib/cron-auth'
import { getLocalNow, getZonedHourFromLocalNow, isLocalMorningHour } from '@/lib/timezone'
import { determineStage, getLessonForStage } from '@/lib/daily-lessons'

export const runtime = 'nodejs'
export const maxDuration = 120

async function wealthGuidanceAlert() {
  const now = getLocalNow()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const todayStr = now.toISOString().split('T')[0]

  const supabase = createAdminClient()
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, monthly_income, lang, timezone')
    .gt('monthly_income', 0)
  if (!profiles?.length) return

  await Promise.allSettled(profiles.map(async (p) => {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'
    const income = Number(p.monthly_income ?? 0)
    const userLang: 'ar' | 'en' = p.lang === 'en' ? 'en' : 'ar'

    const [txRes, debtRes, invRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('amount,type').eq('user_id', p.id)
        .gte('transaction_date', firstDay).lte('transaction_date', todayStr),
      supabase.from('debts').select('remaining_amount,monthly_payment,name')
        .eq('user_id', p.id).eq('is_paid', false),
      supabase.from('investments').select('shares,current_price').eq('user_id', p.id),
      supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', p.id),
    ])

    const expenses = (txRes.data ?? []).filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const actualIncome = (txRes.data ?? []).filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const net = (actualIncome || income) - expenses
    const totalDebt = (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0)
    const monthlyDebt = (debtRes.data ?? []).reduce((a, d) => a + Number(d.monthly_payment), 0)
    const isInvesting = (invRes.data ?? []).length > 0
    const totalSavings = (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0)
    const debtRatio = income > 0 ? (monthlyDebt / income) * 100 : 0
    const emergencyTarget = expenses * 3

    let title = ''
    let body = ''
    let url = '/dashboard'

    if (totalDebt > 0 && debtRatio >= 35) {
      const smallestDebt = (debtRes.data ?? []).sort((a, b) => Number(a.remaining_amount) - Number(b.remaining_amount))[0]
      const extra = Math.max(0, net - monthlyDebt)
      if (smallestDebt && extra > 0) {
        const months = Math.ceil(Number(smallestDebt.remaining_amount) / (Number(smallestDebt.monthly_payment) + extra))
        title = `💡 ${name}، خطوة واحدة تغيّر كل شيء`
        body = `لو أضفت ${extra.toFixed(0)} JOD على قسط "${smallestDebt.name}" → ستسدده في ${months} شهر فقط!`
        url = '/dashboard/debts'
      } else {
        title = `🎯 ${name}، ركّز على الديون الآن`
        body = `نسبة ديونك ${debtRatio.toFixed(0)}% من دخلك — سدادها سيحرر ${monthlyDebt.toFixed(0)} JOD شهرياً للأبد`
        url = '/dashboard/debts'
      }
    } else if (totalSavings < emergencyTarget) {
      const needed = emergencyTarget - totalSavings
      const monthsToGoal = net > 0 ? Math.ceil(needed / (net * 0.3)) : 0
      title = `🛡️ ${name}، حماية مالك أولاً`
      body = monthsToGoal > 0
        ? `صندوق طوارئك ناقص ${needed.toFixed(0)} JOD — ادخر 30% من فائضك وستصل خلال ${monthsToGoal} شهر`
        : `ابدأ بـ 10 JOD يومياً في صندوق الطوارئ — هذا يغيّر حياتك`
      url = '/dashboard/goals'
    } else if (!isInvesting && net > 50) {
      const investAmount = Math.floor(net * 0.2)
      title = `📈 ${name}، فلوسك تنتظر أن تعمل!`
      body = `فائضك ${net.toFixed(0)} JOD — لو استثمرت ${investAmount} JOD شهرياً → ستصبح ${(investAmount * 12 * 10 * 1.07).toFixed(0)} JOD بعد 10 سنوات`
      url = '/dashboard/investments'
    } else if (isInvesting && net > 0) {
      const currentInvestPct = income > 0 ? Math.round((net / income) * 100) : 0
      title = `🚀 ${name}، أنت في المسار الصحيح!`
      body = currentInvestPct < 20
        ? `تستثمر ${currentInvestPct}% من دخلك — زيادة 5% فقط ستضيف آلاف الدنانير على المدى البعيد`
        : `ممتاز! تستثمر ${currentInvestPct}% من دخلك — استمر وستحقق الحرية المالية`
      url = '/dashboard/investments'
    } else {
      title = `💰 ${name}، كل دينار يُحسب`
      body = `فائضك هذا الشهر: ${net.toFixed(0)} JOD — لا تتركه بدون هدف، وجّهه للادخار أو الاستثمار`
      url = '/dashboard'
    }

    if (title && body) {
      await sendPushToUser(p.id, title, body, url, 'wealth')
    }

    const txCount = (await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', p.id)).count ?? 0
    const stage = determineStage({
      txCount,
      debtRatio,
      totalSavings,
      emergencyTarget,
      isInvesting,
    })
    const dayOfMonth = now.getUTCDate()
    const lesson = getLessonForStage(stage, dayOfMonth, userLang)
    await sendPushToUser(p.id, lesson.title, lesson.body, lesson.url, 'lesson')
  }))
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await wealthGuidanceAlert()
  return NextResponse.json({ ok: true })
}