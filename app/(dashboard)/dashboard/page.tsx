'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import type { Transaction } from '@/types'
import { QuickAdd } from '@/components/ui/quick-add'
import {
  MonthCompareCard, BudgetProgressCard,
  QuickLinksCards, WealthSimulatorCard, RecentTransactionsCard,
} from '@/components/dashboard/Cards'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { FinancialHealthCombined } from '@/components/ui/financial-health-combined'
import { DashboardEmptyState } from '@/components/ui/empty-state'
import { fetchExchangeRate } from '@/lib/currency'
import { useAccounts } from '@/hooks/useAccounts'
import { useCountUp } from '@/lib/use-count-up'
import nextDynamic from 'next/dynamic'

const MiniBarChart = nextDynamic(() => import('@/components/dashboard/Charts').then(m => ({ default: m.MiniBarChart })), { ssr: false, loading: () => <div className="skeleton" style={{ height: 156, borderRadius: 16 }} /> })
const CategoryBars = nextDynamic(() => import('@/components/dashboard/Charts').then(m => ({ default: m.CategoryBars })), { ssr: false })
const ChallengesCard = nextDynamic(() => import('@/components/dashboard/ChallengesCard').then(m => ({ default: m.ChallengesCard })), { ssr: false })
const GamificationCard = nextDynamic(() => import('@/components/dashboard/GamificationCard').then(m => ({ default: m.GamificationCard })), { ssr: false, loading: () => <div className="skeleton" style={{ height: 120, borderRadius: 16 }} /> })

// ── Collapsible Section ──────────────────────────────────────────
function Section({ id, title, icon, defaultOpen = false, children }: {
  id: string
  title: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const STORAGE_KEY = `dash_section_${id}`
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) setOpen(saved === 'true')
    } catch { }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { }
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`section-${id}`}
        style={{
          width: '100%', padding: '12px 16px',
          background: open ? 'var(--bg-elevated)' : 'var(--bg-card)',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <span style={{
          fontSize: 12, color: 'var(--text-muted)', fontWeight: 700,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease', display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div id={`section-${id}`} style={{ padding: '0 0 4px 0', background: 'var(--bg-primary)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────
function Bone({ w, h = '14px', r = '8px' }: { w: string; h?: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

function DashSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone w="140px" h="24px" /><Bone w="80px" h="18px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="card-static" style={{ padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Bone w="32px" h="32px" r="10px" /><Bone w="60px" h="20px" r="6px" /><Bone w="50px" h="12px" r="6px" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="card-static" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Bone w="48px" h="48px" r="14px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w="80px" h="12px" r="6px" /><Bone w="120px" h="20px" r="6px" />
          </div>
          <Bone w="20px" h="20px" r="6px" />
        </div>
      ))}
    </div>
  )
}

// ── useDashboardData ──────────────────────────────────────────────
const CACHE_TTL_MS = 2 * 60 * 1000

export interface DashboardData {
  income: number
  expenses: number
  debtPayments: number
  months6: Array<{ month: string; income: number; expense: number }>
  categories: [string, number][]
  net: number
  monthlyDebtCommitments: number
  prevIncome: number
  prevExpenses: number
  totalDebt: number
  totalReceivable: number
  netWorth: number
  invValue: number
  goalsSaved: number
  goalsTarget: number
  unreadAlerts: number
  txCount: number
  name: string
  lastUpdated?: string
}

function computeHealthScore(data: DashboardData | null, income: number, expenses: number): number {
  if (!data) return 0;
  const metrics = (income > 0 ? Math.min(30, Math.round((Math.max(0, income - expenses) / income) * 150)) : 0)
    + (data.totalDebt === 0 ? 25 : Math.max(0, 25 - Math.round((data.totalDebt / Math.max(income * 12, 1)) * 25)))
    + Math.min(20, Math.round((data.goalsSaved / Math.max(income * 3, 1)) * 20))
    + (data.invValue > 0 ? 15 : 0)
    + Math.min(10, data.txCount);
  return Math.min(100, Math.round(metrics));
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useUser()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!currentUser) return
    const CACHE_KEY = `dashboard_${currentUser.id}`

    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data: cd, recentTx: cr, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL_MS) { setData(cd); setRecentTx(cr); setLoading(false); return }
      }
    } catch { }

    const user = currentUser
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // ── كل الـ 8 queries بالتوازي بدل Phase1 ثم Phase2 (~400ms → ~200ms) ──
    async function fetchAll() {
      const chartFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
      const [txRes, profileRes, alertRes, debtRes, invRes, goalRes, recentRes, chartRes, accountsResQuery] = await Promise.all([
        supabase.from('transactions').select('type,amount,category').eq('user_id', user.id).gte('transaction_date', firstDay),
        supabase.from('profiles').select('monthly_income, full_name, currency').eq('id', user.id).single(),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('debts').select('remaining_amount,monthly_payment,debt_type,auto_deduct').eq('user_id', user.id).eq('is_paid', false),
        supabase.from('investments').select('shares,current_price').eq('user_id', user.id),
        supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
        supabase.from('transactions').select('id,user_id,type,amount,category,description,transaction_date,is_recurring,recurring_day,recurring_auto,created_at').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5),
        supabase.from('transactions').select('type,amount,transaction_date,account_id,transfer_to_account_id').eq('user_id', user.id).gte('transaction_date', chartFrom),
        supabase.from('accounts').select('id,opening_balance').eq('user_id', user.id).eq('is_archived', false),
      ])

      const txs = txRes.data ?? []
      const profileData = profileRes.data as { monthly_income: number; full_name: string | null; currency?: string } | null
      const DEBT_CATEGORIES = ['ديون', 'debts_title', 'Debts']
      const txIncome = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const income = txIncome > 0 ? txIncome : Number(profileData?.monthly_income ?? 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      const debtPayments = txs.filter(t => t.type === 'expense' && DEBT_CATEGORIES.includes(t.category ?? '')).reduce((a, t) => a + Number(t.amount), 0)
      const catMap: Record<string, number> = {}
      txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount) })
      const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

      const months6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('ar-EG', { month: 'short' })
        const mt = (chartRes.data ?? []).filter(t => t.transaction_date?.startsWith(key))
        return { month: label, income: mt.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0), expense: mt.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0) }
      })
      const prevMonth = months6[4] ?? { income: 0, expense: 0 }
      const monthlyDebtCommitments = (debtRes.data ?? [])
        .filter((d: {debt_type?: string; auto_deduct?: boolean}) => d.auto_deduct === true && (d.debt_type ?? 'owed') === 'owed')
        .reduce((a: number, d: {monthly_payment?: number}) => a + Number(d.monthly_payment ?? 0), 0)

      const userCurrency = profileData?.currency ?? 'JOD'
      const invValueUSD = (invRes.data ?? []).reduce((a: number, i: {shares: number; current_price: number}) => a + Number(i.shares) * Number(i.current_price), 0)
      const usdToLocal = userCurrency !== 'USD' ? (await fetchExchangeRate('USD', userCurrency) ?? 1) : 1
      const invValueLocal = invValueUSD * usdToLocal
      
      // FIX: Calculate total account balance for net worth (Audit Report Fix)
      // Note: We used to rely on useAccounts, but for netWorth we need it inside this state.
      const accountsRes = accountsResQuery?.data as { id: string; opening_balance: number }[] ?? []
      const allTxs = chartRes.data ?? []
      const accountsBalance = accountsRes.reduce((accTotal, acc) => {
        const income   = allTxs.filter(t => t.account_id === acc.id && t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
        const expense  = allTxs.filter(t => t.account_id === acc.id && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
        const xferIn   = allTxs.filter(t => t.transfer_to_account_id === acc.id && t.type === 'transfer').reduce((sum, t) => sum + Number(t.amount), 0)
        const xferOut  = allTxs.filter(t => t.account_id === acc.id && t.type === 'transfer').reduce((sum, t) => sum + Number(t.amount), 0)
        return accTotal + Number(acc.opening_balance) + income - expense + xferIn - xferOut
      }, 0)

      const newData = {
        income, expenses, debtPayments, months6, categories, net: income - expenses, monthlyDebtCommitments,
        prevIncome: prevMonth.income, prevExpenses: prevMonth.expense,
        totalDebt: (debtRes.data ?? []).filter((d: {debt_type?: string}) => (d.debt_type ?? 'owed') === 'owed').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0),
        totalReceivable: (debtRes.data ?? []).filter((d: {debt_type?: string}) => d.debt_type === 'receivable').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0),
        netWorth: accountsBalance
          + invValueLocal
          + (goalRes.data ?? []).reduce((a: number, g: {current_amount: number}) => a + Number(g.current_amount), 0)
          - (debtRes.data ?? []).filter((d: {debt_type?: string}) => (d.debt_type ?? 'owed') === 'owed').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0)
          + (debtRes.data ?? []).filter((d: {debt_type?: string}) => d.debt_type === 'receivable').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0),
        invValue: invValueLocal,
        goalsSaved: (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0),
        goalsTarget: (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0),
        unreadAlerts: alertRes.count ?? 0,
        txCount: (chartRes.data ?? []).length,
        name: profileData?.full_name ?? '',
        lastUpdated: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      }
      setData(newData)
      setRecentTx(recentRes.data ?? [])
      setLoading(false)
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: newData, recentTx: recentRes.data ?? [], ts: Date.now() })) } catch { }
    }

    fetchAll()
  }, [currentUser, supabase])

  return { data, setData, recentTx, loading, supabase }
}

// ── Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t, lang } = useI18n()
  const { user: currentUser, profile } = useUser()
  const { data, setData, recentTx, loading, supabase } = useDashboardData()
  const { accounts, totalBalance: accountsTotalBalance, loading: accountsLoading } = useAccounts(currentUser?.id)
  const [streakInfo, setStreakInfo] = useState<{ streak: number; loggedToday: boolean } | null>(null)

  useEffect(() => {
    if (!currentUser) return
    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('transaction_date', today),
      fetch(`/api/gamification?user_id=${currentUser.id}`).then(r => r.json()),
    ]).then(([txRes, gam]) => {
      setStreakInfo({ streak: gam?.streak_days ?? 0, loggedToday: (txRes.count ?? 0) > 0 })
    }).catch(() => {})
  }, [currentUser, supabase])

  const net = data?.net ?? 0
  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const debtPayments = data?.debtPayments ?? 0
  const realExpenses = expenses - debtPayments
  const monthlyDebtCommitments = data?.monthlyDebtCommitments ?? 0
  const netAfterDebts = net - monthlyDebtCommitments
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
  const currency = profile?.currency ?? 'JOD'
  const heroBalance = accounts.length > 0 ? accountsTotalBalance : net
  const isHeroPositive = heroBalance >= 0
  const heroColor = isHeroPositive ? 'var(--accent-green-light)' : 'var(--accent-red-light)'
  const name = data?.name || currentUser?.user_metadata?.full_name || ''
  const firstName = name.split(' ')[0]

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 1. HEADER ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            {firstName ? `${t('dash_greeting')} ${firstName}` : t('dash_title')}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            {data?.lastUpdated && (
              <span style={{ margin: '0 8px', opacity: 0.5 }}>
                • {lang === 'en' ? 'Updated' : 'تم التحديث'} {data.lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {streakInfo && streakInfo.streak >= 3 && (
            <button onClick={() => streakInfo.loggedToday ? document.getElementById('gamification')?.scrollIntoView({ behavior: 'smooth' }) : document.getElementById('quick-add-trigger')?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 10, background: streakInfo.loggedToday ? 'rgba(245,158,11,0.1)' : 'rgba(156,163,175,0.1)', border: `1px solid ${streakInfo.loggedToday ? 'rgba(245,158,11,0.3)' : 'rgba(156,163,175,0.3)'}`, fontSize: 13, fontWeight: 800, color: streakInfo.loggedToday ? '#F59E0B' : '#9CA3AF', cursor: 'pointer' }}>
              {streakInfo.loggedToday ? '🔥' : '❄️'} {streakInfo.streak}
            </button>
          )}
          {(data?.unreadAlerts ?? 0) > 0 && (
            <Link href="/dashboard/alerts" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, textDecoration: 'none', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 13, fontWeight: 800 }}>
              🔔 {data?.unreadAlerts}
            </Link>
          )}
        </div>
      </div>

      {/* ── 2. HERO BALANCE CARD ───────────────────────── */}
      {accountsLoading
        ? <div className="skeleton" style={{ height: 128, borderRadius: 24 }} />
        : <HeroBalanceCard
            balance={heroBalance}
            currency={currency}
            lang={lang}
            accounts={accounts}
            monthlyNet={net}
            prevMonthNet={(data?.prevIncome ?? 0) - (data?.prevExpenses ?? 0)}
          />
      }

      {/* ── 3. MONTHLY STATS — compact ────────────────── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 14 }} />)}
        </div>
      )}
      {!loading && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: t('dash_income'),   value: `+${fmt(income)}`,   color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '↑' },
            { label: t('dash_expenses'), value: fmt(realExpenses > 0 ? realExpenses : expenses), color: 'var(--accent-red-light)', bg: 'var(--accent-red-dim)', border: 'rgba(239,68,68,0.15)', icon: '↓' },
            { label: t('dash_net'),      value: `${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}`, color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', bg: net >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: net >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', icon: '=' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: s.color, fontWeight: 900, opacity: 0.6, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: s.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>
      {(monthlyDebtCommitments > 0 || debtPayments > 0) && (
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
      </>}

      {/* ── 4. EMPTY STATE ────────────────────────────── */}
      {!loading && income === 0 && expenses === 0 && (recentTx?.length ?? 0) === 0 && <DashboardEmptyState />}

      {/* ── 5. QUICK ADD ──────────────────────────────── */}
      <QuickAdd onAdded={async () => {
        const user = currentUser
        if (!user) return
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const { data: txs } = await supabase.from('transactions').select('type,amount,category').eq('user_id', user.id).gte('transaction_date', start)
        if (!txs) return
        const DEBT_CATS = ['ديون', 'debts_title', 'Debts']
        const inc = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
        const exp = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
        const dbt = txs.filter(t => t.type === 'expense' && DEBT_CATS.includes((t as any).category ?? '')).reduce((a, t) => a + Number(t.amount), 0)
        try { sessionStorage.removeItem(`dashboard_${user.id}`) } catch { }
        setData((prev: DashboardData | null) => prev ? { ...prev, income: inc, expenses: exp, debtPayments: dbt, net: inc - exp, monthlyDebtCommitments: prev.monthlyDebtCommitments } : prev)
      }} />

      {/* ── 6. RECENT TRANSACTIONS ────────────────────── */}
      {loading
        ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        : <RecentTransactionsCard transactions={recentTx} lang={lang} />
      }

      {/* ── 7–14. Secondary sections — hidden while loading ────── */}
      {loading && (
        <>
          <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 16 }} />
        </>
      )}
      {!loading && <>
        {/* ── 7. BUDGET PROGRESS ───────────────────────── */}
        <BudgetProgressCard income={income} expenses={expenses} net={net} currency={currency} />

        {/* ── 8. QUICK LINKS ───────────────────────────── */}
        <QuickLinksCards totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} currency={currency} />

        {/* ── 9. NET WORTH ─────────────────────────────── */}
        {(data?.invValue ?? 0) + (data?.goalsSaved ?? 0) + (data?.totalDebt ?? 0) > 0 && (
          <NetWorthCard netWorth={data?.netWorth ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} totalDebt={data?.totalDebt ?? 0} totalReceivable={data?.totalReceivable ?? 0} currency={currency} lang={lang} />
        )}

        {/* ── 10. HEALTH SCORE — مطوي ──────────────────── */}
        <Section id="health" defaultOpen={false} icon="💊" title={`${lang === 'en' ? 'Financial Health' : 'الصحة المالية'} — ${computeHealthScore(data, income, expenses)}%`}>
          <div style={{ padding: '12px 0 8px' }}>
            <FinancialHealthCombined income={income} expenses={expenses} totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} txCount={data?.txCount ?? 0} />
          </div>
        </Section>

        {/* ── 11. GAMIFICATION — مطوي ──────────────────── */}
        <Section id="gamification" defaultOpen={false} icon="🏆" title={lang === 'en' ? 'Achievements' : 'الإنجازات'}>
          <div style={{ padding: '12px 0 8px' }}><GamificationCard /></div>
        </Section>

        {/* ── 12. CHARTS — مطوي ────────────────────────── */}
        <Section id="charts" defaultOpen={false} icon="📊" title={lang === 'en' ? 'Charts & Analysis' : 'الرسوم البيانية'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 8px' }}>
            <MonthCompareCard income={income} expenses={expenses} prevIncome={data?.prevIncome ?? 0} prevExpenses={data?.prevExpenses ?? 0} />
            {data && data.months6.some((m: any) => m.income > 0 || m.expense > 0) && <MiniBarChart data={data.months6} lang={lang} />}
            {data && data.categories.length > 0 && <CategoryBars categories={data.categories} lang={lang} />}
          </div>
        </Section>

        {/* ── 13. SIMULATOR — مطوي ─────────────────────── */}
        <Section id="simulator" defaultOpen={false} icon="💰" title={lang === 'en' ? 'Wealth Simulator' : 'محاكي الثروة'}>
          <div style={{ padding: '12px 0 8px' }}><WealthSimulatorCard net={net} lang={lang} /></div>
        </Section>

        {/* ── 14. CHALLENGES — مطوي ────────────────────── */}
        <Section id="challenges" defaultOpen={false} icon="🎯" title={lang === 'en' ? 'Challenges' : 'التحديات'}>
          <div style={{ padding: '12px 0 8px' }}><ChallengesCard lang={lang} data={data} net={net} income={income} expenses={expenses} /></div>
        </Section>
      </>}

    </div>
  )
}

// ── Hero Balance Card ─────────────────────────────────
function HeroBalanceCard({ balance, currency, lang, accounts, monthlyNet, prevMonthNet }: {
  balance: number; currency: string; lang: string
  accounts: import('@/types').Account[]
  monthlyNet: number; prevMonthNet: number
}) {
  const animatedBalance = useCountUp(Math.abs(balance), 900)
  const isPositive = balance >= 0
  const color = isPositive ? '#10B981' : '#EF4444'
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
  const trend = prevMonthNet !== 0 ? ((monthlyNet - prevMonthNet) / Math.abs(prevMonthNet)) * 100 : 0
  const hasTrend = prevMonthNet !== 0

  return (
    <div style={{
      background: `linear-gradient(135deg, ${isPositive ? 'rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04)'} 100%)`,
      border: `1px solid ${isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      borderRadius: 24,
      padding: '20px 20px 16px',
    }}>
      {/* Label */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {accounts.length > 0
          ? (lang === 'en' ? '💰 Total Balance' : '💰 إجمالي رصيدك')
          : (lang === 'en' ? '💰 Net Balance' : '💰 رصيدك الآن')}
      </div>

      {/* Hero Number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 42, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {isPositive ? '+' : '-'}{fmt(animatedBalance)}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{currency}</span>
      </div>

      {/* Trend + this month */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        {hasTrend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#10B981' : '#EF4444', background: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 100 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}% {lang === 'en' ? 'vs last month' : 'عن الشهر الماضي'}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {lang === 'en' ? 'This month:' : 'هذا الشهر:'} <span style={{ fontWeight: 800, color: monthlyNet >= 0 ? '#10B981' : '#EF4444' }}>{monthlyNet >= 0 ? '+' : ''}{fmt(monthlyNet)}</span>
        </span>
      </div>

      {/* Account chips */}
      {accounts.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {accounts.map(acc => {
            const accColor = acc.color ?? '#3B7EF6'
            return (
              <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, background: `${accColor}14`, border: `1px solid ${accColor}30`, fontSize: 11, fontWeight: 700, color: accColor }}>
                <span>{acc.icon}</span>
                <span>{fmt(acc.balance ?? 0)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}