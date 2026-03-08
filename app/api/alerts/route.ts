// app/api/alerts/route.ts
// Called by Vercel Cron daily to generate smart alerts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Motivational messages
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

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sunday
  const dayOfMonth = now.getDate()

  // Get all users
  const { data: profiles } = await supabase.from('profiles').select('id, monthly_income')
  if (!profiles) return NextResponse.json({ ok: true })

  const alertsToInsert: Record<string, unknown>[] = []

  for (const profile of profiles) {
    // Daily motivation (every day)
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

    // Weekly: check if no transactions this week (Monday)
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

    // Monthly: spending check (1st of month)
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
        if (expenses / income > 0.8) {
          alertsToInsert.push({
            user_id: profile.id,
            type: 'warning',
            frequency: 'monthly',
            title: WARNINGS.overspending.title,
            message: `${WARNINGS.overspending.message} (مصاريفك: ${expenses.toFixed(2)} JOD = ${((expenses / income) * 100).toFixed(0)}% من دخلك)`,
            is_read: false,
            is_active: true,
          })
        }
      }

      // SPUS quarterly reminder (every 3 months: April, July, October, January)
      const month = now.getMonth() + 1 // 1-12
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

    // Debt due reminder (25th of each month)
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
          message: `${WARNINGS.debtDue.message} إجمالي أقساطك: ${totalMonthly.toFixed(2)} JOD`,
          is_read: false,
          is_active: true,
        })
      }
    }
  }

  // Batch insert
  if (alertsToInsert.length > 0) {
    await supabase.from('alerts').insert(alertsToInsert)
  }

  return NextResponse.json({ ok: true, generated: alertsToInsert.length })
}
