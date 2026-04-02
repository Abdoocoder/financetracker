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
  cashBalance: number
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
      const [txRes, profileRes, alertRes, debtRes, invRes, goalRes, recentRes, chartRes, allTxRes] = await Promise.all([
        supabase.from('transactions').select('type,amount,category').eq('user_id', user.id).gte('transaction_date', firstDay),
        supabase.from('profiles').select('monthly_income, full_name, currency, opening_balance').eq('id', user.id).single(),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('debts').select('remaining_amount,monthly_payment,debt_type,auto_deduct').eq('user_id', user.id).eq('is_paid', false),
        supabase.from('investments').select('shares,current_price').eq('user_id', user.id),
        supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
        supabase.from('transactions').select('id,user_id,type,amount,category,description,transaction_date,is_recurring,recurring_day,recurring_auto,created_at').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5),
        supabase.from('transactions').select('type,amount,transaction_date').eq('user_id', user.id).gte('transaction_date', chartFrom),
        supabase.from('transactions').select('type,amount').eq('user_id', user.id),
      ])

      const txs = txRes.data ?? []
      const profileData = profileRes.data as { monthly_income: number; full_name: string | null; currency?: string; opening_balance?: number } | null
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

      const newData = {
        income, expenses, debtPayments, months6, categories, net: income - expenses, monthlyDebtCommitments,
        prevIncome: prevMonth.income, prevExpenses: prevMonth.expense,
        totalDebt: (debtRes.data ?? []).filter((d: {debt_type?: string}) => (d.debt_type ?? 'owed') === 'owed').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0),
        totalReceivable: (debtRes.data ?? []).filter((d: {debt_type?: string}) => d.debt_type === 'receivable').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0),
        netWorth: invValueLocal
          + (goalRes.data ?? []).reduce((a: number, g: {current_amount: number}) => a + Number(g.current_amount), 0)
          - (debtRes.data ?? []).filter((d: {debt_type?: string}) => (d.debt_type ?? 'owed') === 'owed').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0)
          + (debtRes.data ?? []).filter((d: {debt_type?: string}) => d.debt_type === 'receivable').reduce((a: number, d: {remaining_amount: number}) => a + Number(d.remaining_amount), 0),
        invValue: invValueLocal,
        goalsSaved: (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0),
        goalsTarget: (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0),
        unreadAlerts: alertRes.count ?? 0,
        txCount: (chartRes.data ?? []).length,
        name: profileData?.full_name ?? '',
        cashBalance: Number(profileData?.opening_balance ?? 0)
          + (allTxRes.data ?? []).filter((t: {type: string}) => t.type === 'income').reduce((a: number, t: {amount: number}) => a + Number(t.amount), 0)
          - (allTxRes.data ?? []).filter((t: {type: string}) => t.type === 'expense').reduce((a: number, t: {amount: number}) => a + Number(t.amount), 0),
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

  if (loading) return <DashSkeleton />

  const net = data?.net ?? 0
  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const debtPayments = data?.debtPayments ?? 0
  const realExpenses = expenses - debtPayments
  const monthlyDebtCommitments = data?.monthlyDebtCommitments ?? 0
  const netAfterDebts = net - monthlyDebtCommitments
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            {(() => { const name = data?.name || currentUser?.user_metadata?.full_name || ''; const first = name.split(' ')[0]; return first ? `${t('dash_greeting')} ${first}` : t('dash_title') })()}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            {t('dash_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {streakInfo && streakInfo.streak >= 3 && (
            <button
              onClick={() => {
                if (streakInfo.loggedToday) {
                  document.getElementById('gamification')?.scrollIntoView({ behavior: 'smooth' })
                } else {
                  document.getElementById('quick-add-trigger')?.click()
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 10, background: streakInfo.loggedToday ? 'rgba(245,158,11,0.1)' : 'rgba(156,163,175,0.1)', border: `1px solid ${streakInfo.loggedToday ? 'rgba(245,158,11,0.3)' : 'rgba(156,163,175,0.3)'}`, fontSize: 12, fontWeight: 700, color: streakInfo.loggedToday ? '#F59E0B' : '#9CA3AF', cursor: 'pointer' }}>
              <span>{streakInfo.loggedToday ? '🔥' : '❄️'}</span>
              <span>{streakInfo.streak}</span>
            </button>
          )}
          {(data?.unreadAlerts ?? 0) > 0 && (
            <Link href="/dashboard/alerts" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, textDecoration: 'none', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 12, fontWeight: 700 }}>
              🔔 {data?.unreadAlerts}
            </Link>
          )}
        </div>
      </div>

      {/* Empty State للمستخدم الجديد */}
      {income === 0 && expenses === 0 && (recentTx?.length ?? 0) === 0 && (
        <DashboardEmptyState />
      )}

      {/* Stats — دائماً ظاهرة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {/* بطاقة الدخل */}
        <div style={{ background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--accent-green-light)', fontWeight: 900, marginBottom: 2, opacity: 0.7 }}>↑</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-green-light)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{`+${fmt(income)}`}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{t('dash_income')}</div>
        </div>
        {/* بطاقة المصاريف */}
        <div style={{ background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--accent-red-light)', fontWeight: 900, marginBottom: 2, opacity: 0.7 }}>↓</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-red-light)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{fmt(realExpenses > 0 ? realExpenses : expenses)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{t('dash_expenses')}</div>
          {debtPayments > 0 && (
            <div style={{ marginTop: 5, padding: '2px 4px', borderRadius: 5, background: 'rgba(59,126,246,0.1)' }}>
              <div style={{ fontSize: 8, color: '#3B7EF6', fontWeight: 700 }}>💳 {t('dash_debt_payments')}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#3B7EF6', fontFamily: 'monospace' }}>{fmt(debtPayments)}</div>
            </div>
          )}
        </div>
        {/* بطاقة الصافي مع الالتزامات */}
        <div style={{ background: net >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${net >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontWeight: 900, marginBottom: 2, opacity: 0.7 }}>=</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{`${net >= 0 ? '+' : '-'}${fmt(Math.abs(net))}`}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{t('dash_net')}</div>
          {monthlyDebtCommitments > 0 && (
            <div style={{ marginTop: 6, padding: '3px 5px', borderRadius: 6, background: netAfterDebts >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
              <div style={{ fontSize: 8, color: '#3B7EF6', fontWeight: 700 }}>⚡ {t('dash_after_debts')}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: netAfterDebts >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{`${netAfterDebts >= 0 ? '+' : '-'}${fmt(Math.abs(netAfterDebts))}`}</div>
            </div>
          )}
        </div>
      </div>

      {/* بطاقة الرصيد النقدي الفعلي */}
      {(data?.cashBalance !== undefined) && (
        <div style={{
          background: (data.cashBalance ?? 0) >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
          border: `1px solid ${(data.cashBalance ?? 0) >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: 18,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              💵 {lang === 'en' ? 'Actual Cash Balance' : 'رصيدك النقدي الفعلي'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
              {lang === 'en' ? 'Opening balance + all income − all expenses' : 'الرصيد الابتدائي + كل الدخل − كل المصاريف'}
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: (data.cashBalance ?? 0) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
              {`${(data.cashBalance ?? 0) >= 0 ? '+' : '-'}${fmt(Math.abs(data.cashBalance ?? 0))}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{profile?.currency ?? 'JOD'}</div>
          </div>
        </div>
      )}

      {/* إضافة سريعة — مباشرة بعد الإحصائيات */}
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

      {/* صافي الثروة — مطوي افتراضياً */}
      {(data?.invValue ?? 0) + (data?.goalsSaved ?? 0) + (data?.totalDebt ?? 0) > 0 && (
        <NetWorthCard
          netWorth={data?.netWorth ?? 0}
          invValue={data?.invValue ?? 0}
          goalsSaved={data?.goalsSaved ?? 0}
          totalDebt={data?.totalDebt ?? 0}
          totalReceivable={data?.totalReceivable ?? 0}
          currency={profile?.currency ?? 'JOD'}
          lang={lang}
        />
      )}

      <Section id="health" defaultOpen={true} icon="💊" title={`${lang === 'en' ? 'Financial Health Score' : 'نقاط الصحة المالية'} — ${computeHealthScore(data, income, expenses)}%`}>
        <div style={{ padding: '12px 0 8px' }}>
          <FinancialHealthCombined
            income={income}
            expenses={expenses}
            totalDebt={data?.totalDebt ?? 0}
            invValue={data?.invValue ?? 0}
            goalsSaved={data?.goalsSaved ?? 0}
            goalsTarget={data?.goalsTarget ?? 0}
            txCount={data?.txCount ?? 0}
          />
        </div>
      </Section>

      {/* الميزانية الشهرية — دائماً ظاهرة */}
      <BudgetProgressCard income={income} expenses={expenses} net={net} currency={profile?.currency ?? 'JOD'} />


      {/* روابط سريعة — دائماً ظاهرة */}
      <QuickLinksCards totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} currency={profile?.currency ?? 'JOD'} />

      {/* ── قابلة للطي — مطوية افتراضياً ── */}


      <Section id="gamification" defaultOpen={true} icon="🏆" title={lang === 'en' ? 'Achievements' : 'نظام الإنجازات'}>
        <div style={{ padding: '12px 0 8px' }}>
          <GamificationCard />
        </div>
      </Section>

      <Section id="charts" defaultOpen={true} icon="📊" title={lang === 'en' ? 'Charts & Expense Breakdown' : 'الرسوم البيانية وتوزيع المصاريف'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0 8px' }}>
          <MonthCompareCard income={income} expenses={expenses} prevIncome={data?.prevIncome ?? 0} prevExpenses={data?.prevExpenses ?? 0} />
          {data && data.months6.some((m: any) => m.income > 0 || m.expense > 0) && (
            <MiniBarChart data={data.months6} lang={lang} />
          )}
          {data && data.categories.length > 0 && (
            <CategoryBars categories={data.categories} lang={lang} />
          )}
        </div>
      </Section>

      <Section id="simulator" icon="💰" title={lang === 'en' ? 'Wealth Simulator' : 'محاكي الثروة'}>
        <div style={{ padding: '12px 0 8px' }}>
          <WealthSimulatorCard net={net} lang={lang} />
        </div>
      </Section>


      {/* آخر المعاملات */}
      <RecentTransactionsCard transactions={recentTx} lang={lang} />

      <Section id="challenges" icon="🎯" title={lang === 'en' ? 'Saving Challenges' : 'تحديات الادخار'}>
        <div style={{ padding: '12px 0 8px' }}>
          <ChallengesCard lang={lang} data={data} net={net} income={income} expenses={expenses} />
        </div>
      </Section>

    </div>
  )
}