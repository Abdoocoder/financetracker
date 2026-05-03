'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { QuickAdd } from '@/components/ui/quick-add'
import {
  MonthCompareCard, BudgetProgressCard,
  QuickLinksCards, WealthSimulatorCard, RecentTransactionsCard,
} from '@/components/dashboard/Cards'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { FinancialHealthCombined } from '@/components/ui/financial-health-combined'
import { DashboardEmptyState } from '@/components/ui/empty-state'
import { useAccounts } from '@/hooks/useAccounts'
import nextDynamic from 'next/dynamic'
import { useQueryClient } from '@tanstack/react-query'


import styles from './dashboard.module.css'
import { useDashboardData } from '@/hooks/useDashboardData'
import { Section } from '@/components/dashboard/Section'
import { DashSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { HeroBalanceCard } from '@/components/dashboard/HeroBalanceCard'
import { MonthSummaryBanner } from '@/components/dashboard/MonthSummaryBanner'
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'

const MiniBarChart = nextDynamic(() => import('@/components/dashboard/Charts').then(m => ({ default: m.MiniBarChart })), { ssr: false, loading: () => <div className={`skeleton ${styles.skeletonChart}`} /> })
const CategoryBars = nextDynamic(() => import('@/components/dashboard/Charts').then(m => ({ default: m.CategoryBars })), { ssr: false, loading: () => <div className={`skeleton ${styles.skeletonSmall}`} /> })
const ChallengesCard = nextDynamic(
  () => import('@/components/dashboard/ChallengesCard').then(m => ({ default: m.ChallengesCard })),
  { ssr: false, loading: () => <div className={`skeleton ${styles.skeletonMedium}`} /> }
)

const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
const GamificationCard = nextDynamic(() => import('@/components/dashboard/GamificationCard').then(m => ({ default: m.GamificationCard })), { ssr: false, loading: () => <div className={`skeleton ${styles.skeletonSmall}`} /> })


export default function DashboardPage() {
  const { t, lang, hydrated } = useI18n()
  const { user: currentUser, profile } = useUser()
  const queryClient = useQueryClient()
  const { visibility, toggle, reset, show } = useDashboardLayout()
  
  // Use the new TanStack Query based hook
  const { data, isLoading } = useDashboardData()
  
  const { accounts, totalBalance: accountsTotalBalance, loading: accountsLoading } = useAccounts(currentUser?.id)
  const [streakInfo, setStreakInfo] = useState<{ streak: number; loggedToday: boolean } | null>(null)

  useEffect(() => {
    if (!currentUser) return
    const today = new Date().toISOString().split('T')[0]
    
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { data: { session } } = await createClient().auth.getSession()
        if (!session?.access_token) return
        const gam = await fetch('/api/gamification', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }).then(r => r.json()).catch(() => null)
        const count = await queryClient.fetchQuery({
          queryKey: ['transactions-today', currentUser.id],
          queryFn: async () => {
            const { count } = await createClient()
              .from('transactions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', currentUser.id)
              .eq('transaction_date', today)
            return count ?? 0
          }
        })
        setStreakInfo({ streak: gam?.streak_days ?? 0, loggedToday: count > 0 })
      } catch { /* ignore */ }
    })()
  }, [currentUser, queryClient])

  if (isLoading && !data) return <DashSkeleton />

  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const net = data?.net ?? 0
  const debtPayments = data?.debtPayments ?? 0
  const realExpenses = expenses - debtPayments
  const monthlyDebtCommitments = data?.monthlyDebtCommitments ?? 0
  const netAfterDebts = net - monthlyDebtCommitments
  const currency = profile?.currency ?? 'JOD'
  const name = data?.name || currentUser?.user_metadata?.full_name || ''
  const firstName = name.split(' ')[0]
  // Use accounts balance only when at least one account has a real (non-zero) balance.
  // If all accounts show 0 (e.g., no transactions linked or opening_balance = 0),
  // fall back to monthly net so the dashboard shows a meaningful number.
  const hasAccounts = accounts.length > 0
  const anyAccountHasBalance = accounts.some(acc => (acc.balance ?? 0) !== 0)
  const hasUsableAccountBalance = hasAccounts && anyAccountHasBalance
  const effectiveBalance = hasUsableAccountBalance ? accountsTotalBalance : net

  return (
    <div className={`animate-fade-in ${styles.pageContent}`}>

      {/* ── 1. HEADER ──────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 suppressHydrationWarning className={styles.pageTitle}>
            {!hydrated ? t('dash_title') : (firstName ? t('dash_greeting', { name: firstName }) : t('dash_title'))}
          </h1>
          <p suppressHydrationWarning className={styles.pageDate}>
            {hydrated && new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            {hydrated && data?.lastUpdated && (
              <span className={styles.separator}>
                • {t('dash_updated_at', { date: data.lastUpdated })}
              </span>
            )}
          </p>
        </div>
        <div className={styles.headerActions}>
          {streakInfo && streakInfo.streak >= 3 && (
            <button
              onClick={() => streakInfo.loggedToday ? document.getElementById('gamification')?.scrollIntoView({ behavior: 'smooth' }) : document.getElementById('quick-add-trigger')?.click()}
              aria-label={`${t('dash_streak')}: ${streakInfo.streak}`}
              className={`${styles.streakButton} ${streakInfo.loggedToday ? styles.streakActive : styles.streakInactive}`}>
              {streakInfo.loggedToday ? '🔥' : '❄️'} {streakInfo.streak}
            </button>
          )}
          {(data?.unreadAlerts ?? 0) > 0 && (
            <Link href="/dashboard/alerts" className={styles.alertsBadge}>
              🔔 {data?.unreadAlerts}
            </Link>
          )}
          <DashboardCustomizer visibility={visibility} onToggle={toggle} onReset={reset} lang={lang} />
        </div>
      </div>

      {/* ── 2. MONTH SUMMARY BANNER ── */}
      {show('month_summary') && <MonthSummaryBanner data={data || null} lang={lang} t={t} currency={currency} />}

      {/* ── 3. HERO BALANCE CARD ───────────────────────── */}
      {show('hero_balance') && (accountsLoading && !accounts.length
        ? <div className={`skeleton ${styles.skeletonHero}`} />
        : <HeroBalanceCard
            monthlyNet={net}
            currency={currency}
            lang={lang}
            accounts={accounts}
            totalBalance={hasUsableAccountBalance ? accountsTotalBalance : undefined}
            prevMonthNet={(data?.prevIncome ?? 0) - (data?.prevExpenses ?? 0)}
          />
      )}

      {/* ── 4. MONTHLY STATS ── */}
      {show('monthly_stats') && <div className={styles.statsGrid}>
        {[
          { label: t('dash_income'),   value: `+${fmt(income)}`,   color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '↑', sub: null },
          { label: t('dash_expenses'), value: fmt(realExpenses > 0 ? realExpenses : expenses), color: 'var(--accent-red-light)', bg: 'var(--accent-red-dim)', border: 'rgba(239,68,68,0.15)', icon: '↓', sub: null },
          {
            label: t('dash_net'),
            value: `${effectiveBalance >= 0 ? '+' : '-'}${fmt(Math.abs(effectiveBalance))}`,
            color: effectiveBalance >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
            bg: effectiveBalance >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            border: effectiveBalance >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            icon: '🏦',
            sub: hasUsableAccountBalance ? `${t('dash_month')}: ${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}` : null,
          },
        ].map(s => (
          <div key={s.label} className={styles.statBox} style={{ '--stat-bg': s.bg, '--stat-border': s.border, '--stat-color': s.color } as React.CSSProperties}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
            {s.sub && <div className={styles.statSub}>{s.sub}</div>}
          </div>
        ))}
      </div>}

      {show('debt_row') && (monthlyDebtCommitments > 0 || debtPayments > 0) && (
        <div className={styles.debtRow}>
          {debtPayments > 0 && (
            <div className={`${styles.debtBox} ${styles.debtBoxBlue}`}>
              <span className={`${styles.debtLabel} ${styles.debtColorBlue}`}>💳 {t('dash_debt_payments')}</span>
              <span className={`${styles.debtValue} ${styles.debtColorBlue}`}>{fmt(debtPayments)}</span>
            </div>
          )}
          {monthlyDebtCommitments > 0 && (
            <div className={`${styles.debtBox} ${netAfterDebts >= 0 ? styles.debtBoxGreen : styles.debtBoxRed}`}>
              <span className={`${styles.debtLabel} ${styles.debtColorBlue}`}>⚡ {t('dash_after_debts')}</span>
              <span className={`${styles.debtValue} ${netAfterDebts >= 0 ? styles.debtValueGreen : styles.debtValueRed}`}>{`${netAfterDebts >= 0 ? '+' : '-'}${fmt(Math.abs(netAfterDebts))}`}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 5. EMPTY STATE ────────────────────────────── */}
      {!isLoading && income === 0 && expenses === 0 && (data?.recentTx?.length ?? 0) === 0 && <DashboardEmptyState />}

      {/* ── 6. QUICK ADD ──────────────────────────────── */}
      <QuickAdd onAdded={() => {
        // Efficient cache invalidation instead of manual state hacks
        queryClient.invalidateQueries({ queryKey: ['dashboard', currentUser?.id] })
        queryClient.invalidateQueries({ queryKey: ['transactions-today', currentUser?.id] })
      }} />

      {/* ── 7. RECENT TRANSACTIONS ────────────────────── */}
      {show('recent_tx') && <RecentTransactionsCard transactions={data?.recentTx ?? []} />}

      {/* ── Secondary sections ── */}
      {show('budgets') && <BudgetProgressCard income={income} expenses={expenses} net={net} currency={currency} />}

      {show('quick_links') && <QuickLinksCards totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} currency={currency} />}

      {show('net_worth') && (data?.invValue ?? 0) + (data?.goalsSaved ?? 0) + (data?.totalDebt ?? 0) > 0 && (
        <NetWorthCard netWorth={data?.netWorth ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} totalDebt={data?.totalDebt ?? 0} totalReceivable={data?.totalReceivable ?? 0} currency={currency} lang={lang} />
      )}

      {show('health') && (
        <Section id="health" defaultOpen={false} icon="💊" title={`${t('dash_health_title')} — ${data?.healthScore ?? 0}%`}>
          <div className={styles.sectionContent}>
            <FinancialHealthCombined income={income} expenses={expenses} totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} txCount={data?.txCount ?? 0} />
          </div>
        </Section>
      )}

      {show('achievements') && (
        <Section id="gamification" defaultOpen={false} icon="🏆" title={t('dash_achievements_title')}>
          <div className={styles.sectionContent}><GamificationCard /></div>
        </Section>
      )}

      {show('charts') && (
        <Section id="charts" defaultOpen={false} icon="📊" title={t('dash_charts_title')}>
          <div className={styles.sectionContentCol}>
            <MonthCompareCard income={income} expenses={expenses} prevIncome={data?.prevIncome ?? 0} prevExpenses={data?.prevExpenses ?? 0} />
            {data && data.months6.some((m: any) => m.income > 0 || m.expense > 0) && <MiniBarChart data={data.months6} lang={lang} />}
            {data && data.categories.length > 0 && <CategoryBars categories={data.categories} lang={lang} />}
          </div>
        </Section>
      )}

      {show('simulator') && (
        <Section id="simulator" defaultOpen={false} icon="💰" title={t('dash_simulator_title')}>
          <div className={styles.sectionContent}><WealthSimulatorCard net={net} lang={lang} /></div>
        </Section>
      )}

      {show('challenges') && (
        <Section id="challenges" defaultOpen={false} icon="🎯" title={t('dash_challenges_title')}>
          <div className={styles.sectionContent}><ChallengesCard lang={lang} data={data || null} net={net} income={income} expenses={expenses} /></div>
        </Section>
      )}

    </div>
  )
}