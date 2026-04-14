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

// New Hooks & Components
import { useDashboardData, type DashboardData } from '@/hooks/useDashboardData'
import { Section } from '@/components/dashboard/Section'
import { DashSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { HeroBalanceCard } from '@/components/dashboard/HeroBalanceCard'
import { MonthSummaryBanner } from '@/components/dashboard/MonthSummaryBanner'
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'

const MiniBarChart = nextDynamic(() => import('@/components/dashboard/Charts').then(m => ({ default: m.MiniBarChart })), { ssr: false, loading: () => <div className="skeleton" style={{ height: 156, borderRadius: 16 }} /> })
const CategoryBars = nextDynamic(() => import('@/components/dashboard/Charts').then(m => ({ default: m.CategoryBars })), { ssr: false, loading: () => <div className="skeleton" style={{ height: 120, borderRadius: 16 }} /> })
const ChallengesCard = nextDynamic(
  () => import('@/components/dashboard/ChallengesCard').then(m => ({ default: m.ChallengesCard })),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 140, borderRadius: 16 }} /> }
)

const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
const GamificationCard = nextDynamic(() => import('@/components/dashboard/GamificationCard').then(m => ({ default: m.GamificationCard })), { ssr: false, loading: () => <div className="skeleton" style={{ height: 120, borderRadius: 16 }} /> })


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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 1. HEADER ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 suppressHydrationWarning style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            {!hydrated ? t('dash_title') : (firstName ? `${t('dash_greeting')} ${firstName}` : t('dash_title'))}
          </h1>
          <p suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {hydrated && new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            {hydrated && data?.lastUpdated && (
              <span style={{ margin: '0 8px', opacity: 0.5 }}>
                • {t('dash_updated')} {data.lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {streakInfo && streakInfo.streak >= 3 && (
            <button 
              onClick={() => streakInfo.loggedToday ? document.getElementById('gamification')?.scrollIntoView({ behavior: 'smooth' }) : document.getElementById('quick-add-trigger')?.click()}
              aria-label={`${t('dash_streak')}: ${streakInfo.streak}`}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 10, background: streakInfo.loggedToday ? 'rgba(245,158,11,0.1)' : 'rgba(156,163,175,0.1)', border: `1px solid ${streakInfo.loggedToday ? 'rgba(245,158,11,0.3)' : 'rgba(156,163,175,0.3)'}`, fontSize: 13, fontWeight: 800, color: streakInfo.loggedToday ? '#F59E0B' : '#9CA3AF', cursor: 'pointer' }}>
              {streakInfo.loggedToday ? '🔥' : '❄️'} {streakInfo.streak}
            </button>
          )}
          {(data?.unreadAlerts ?? 0) > 0 && (
            <Link href="/dashboard/alerts" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, textDecoration: 'none', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 13, fontWeight: 800 }}>
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
        ? <div className="skeleton" style={{ height: 128, borderRadius: 24 }} />
        : <HeroBalanceCard
            monthlyNet={net}
            currency={currency}
            lang={lang}
            accounts={accounts}
            totalBalance={accountsTotalBalance}
            prevMonthNet={(data?.prevIncome ?? 0) - (data?.prevExpenses ?? 0)}
          />
      )}

      {/* ── 4. MONTHLY STATS ── */}
      {show('monthly_stats') && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: t('dash_income'),   value: `+${fmt(income)}`,   color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '↑', sub: null },
          { label: t('dash_expenses'), value: fmt(realExpenses > 0 ? realExpenses : expenses), color: 'var(--accent-red-light)', bg: 'var(--accent-red-dim)', border: 'rgba(239,68,68,0.15)', icon: '↓', sub: null },
          {
            label: t('dash_net'),
            value: `${(accountsTotalBalance ?? net) >= 0 ? '+' : '-'}${fmt(Math.abs(accountsTotalBalance ?? net))}`,
            color: (accountsTotalBalance ?? net) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
            bg: (accountsTotalBalance ?? net) >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            border: (accountsTotalBalance ?? net) >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            icon: '🏦',
            sub: `${t('dash_month')}: ${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}`,
          },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: s.color, fontWeight: 900, opacity: 0.6, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: s.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 700 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600, opacity: 0.8 }}>{s.sub}</div>}
          </div>
        ))}
      </div>}

      {show('debt_row') && (monthlyDebtCommitments > 0 || debtPayments > 0) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {debtPayments > 0 && (
            <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#3B7EF6', fontWeight: 700 }}>💳 {t('dash_debt_payments')}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#3B7EF6', fontFamily: 'monospace' }}>{fmt(debtPayments)}</span>
            </div>
          )}
          {monthlyDebtCommitments > 0 && (
            <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: netAfterDebts >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${netAfterDebts >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#3B7EF6', fontWeight: 700 }}>⚡ {t('dash_after_debts')}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: netAfterDebts >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{`${netAfterDebts >= 0 ? '+' : '-'}${fmt(Math.abs(netAfterDebts))}`}</span>
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
      {show('recent_tx') && <RecentTransactionsCard transactions={data?.recentTx ?? []} lang={lang} />}

      {/* ── Secondary sections ── */}
      {show('budgets') && <BudgetProgressCard income={income} expenses={expenses} net={net} currency={currency} />}

      {show('quick_links') && <QuickLinksCards totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} currency={currency} />}

      {show('net_worth') && (data?.invValue ?? 0) + (data?.goalsSaved ?? 0) + (data?.totalDebt ?? 0) > 0 && (
        <NetWorthCard netWorth={data?.netWorth ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} totalDebt={data?.totalDebt ?? 0} totalReceivable={data?.totalReceivable ?? 0} currency={currency} lang={lang} />
      )}

      {show('health') && (
        <Section id="health" defaultOpen={false} icon="💊" title={`${t('dash_health_title')} — ${data?.healthScore ?? 0}%`}>
          <div style={{ padding: '12px 0 8px' }}>
            <FinancialHealthCombined income={income} expenses={expenses} totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} txCount={data?.txCount ?? 0} />
          </div>
        </Section>
      )}

      {show('achievements') && (
        <Section id="gamification" defaultOpen={false} icon="🏆" title={t('dash_achievements_title')}>
          <div style={{ padding: '12px 0 8px' }}><GamificationCard /></div>
        </Section>
      )}

      {show('charts') && (
        <Section id="charts" defaultOpen={false} icon="📊" title={t('dash_charts_title')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 8px' }}>
            <MonthCompareCard income={income} expenses={expenses} prevIncome={data?.prevIncome ?? 0} prevExpenses={data?.prevExpenses ?? 0} />
            {data && data.months6.some((m: any) => m.income > 0 || m.expense > 0) && <MiniBarChart data={data.months6} lang={lang} />}
            {data && data.categories.length > 0 && <CategoryBars categories={data.categories} lang={lang} />}
          </div>
        </Section>
      )}

      {show('simulator') && (
        <Section id="simulator" defaultOpen={false} icon="💰" title={t('dash_simulator_title')}>
          <div style={{ padding: '12px 0 8px' }}><WealthSimulatorCard net={net} lang={lang} /></div>
        </Section>
      )}

      {show('challenges') && (
        <Section id="challenges" defaultOpen={false} icon="🎯" title={t('dash_challenges_title')}>
          <div style={{ padding: '12px 0 8px' }}><ChallengesCard lang={lang} data={data || null} net={net} income={income} expenses={expenses} /></div>
        </Section>
      )}

    </div>
  )
}