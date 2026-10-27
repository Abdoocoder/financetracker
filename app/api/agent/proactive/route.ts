import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { sendPushToUser } from '@/lib/push-send'
import { getBudgets, getDebts, getCashflowSummary } from '@/lib/unified-tools'

/**
 * Proactive Agent Cron Job
 *
 * Runs daily at 06:00 UTC (09:00 Amman) to analyze each user's financial state
 * and generate actionable insights. Uses deterministic fingerprints for deduplication
 * so the same insight isn't sent repeatedly within the same period.
 *
 * Insight Rules:
 * 1. Budget > 90% used → "You have used {percentage}% of your {category} budget."
 * 2. Debt due within 3 days → "Your debt payment for {name} is due on {date}."
 * 3. Spending up >20% vs last month → "Your spending is up 20% compared to last month."
 */

// Fingerprint helpers for deduplication
function budgetFingerprint(userId: string, category: string, yearMonth: string): string {
  return `proactive_budget_${userId}_${category.replace(/\s+/g, '_')}_${yearMonth}`
}

function debtFingerprint(userId: string, debtId: string): string {
  return `proactive_debt_${userId}_${debtId}`
}

function spendingFingerprint(userId: string, yearMonth: string): string {
  return `proactive_spending_${userId}_${yearMonth}`
}

// Helper to get the current year-month string (e.g., "2026-10")
function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Helper to get previous year-month string
function getPreviousYearMonth(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function runProactiveCheck() {
  const supabase = createAdminClient()
  const yearMonth = getCurrentYearMonth()
  const prevYearMonth = getPreviousYearMonth()

  // Fetch all active users (those with profiles)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, currency, lang')
    .gt('monthly_income', 0)

  if (profilesError) throw profilesError
  if (!profiles?.length) return { ok: true, processed: 0, insights: 0 }

  let totalInsights = 0

  await Promise.allSettled(profiles.map(async (profile) => {
    const userId = profile.id
    const name = profile.full_name?.split(' ')[0] ?? 'أخي'
    const userLang: 'ar' | 'en' = profile.lang === 'en' ? 'en' : 'ar'

    // 1. Check Budgets (using unified tool)
    let budgetInsights = 0
    try {
      const budgets = await getBudgets(userId, new Date().getFullYear(), new Date().getMonth() + 1)
      for (const budget of budgets) {
        if (!budget.percentage || budget.percentage <= 0 || budget.monthly_limit <= 0) continue

        if (budget.percentage > 90) {
          const fingerprint = budgetFingerprint(userId, budget.category, yearMonth)

          // Check if already sent this month
          const { count } = await supabase
            .from('notification_history')
            .select('id', { count: 'exact', head: true })
            .eq('fingerprint', fingerprint)

          if (!count) {
            const title = userLang === 'ar'
              ? `📊 ميزانية ${budget.category} قاربت على النفاد`
              : `📊 ${budget.category} budget nearly exhausted`
            const message = userLang === 'ar'
              ? `لقد أنفقت ${budget.percentage.toFixed(0)}% من ميزانية ${budget.category} (${budget.spent.toFixed(0)} / ${budget.monthly_limit.toFixed(0)} JOD). راجع مصاريفك اليوم.`
              : `You've spent ${budget.percentage.toFixed(0)}% of your ${budget.category} budget (${budget.spent.toFixed(0)} / ${budget.monthly_limit.toFixed(0)} JOD). Review your spending today.`

            await sendPushToUser(
              userId,
              title,
              message,
              '/dashboard/budgets',
              'warning',
              undefined,
              fingerprint
            )
            budgetInsights++
          }
        }
      }
    } catch (e) {
      console.error('[proactive] budget check failed for', userId, e)
    }

    // 2. Check Debts due within 3 days
    let debtInsights = 0
    try {
      const debts = await getDebts(userId)
      const now = new Date()
      const threeDaysLater = new Date(now.getTime() + 3 * 86400000)

      for (const debt of debts) {
        if (debt.is_paid || !debt.next_due_date) continue
        if (debt.debt_type === 'receivable') continue // Only owed debts

        const dueDate = new Date(debt.next_due_date)
        if (dueDate <= threeDaysLater && dueDate >= now) {
          const fingerprint = debtFingerprint(userId, debt.id)

          const { count } = await supabase
            .from('notification_history')
            .select('id', { count: 'exact', head: true })
            .eq('fingerprint', fingerprint)

          if (!count) {
            const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
            const title = userLang === 'ar'
              ? `💳 قسط "${debt.name}" مستحق خلال ${daysUntil} يوم`
              : `💳 "${debt.name}" payment due in ${daysUntil} day(s)`
            const message = userLang === 'ar'
              ? `قسط بقيمة ${debt.monthly_payment.toFixed(0)} JOD مستحق في ${formatDate(dueDate)}. تأكد من توفر الرصيد.`
              : `Payment of ${debt.monthly_payment.toFixed(0)} JOD due on ${formatDate(dueDate)}. Ensure sufficient balance.`

            await sendPushToUser(
              userId,
              title,
              message,
              '/dashboard/debts',
              'debt-reminder',
              undefined,
              fingerprint
            )
            debtInsights++
          }
        }
      }
    } catch (e) {
      console.error('[proactive] debt check failed for', userId, e)
    }

    // 3. Check Spending vs Previous Month
    let spendingInsights = 0
    try {
      const now = new Date()
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      const [thisMonthSummary, lastMonthSummary] = await Promise.all([
        getCashflowSummary(userId, firstOfThisMonth.toISOString().split('T')[0], formatDate(now)),
        getCashflowSummary(userId, firstOfLastMonth.toISOString().split('T')[0], lastOfLastMonth.toISOString().split('T')[0]),
      ])

      const thisExpense = thisMonthSummary.expense
      const lastExpense = lastMonthSummary.expense

      if (lastExpense > 0 && thisExpense > lastExpense * 1.2) {
        const pctIncrease = Math.round(((thisExpense - lastExpense) / lastExpense) * 100)
        const fingerprint = spendingFingerprint(userId, yearMonth)

        const { count } = await supabase
          .from('notification_history')
          .select('id', { count: 'exact', head: true })
          .eq('fingerprint', fingerprint)

        if (!count) {
          const title = userLang === 'ar'
            ? `📈 إنفاقك ارتفع ${pctIncrease}% عن الشهر الماضي`
            : `📈 Spending up ${pctIncrease}% vs last month`
          const message = userLang === 'ar'
            ? `أنفقت ${thisExpense.toFixed(0)} JOD هذا الشهر مقابل ${lastExpense.toFixed(0)} JOD الشهر الماضي. راجع إذا كان هناك مصروفات غير ضرورية.`
            : `You spent ${thisExpense.toFixed(0)} JOD this month vs ${lastExpense.toFixed(0)} JOD last month. Review for any unnecessary expenses.`

          await sendPushToUser(
            userId,
            title,
            message,
            '/dashboard?tab=spending',
            'finance-alert',
            undefined,
            fingerprint
          )
          spendingInsights++
        }
      }
    } catch (e) {
      console.error('[proactive] spending check failed for', userId, e)
    }

    totalInsights += budgetInsights + debtInsights + spendingInsights
  }))

  return { processed: profiles.length, insights: totalInsights }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runProactiveCheck()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[proactive] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}