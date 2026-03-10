import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MOTIVATIONS = [
  { title: '💪 استمر في المسيرة!', message: 'كل دينار تدخره اليوم هو خطوة نحو الحرية المالية.' },
  { title: '🌟 أنت تسير بالاتجاه الصحيح', message: 'الثبات على الخطة هو السر الحقيقي للنجاح المالي.' },
  { title: '📈 الفائدة المركبة تعمل لصالحك', message: 'استثمارك المنتظم في SPUS يبني ثروة حقيقية على المدى البعيد.' },
  { title: '🎯 ركز على هدفك', message: 'تخلصك من الديون يحررك من أعباء شهرية ويفتح أبواباً جديدة.' },
  { title: '🏆 إنجاز يستحق التقدير', message: 'إدارتك لميزانيتك بوعي تضعك في مصاف 5% الأفضل مالياً.' },
]

const WARNINGS = {
  overspending: { title: '⚠️ تنبيه: مصاريفك تجاوزت 80% من دخلك', message: 'راجع مصاريفك هذا الشهر وحدد ما يمكن تقليله.' },
  noTransactions: { title: '⏰ لم تسجل أي معاملات هذا الأسبوع', message: 'سجّل مصاريفك بانتظام للحصول على صورة دقيقة عن وضعك.' },
  debtDue: { title: '📅 تذكير: موعد دفعة الدين قريب', message: 'تأكد من توفر المبلغ اللازم لدفعة هذا الشهر.' },
  investmentTime: { title: '📈 حان وقت شراء SPUS', message: 'مرت 3 أشهر — حان وقت إضافة دفعتك الاستثمارية الربعية.' },
}

async function generateAlerts(userId?: string) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const dayOfMonth = now.getDate()
  const month = now.getMonth() + 1

  // جلب المستخدمين — إما مستخدم محدد أو الكل
  const query = supabase.from('profiles').select('id, monthly_income')
  const { data: profiles } = userId
    ? await query.eq('id', userId)
    : await query

  if (!profiles || profiles.length === 0) return 0

  const alertsToInsert: Record<string, unknown>[] = []

  for (const profile of profiles) {
    // تحفيز يومي
    const motivation = MOTIVATIONS[dayOfMonth % MOTIVATIONS.length]
    alertsToInsert.push({
      user_id: profile.id,
      type: 'motivation',
      frequency: 'daily',
      title: motivation.title,
      message: motivation.message,
      is_read: false,
      is_active: true,
    })

    // أسبوعي: الإثنين — لا معاملات هذا الأسبوع
    if (dayOfWeek === 1) {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('transaction_date', weekAgo.toISOString().split('T')[0])

      if ((count ?? 0) === 0) {
        alertsToInsert.push({
          user_id: profile.id,
          type: 'reminder',
          frequency: 'weekly',
          title: WARNINGS.noTransactions.title,
          message: WARNINGS.noTransactions.message,
          is_read: false,
          is_active: true,
        })
      }
    }

    // شهري: أول الشهر
    if (dayOfMonth === 1) {
      const lastMonth = new Date(now)
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const { data: txns } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', profile.id)
        .gte('transaction_date', lastMonth.toISOString().split('T')[0])
        .lt('transaction_date', now.toISOString().split('T')[0])

      if (txns) {
        const income = txns.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0) || profile.monthly_income
        const expenses = txns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
        if (income > 0 && expenses / income > 0.8) {
          alertsToInsert.push({
            user_id: profile.id,
            type: 'warning',
            frequency: 'monthly',
            title: WARNINGS.overspending.title,
            message: `${WARNINGS.overspending.message} (مصاريفك: ${expenses.toFixed(0)} JOD = ${((expenses / income) * 100).toFixed(0)}% من دخلك)`,
            is_read: false,
            is_active: true,
          })
        }
      }

      // ربعي: يناير، أبريل، يوليو، أكتوبر
      if ([1, 4, 7, 10].includes(month)) {
        alertsToInsert.push({
          user_id: profile.id,
          type: 'reminder',
          frequency: 'monthly',
          title: WARNINGS.investmentTime.title,
          message: WARNINGS.investmentTime.message,
          is_read: false,
          is_active: true,
        })
      }
    }

    // يوم 25: تذكير دفعات الديون
    if (dayOfMonth === 25) {
      const { data: debts } = await supabase
        .from('debts')
        .select('name, monthly_payment')
        .eq('user_id', profile.id)
        .eq('is_paid', false)
        .gt('monthly_payment', 0)

      if (debts && debts.length > 0) {
        const totalMonthly = debts.reduce((a, d) => a + d.monthly_payment, 0)
        alertsToInsert.push({
          user_id: profile.id,
          type: 'reminder',
          frequency: 'monthly',
          title: WARNINGS.debtDue.title,
          message: `${WARNINGS.debtDue.message} إجمالي أقساطك: ${totalMonthly.toFixed(0)} JOD`,
          is_read: false,
          is_active: true,
        })
      }
    }
  }

  if (alertsToInsert.length > 0) {
    await supabase.from('alerts').insert(alertsToInsert)
  }

  return alertsToInsert.length
}

// ===== GET: Vercel Cron Job =====
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await generateAlerts()
  return NextResponse.json({ ok: true, generated: count })
}

// ===== POST: استدعاء يدوي من صفحة التنبيهات =====
export async function POST(request: NextRequest) {
  try {
    // التحقق من المستخدم عبر Supabase Auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // التحقق من الـ token مع Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // توليد التنبيهات لهذا المستخدم فقط
    const count = await generateAlerts(user.id)
    return NextResponse.json({
      ok: true,
      generated: count,
      message: count > 0 ? `✅ تم توليد ${count} تنبيه` : '✅ لا تنبيهات جديدة الآن'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
