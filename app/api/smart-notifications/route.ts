import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push-send'

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

  if (hour === 6)  { await dailyMorningReminder(); tasks.push('morning') }
  if (hour === 7)  { await smartAlerts();           tasks.push('alerts') }
  if (hour === 8 && day !== 5) { await autoSalary(); tasks.push('salary') }
  if (hour === 9)  { await autoDebt();              tasks.push('debt') }
  if (hour === 18) { await eveningReminder();        tasks.push('evening') }
  if (hour === 8 && day === 5) { await weeklyReport(); tasks.push('weekly') }

  return NextResponse.json({ ok: true, hour, day, tasks })
}
