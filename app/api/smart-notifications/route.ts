import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-send'
import { getLessonForStage, determineStage } from '@/lib/daily-lessons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── helpers ──────────────────────────────────────────
function getLocalHour() {
  return new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCHours()
}
function getLocalDay() {
  return new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDay() // 0=Sun,5=Fri
}
function today() {
  const d = new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}
function daysAgo(n: number) {
  const d = new Date(new Date().getTime() + 3 * 60 * 60 * 1000 - n * 86400000)
  return d.toISOString().split('T')[0]
}

// ── 6 ص: تذكير صباحي + ميزانية اليوم ───────────────
async function dailyMorningReminder() {
  const now = new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const day = now.getUTCDate()
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const todayStr = today()
  const daysLeft = new Date(year, month, 0).getDate() - day + 1

  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, monthly_income')
    .gt('monthly_income', 0)
  if (!profiles?.length) return

  for (const p of profiles) {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'
    const income = p.monthly_income ?? 0

    const { data: txData } = await supabase.from('transactions')
      .select('amount, type').eq('user_id', p.id)
      .gte('transaction_date', firstDay).lte('transaction_date', todayStr)
    const spent = (txData ?? []).filter(t => t.type === 'expense')
      .reduce((a, t) => a + Number(t.amount), 0)

    const { data: debts } = await supabase.from('debts')
      .select('monthly_payment').eq('user_id', p.id).eq('is_paid', false)
    const debtTotal = (debts ?? []).reduce((a, d) => a + Number(d.monthly_payment), 0)

    const remaining = income - debtTotal - spent
    const dailySafe = daysLeft > 0 ? Math.max(0, remaining / daysLeft) : 0

    const { count } = await supabase.from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id).eq('transaction_date', todayStr)

    const title = `صباح الخير ${name} 👋`
    const body = (count ?? 0) === 0
      ? `ميزانيتك اليوم: ${dailySafe.toFixed(0)} JOD — سجّل أول مصروف ⚡`
      : `أحسنت! ميزانيتك اليوم: ${dailySafe.toFixed(0)} JOD 💪`

    await sendPushToUser(p.id, title, body, '/dashboard?quick=1', 'morning')
  }
}

// ── 7 ص: تنبيهات ذكية ────────────────────────────────
async function smartAlerts() {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/alerts`
  await fetch(url, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  })
}

// ── 8 ص: راتب تلقائي ─────────────────────────────────
async function autoSalary() {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auto-salary`
  await fetch(url, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  })
}

// ── 9 ص: خصم ديون تلقائي ──────────────────────────────
async function autoDebt() {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auto-debt`
  await fetch(url, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  })
}

// ── 6 م: تذكير مسائي ─────────────────────────────────
async function eveningReminder() {
  const todayStr = today()
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name')
  if (!profiles?.length) return

  for (const p of profiles) {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'
    const { count } = await supabase.from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.id).eq('transaction_date', todayStr)

    const todayCount = count ?? 0
    const title = todayCount === 0
      ? `${name}، لم تسجل اليوم بعد 🤔`
      : `أحسنت ${name}! 💪`
    const body = todayCount === 0
      ? 'هل كان يوماً بدون إنفاق؟ سجّل الآن قبل أن تنسى'
      : `سجّلت ${todayCount} معاملة اليوم. استمر على هذا النهج`

    await sendPushToUser(p.id, title, body, '/dashboard/transactions', 'evening')
  }
}

// ── الجمعة 8 ص: تقرير أسبوعي ────────────────────────
async function weeklyReport() {
  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name')
  if (!profiles?.length) return

  for (const p of profiles) {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'

    const { data: thisWeek } = await supabase.from('transactions')
      .select('amount, category').eq('user_id', p.id).eq('type', 'expense')
      .gte('transaction_date', daysAgo(7)).lte('transaction_date', today())

    const { data: lastWeek } = await supabase.from('transactions')
      .select('amount').eq('user_id', p.id).eq('type', 'expense')
      .gte('transaction_date', daysAgo(14)).lt('transaction_date', daysAgo(7))

    const thisTotal = (thisWeek ?? []).reduce((a, t) => a + Number(t.amount), 0)
    const lastTotal = (lastWeek ?? []).reduce((a, t) => a + Number(t.amount), 0)
    const diff = Math.abs(thisTotal - lastTotal).toFixed(0)

    // أكبر فئة إنفاق
    const catMap: Record<string, number> = {}
    for (const t of thisWeek ?? []) {
      catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount)
    }
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

    const title = `تقرير أسبوعك ${name} 📊`
    let body = lastTotal === 0
      ? `أنفقت هذا الأسبوع: ${thisTotal.toFixed(0)} JOD`
      : thisTotal < lastTotal
        ? `أسبوع أفضل! وفّرت ${diff} JOD مقارنة بالأسبوع الماضي ✅`
        : thisTotal > lastTotal
          ? `أنفقت ${diff} JOD أكثر من الأسبوع الماضي — راجع مصاريفك`
          : `إنفاقك مستقر: ${thisTotal.toFixed(0)} JOD`

    if (topCat) body += ` | أكثر إنفاق: ${topCat[0]}`

    await sendPushToUser(p.id, title, body, '/dashboard', 'weekly')
  }
}


// ── 7 م: توجيه بناء الثروة ────────────────────────────
async function wealthGuidanceAlert() {
  const now = new Date(new Date().getTime() + 3 * 60 * 60 * 1000)
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const todayStr = today()

  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, monthly_income')
    .gt('monthly_income', 0)
  if (!profiles?.length) return

  for (const p of profiles) {
    const name = p.full_name?.split(' ')[0] ?? 'أخي'
    const income = Number(p.monthly_income ?? 0)

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

    // تحديد المرحلة والتوجيه
    let title = ''
    let body = ''
    let url = '/dashboard'

    if (totalDebt > 0 && debtRatio >= 35) {
      // مرحلة سداد الديون
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
      // مرحلة صندوق الطوارئ
      const needed = emergencyTarget - totalSavings
      const monthsToGoal = net > 0 ? Math.ceil(needed / (net * 0.3)) : 0
      title = `🛡️ ${name}، حماية مالك أولاً`
      body = monthsToGoal > 0
        ? `صندوق طوارئك ناقص ${needed.toFixed(0)} JOD — ادخر 30% من فائضك وستصل خلال ${monthsToGoal} شهر`
        : `ابدأ بـ 10 JOD يومياً في صندوق الطوارئ — هذا يغيّر حياتك`
      url = '/dashboard/goals'
    } else if (!isInvesting && net > 50) {
      // مرحلة الاستثمار
      const investAmount = Math.floor(net * 0.2)
      title = `📈 ${name}، فلوسك تنتظر أن تعمل!`
      body = `فائضك ${net.toFixed(0)} JOD — لو استثمرت ${investAmount} JOD شهرياً → ستصبح ${(investAmount * 12 * 10 * 1.07).toFixed(0)} JOD بعد 10 سنوات`
      url = '/dashboard/investments'
    } else if (isInvesting && net > 0) {
      // مرحلة تعظيم الثروة
      const currentInvestPct = income > 0 ? Math.round((net / income) * 100) : 0
      title = `🚀 ${name}، أنت في المسار الصحيح!`
      body = currentInvestPct < 20
        ? `تستثمر ${currentInvestPct}% من دخلك — زيادة 5% فقط ستضيف آلاف الدنانير على المدى البعيد`
        : `ممتاز! تستثمر ${currentInvestPct}% من دخلك — استمر وستحقق الحرية المالية`
      url = '/dashboard/investments'
    } else {
      // توجيه عام
      title = `💰 ${name}، كل دينار يُحسب`
      body = `فائضك هذا الشهر: ${net.toFixed(0)} JOD — لا تتركه بدون هدف، وجّهه للادخار أو الاستثمار`
      url = '/dashboard'
    }

    if (title && body) {
      await sendPushToUser(p.id, title, body, url, 'wealth')
    }

    // ── درس يومي ذكي حسب المرحلة ──
    const txCount = (await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', p.id)).count ?? 0
    const stage = determineStage({
      txCount,
      debtRatio,
      totalSavings,
      emergencyTarget,
      isInvesting,
    })
    const dayOfMonth = now.getUTCDate()
    const lesson = getLessonForStage(stage, dayOfMonth)
    await sendPushToUser(p.id, lesson.title, lesson.body, lesson.url, 'lesson')
  }
}

// ── Main handler ──────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isManual = authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hour = getLocalHour()
  const day = getLocalDay()
  const tasks: string[] = []

  // 6 ص — صباحي + تنبيهات ذكية معاً (تنبيه واحد فقط)
  if (hour === 6) {
    await dailyMorningReminder()
    await smartAlerts()
    tasks.push('morning+alerts')
  }

  // 8 ص — راتب صامت (بدون إشعار)
  if (hour === 8) {
    await autoSalary()
    tasks.push('salary-silent')
  }

  // 9 ص — ديون صامتة (بدون إشعار)
  if (hour === 9) {
    await autoDebt()
    tasks.push('debt-silent')
  }

  // 6 م — مسائي فقط إذا لم يسجل المستخدم اليوم
  if (hour === 18) {
    await eveningReminder()
    tasks.push('evening-if-needed')
  }

  // 7 م — توجيه بناء الثروة
  if (hour === 19) {
    await wealthGuidanceAlert()
    tasks.push('wealth-guidance')
  }

  // الجمعة 8 ص — تقرير أسبوعي (مرة واحدة فقط)
  if (hour === 8 && day === 5) {
    await weeklyReport()
    tasks.push('weekly')
  }

  return NextResponse.json({ ok: true, hour, day, tasks })
}
