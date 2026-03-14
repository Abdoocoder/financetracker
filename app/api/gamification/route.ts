import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── تعريف الشارات ──────────────────────────────────────
const BADGES = [
  // شارات التتبع
  { id: 'first_tx',      icon: '⚡', ar: 'الخطوة الأولى',      en: 'First Step',        points: 10,  check: (s: any) => s.total_transactions >= 1 },
  { id: 'streak_3',      icon: '🔥', ar: '3 أيام متواصلة',     en: '3-Day Streak',      points: 20,  check: (s: any) => s.streak_days >= 3 },
  { id: 'streak_7',      icon: '💪', ar: 'أسبوع كامل',         en: 'Full Week',         points: 50,  check: (s: any) => s.streak_days >= 7 },
  { id: 'streak_30',     icon: '🏆', ar: 'شهر بدون توقف',      en: 'Month Streak',      points: 200, check: (s: any) => s.streak_days >= 30 },
  { id: 'tx_50',         icon: '📝', ar: 'مسجّل نشيط',         en: 'Active Tracker',    points: 30,  check: (s: any) => s.total_transactions >= 50 },
  { id: 'tx_100',        icon: '📊', ar: 'محترف التتبع',        en: 'Tracking Pro',      points: 75,  check: (s: any) => s.total_transactions >= 100 },
  // شارات الادخار
  { id: 'saver_10',      icon: '💰', ar: 'مدخر مبتدئ',         en: 'Beginner Saver',    points: 25,  check: (s: any) => s.savings_rate >= 10 },
  { id: 'saver_20',      icon: '💎', ar: 'مدخر ذكي',           en: 'Smart Saver',       points: 75,  check: (s: any) => s.savings_rate >= 20 },
  { id: 'saver_30',      icon: '👑', ar: 'مدخر محترف',         en: 'Pro Saver',         points: 150, check: (s: any) => s.savings_rate >= 30 },
  // شارات الديون
  { id: 'debt_paid',     icon: '🎉', ar: 'محارب الديون',       en: 'Debt Warrior',      points: 100, check: (s: any) => s.debts_paid >= 1 },
  { id: 'debt_free',     icon: '🦅', ar: 'حر من الديون',       en: 'Debt Free',         points: 500, check: (s: any) => s.total_debt === 0 && s.had_debt },
  // شارات الاستثمار
  { id: 'investor',      icon: '📈', ar: 'مستثمر مبتدئ',       en: 'New Investor',      points: 100, check: (s: any) => s.is_investing },
  { id: 'inv_profit',    icon: '🚀', ar: 'استثمار رابح',        en: 'Profitable Investor', points: 150, check: (s: any) => s.investment_profit > 0 },
  // شارات الثروة
  { id: 'emergency',     icon: '🛡️', ar: 'صندوق الطوارئ',      en: 'Emergency Fund',    points: 200, check: (s: any) => s.has_emergency_fund },
  { id: 'net_positive',  icon: '✨', ar: 'صافي إيجابي',         en: 'Net Positive',      points: 50,  check: (s: any) => s.net_worth > 0 },
]

// ── تحديد المستوى ──────────────────────────────────────
function getLevel(points: number) {
  if (points < 50)   return { level: 1, title_ar: '🌱 مبتدئ',        title_en: '🌱 Beginner',       next: 50 }
  if (points < 150)  return { level: 2, title_ar: '🔥 متتبع',         title_en: '🔥 Tracker',        next: 150 }
  if (points < 350)  return { level: 3, title_ar: '💪 مدخر',          title_en: '💪 Saver',          next: 350 }
  if (points < 700)  return { level: 4, title_ar: '📈 مستثمر',        title_en: '📈 Investor',       next: 700 }
  if (points < 1200) return { level: 5, title_ar: '💎 ثري مبتدئ',     title_en: '💎 Wealth Builder', next: 1200 }
  return               { level: 6, title_ar: '👑 حر مالياً',      title_en: '👑 Financially Free', next: 9999 }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`

    // جلب البيانات
    const [txRes, debtRes, invRes, goalRes, statsRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('type,amount,transaction_date').eq('user_id', user_id),
      supabase.from('debts').select('remaining_amount,is_paid,monthly_payment').eq('user_id', user_id),
      supabase.from('investments').select('shares,avg_buy_price,current_price').eq('user_id', user_id),
      supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user_id),
      supabase.from('user_stats').select('*').eq('id', user_id).single(),
      supabase.from('profiles').select('monthly_income,asset_real_estate,asset_vehicles,asset_jewelry,asset_other').eq('id', user_id).single(),
    ])

    const txs = txRes.data ?? []
    const debts = debtRes.data ?? []
    const investments = invRes.data ?? []
    const goals = goalRes.data ?? []
    const currentStats = statsRes.data
    const profile = profileRes.data

    // حساب الإحصاءات
    const monthIncome = txs.filter(t => t.type === 'income' && t.transaction_date >= firstOfMonth).reduce((a, t) => a + Number(t.amount), 0) || Number(profile?.monthly_income ?? 0)
    const monthExpenses = txs.filter(t => t.type === 'expense' && t.transaction_date >= firstOfMonth).reduce((a, t) => a + Number(t.amount), 0)
    const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0

    const activeDebts = debts.filter(d => !d.is_paid)
    const totalDebt = activeDebts.reduce((a, d) => a + Number(d.remaining_amount), 0)
    const debtsPaid = debts.filter(d => d.is_paid).length
    const hadDebt = debts.length > 0

    const invValue = investments.reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0)
    const invCost = investments.reduce((a, i) => a + Number(i.shares) * Number(i.avg_buy_price), 0)
    const isInvesting = investments.length > 0

    const totalSavings = goals.reduce((a, g) => a + Number(g.current_amount), 0)
    const personalAssets = Number(profile?.asset_real_estate ?? 0) + Number(profile?.asset_vehicles ?? 0) + Number(profile?.asset_jewelry ?? 0) + Number(profile?.asset_other ?? 0)
    const netWorth = personalAssets + invValue + totalSavings - totalDebt
    const emergencyTarget = monthExpenses * 3
    const hasEmergencyFund = totalSavings >= emergencyTarget && emergencyTarget > 0

    // حساب السلسلة
    const uniqueDates = [...new Set(txs.map(t => t.transaction_date))].sort().reverse()
    let streak = 0
    let checkDate = new Date(today)
    for (const date of uniqueDates) {
      const d = new Date(date)
      const diff = Math.floor((checkDate.getTime() - d.getTime()) / 86400000)
      if (diff <= 1) { streak++; checkDate = d }
      else break
    }

    const stats = {
      total_transactions: txs.length,
      streak_days: streak,
      savings_rate: savingsRate,
      debts_paid: debtsPaid,
      total_debt: totalDebt,
      had_debt: hadDebt,
      is_investing: isInvesting,
      investment_profit: invValue - invCost,
      has_emergency_fund: hasEmergencyFund,
      net_worth: netWorth,
    }

    // حساب الشارات المكتسبة
    const existingBadges: string[] = currentStats?.badges ?? []
    const newBadges: string[] = []
    let newPoints = currentStats?.total_points ?? 0

    for (const badge of BADGES) {
      if (!existingBadges.includes(badge.id) && badge.check(stats)) {
        newBadges.push(badge.id)
        newPoints += badge.points

        // إضافة إنجاز في التنبيهات
        await supabase.from('alerts').insert({
          user_id,
          type: 'achievement',
          frequency: 'once',
          title: `${badge.icon} ${badge.ar}`,
          message: `حصلت على شارة "${badge.ar}" وكسبت ${badge.points} نقطة! 🎉`,
          is_read: false,
          is_active: true,
        })
      }
    }

    const allBadges = [...existingBadges, ...newBadges]
    const levelInfo = getLevel(newPoints)

    // تحديث user_stats
    await supabase.from('user_stats').upsert({
      id: user_id,
      streak_days: streak,
      last_activity_date: today,
      total_points: newPoints,
      level: levelInfo.level,
      badges: allBadges,
      updated_at: now.toISOString(),
    })

    return NextResponse.json({
      streak,
      points: newPoints,
      level: levelInfo,
      badges: allBadges,
      new_badges: newBadges,
      stats,
    })
  } catch (err) {
    console.error('Gamification error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  if (!user_id) return NextResponse.json(null)

  const { data } = await supabase.from('user_stats').select('*').eq('id', user_id).single()
  if (!data) return NextResponse.json({ streak: 0, points: 0, level: 1, badges: [] })

  const levelInfo = getLevel(data.total_points ?? 0)
  return NextResponse.json({ ...data, levelInfo })
}
