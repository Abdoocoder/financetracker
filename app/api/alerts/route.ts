import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function alreadyExists(userId: string, title: string, withinHours = 20): Promise<boolean> {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('alerts').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('title', title).gte('created_at', since)
  return (count ?? 0) > 0
}

async function pushAlert(list: Record<string, unknown>[], userId: string, type: string, title: string, message: string, withinHours = 20) {
  const exists = await alreadyExists(userId, title, withinHours)
  if (!exists) list.push({ user_id: userId, type, title, message, frequency: 'daily', is_read: false, is_active: true })
}

async function generateAlerts(userId?: string) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const dayOfMonth = now.getDate()
  const month = now.getMonth() + 1
  const query = supabase.from('profiles').select('id, monthly_income, full_name')
  const { data: profiles } = userId ? await query.eq('id', userId) : await query
  if (!profiles?.length) return 0
  const toInsert: Record<string, unknown>[] = []
  for (const profile of profiles) {
    const uid = profile.id
    const income = profile.monthly_income ?? 0
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'
    const n = profile.full_name?.split(' ')[0] ?? 'Friend'
    const ar = true
    const firstOfMonth = `${now.getFullYear()}-${String(month).padStart(2,'0')}-01`
    const [txRes, debtRes, invRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('type,amount,transaction_date').eq('user_id', uid).gte('transaction_date', firstOfMonth),
      supabase.from('debts').select('name,remaining_amount,original_amount,monthly_payment').eq('user_id', uid).eq('is_paid', false),
      supabase.from('investments').select('symbol,shares,current_price,avg_buy_price').eq('user_id', uid),
      supabase.from('savings_goals').select('name,current_amount,target_amount').eq('user_id', uid),
    ])
    const txns = txRes.data ?? []
    const debts = debtRes.data ?? []
    const invs = invRes.data ?? []
    const goals = goalRes.data ?? []
    const monthIncome = txns.filter(t => t.type === 'income').reduce((a,t) => a + Number(t.amount), 0)
    const monthExpenses = txns.filter(t => t.type === 'expense').reduce((a,t) => a + Number(t.amount), 0)
    const totalMonthly = debts.reduce((a,d) => a + Number(d.monthly_payment), 0)
    const totalDebt = debts.reduce((a,d) => a + Number(d.remaining_amount), 0)
    const invValue = invs.reduce((a,i) => a + Number(i.shares) * Number(i.current_price), 0)
    const invCost = invs.reduce((a,i) => a + Number(i.shares) * Number(i.avg_buy_price), 0)
    const invPnl = invValue - invCost
    const effectiveIncome = monthIncome || income
    if (effectiveIncome > 0) {
      const ratio = monthExpenses / effectiveIncome
      if (ratio > 0.9) await pushAlert(toInsert, uid, 'warning', ar ? '🚨 تجاوزت 90% من دخلك!' : '🚨 You exceeded 90% of income!', ar ? `مصاريفك ${monthExpenses.toFixed(0)} JOD = ${(ratio*100).toFixed(0)}% من دخلك.` : `Expenses ${monthExpenses.toFixed(0)} JOD = ${(ratio*100).toFixed(0)}% of income.`)
      else if (ratio > 0.75) await pushAlert(toInsert, uid, 'warning', ar ? '⚠️ مصاريفك تجاوزت 75% من دخلك' : '⚠️ Expenses exceeded 75% of income', ar ? `أنفقت ${monthExpenses.toFixed(0)} JOD من أصل ${effectiveIncome.toFixed(0)} JOD.` : `Spent ${monthExpenses.toFixed(0)} JOD of ${effectiveIncome.toFixed(0)} JOD.`)
      else if (ratio < 0.5 && monthExpenses > 0) await pushAlert(toInsert, uid, 'achievement', ar ? '🏆 ادخرت أكثر من 50% من دخلك!' : '🏆 Saved over 50% of income!', ar ? `رائع يا ${name}! مصاريفك فقط ${(ratio*100).toFixed(0)}% من دخلك. استثمر الفائض!` : `Great ${n}! Expenses only ${(ratio*100).toFixed(0)}% of income. Invest the rest!`)
    }
    if (debts.length > 0) {
      if (dayOfMonth >= 23 && dayOfMonth <= 25) await pushAlert(toInsert, uid, 'reminder', ar ? '📅 تذكير: أقساط الشهر القادم' : '📅 Reminder: Next month installments', ar ? `إجمالي أقساطك ${totalMonthly.toFixed(0)} JOD.` : `Total installments: ${totalMonthly.toFixed(0)} JOD.`, 48)
      const nearlyPaid = debts.find(d => { const pct = (Number(d.original_amount) - Number(d.remaining_amount)) / Number(d.original_amount); return pct >= 0.8 && pct < 1 })
      if (nearlyPaid) await pushAlert(toInsert, uid, 'achievement', ar ? `🎯 اقتربت من سداد "${nearlyPaid.name}"!` : `🎯 Almost paid off "${nearlyPaid.name}"!`, ar ? `تبقى فقط ${Number(nearlyPaid.remaining_amount).toFixed(0)} JOD!` : `Only ${Number(nearlyPaid.remaining_amount).toFixed(0)} JOD left!`, 168)
      if (effectiveIncome > 0 && totalDebt > effectiveIncome * 6) await pushAlert(toInsert, uid, 'warning', ar ? '💳 ديونك تجاوزت 6 أضعاف دخلك' : '💳 Debts exceed 6x your income', ar ? `إجمالي ديونك ${totalDebt.toFixed(0)} JOD.` : `Total debts: ${totalDebt.toFixed(0)} JOD.`, 168)
    }
    if (invs.length > 0) {
      if (invPnl > 0) await pushAlert(toInsert, uid, 'achievement', ar ? `📈 محفظتك في المنطقة الخضراء +${(invPnl/invCost*100).toFixed(1)}%` : `📈 Portfolio in the green +${(invPnl/invCost*100).toFixed(1)}%`, ar ? `قيمة محفظتك $${invValue.toFixed(0)} مقابل تكلفة $${invCost.toFixed(0)}.` : `Portfolio value $${invValue.toFixed(0)} vs cost $${invCost.toFixed(0)}.`, 168)
      else if (invPnl < -invCost * 0.1) await pushAlert(toInsert, uid, 'reminder', ar ? '📉 انخفاض مؤقت في محفظتك' : '📉 Temporary portfolio dip', ar ? 'لا تتسرع في البيع — الاستثمار طويل الأمد مصمم لتحمل التذبذبات.' : "Don't rush to sell — long-term investing is designed to weather volatility.", 168)
      if (dayOfMonth <= 3 && [1,4,7,10].includes(month)) await pushAlert(toInsert, uid, 'reminder', ar ? '🗓️ وقت الشراء الربعي لـ SPUS' : '🗓️ Quarterly buy time for SPUS', ar ? 'أضف دفعتك الاستثمارية الربعية للاستفادة من متوسط التكلفة.' : 'Add your quarterly investment to benefit from dollar-cost averaging.', 168)
    }
    if (goals.length > 0) {
      const almostGoal = goals.find(g => { const pct = Number(g.current_amount) / Number(g.target_amount); return pct >= 0.9 && pct < 1 })
      if (almostGoal) await pushAlert(toInsert, uid, 'achievement', ar ? `🎯 كدت تحقق هدف "${almostGoal.name}"!` : `🎯 Almost reached goal "${almostGoal.name}"!`, ar ? `تبقى ${(Number(almostGoal.target_amount) - Number(almostGoal.current_amount)).toFixed(0)} JOD فقط!` : `Only ${(Number(almostGoal.target_amount) - Number(almostGoal.current_amount)).toFixed(0)} JOD left!`, 168)
      const stagnant = goals.find(g => Number(g.current_amount) === 0)
      if (stagnant) await pushAlert(toInsert, uid, 'reminder', ar ? `⏰ هدف "${stagnant.name}" ينتظرك` : `⏰ Goal "${stagnant.name}" is waiting`, ar ? `حتى ${(Number(stagnant.target_amount)*0.01).toFixed(0)} JOD شهرياً يصنع فارقاً.` : `Even ${(Number(stagnant.target_amount)*0.01).toFixed(0)} JOD/month makes a difference.`, 168)
    }
    if (dayOfWeek === 0) {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
      const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('transaction_date', weekAgo.toISOString().split('T')[0])
      if ((count ?? 0) === 0) await pushAlert(toInsert, uid, 'reminder', ar ? '⏰ لم تسجل أي معاملات هذا الأسبوع' : '⏰ No transactions recorded this week', ar ? 'سجّل مصاريفك بانتظام — التتبع اليومي هو أقوى أداة للوعي المالي.' : 'Track your expenses regularly — daily tracking is the most powerful financial awareness tool.', 168)
    }
    const motivations = ar ? [
      { title: '💪 خطوة صغيرة تصنع فارقاً كبيراً', message: `يا ${name}، كل دينار تدخره اليوم هو استثمار في حريتك المالية غداً.` },
      { title: '🌟 الانضباط المالي عادة لا موهبة', message: 'الأثرياء بنوا عادات يومية صغيرة جعلتهم يختلفون.' },
      { title: '📊 راجع ميزانيتك الأسبوع القادم', message: 'خصص 10 دقائق أسبوعياً لمراجعة المصاريف.' },
      { title: '🏦 الادخار أولاً قبل الإنفاق', message: 'ادخر أول 20% من راتبك قبل أي إنفاق.' },
      { title: `⚡ أنت على الطريق الصحيح يا ${name}`, message: 'سداد الديون → صندوق طوارئ → استثمار منتظم. استمر!' },
      { title: '🎯 هدف واحد كل شهر يغير حياتك', message: 'التركيز على هدف واحد أقوى من عشرة أهداف متوازية.' },
      { title: '💡 المعرفة المالية هي أفضل استثمار', message: 'كل دقيقة في تتبع مالك تساوي أضعافها على المدى البعيد.' },
    ] : [
      { title: '💪 Small steps make a big difference', message: `Hey ${n}, every dollar you save today is an investment in tomorrow's financial freedom.` },
      { title: '🌟 Financial discipline is a habit, not a talent', message: 'Wealthy people built small daily habits that set them apart.' },
      { title: '📊 Review your budget next week', message: 'Set aside 10 minutes weekly to review your expenses.' },
      { title: '🏦 Save first, spend later', message: 'Save the first 20% of your income before any spending.' },
      { title: `⚡ You are on the right track ${n}`, message: 'Pay debts → Emergency fund → Regular investment. Keep going!' },
      { title: '🎯 One goal a month changes your life', message: 'Focusing on one goal is more powerful than ten parallel goals.' },
      { title: '💡 Financial knowledge is the best investment', message: 'Every minute tracking your money is worth many times over in the long run.' },
    ]
    for (const mot of motivations) {
      const exists = await alreadyExists(uid, mot.title, 20)
      if (!exists) { toInsert.push({ user_id: uid, type: 'motivation', title: mot.title, message: mot.message, frequency: 'daily', is_read: false, is_active: true }); break }
    }
  }
  if (toInsert.length > 0) {
    await supabase.from('alerts').insert(toInsert)
    const byUser = new Map<string, typeof toInsert>()
    for (const a of toInsert) {
      const uid = a.user_id as string
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push(a)
    }
    for (const [uid, list] of byUser) {
      const title = list.length === 1 ? String(list[0].title) : `🔔 ${list.length} تنبيهات جديدة`
      const message = list.length === 1 ? String(list[0].message).slice(0, 100) : list.map(a => String(a.title)).join(' • ').slice(0, 100)
      await sendPushToUser(uid, title, message, '/dashboard/alerts', 'finance-daily')
    }
  }
  return toInsert.length
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManualCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManualCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await generateAlerts()
  return NextResponse.json({ ok: true, generated: count })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const count = await generateAlerts(user.id)
    return NextResponse.json({ ok: true, generated: count, message: count > 0 ? `✅ تم توليد ${count} تنبيه جديد` : 'ℹ️ لا تنبيهات جديدة — كل شيء محدّث' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
