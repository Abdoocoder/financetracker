'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect }       from 'react'
import Link                           from 'next/link'
import { createClient }               from '@/lib/supabase/client'
import { useUser }                    from '@/lib/user-context'
import { useI18n }                    from '@/lib/i18n'
import { WealthRoadmap }              from '@/components/ui/wealth-roadmap'
import { QuickAdd }                   from '@/components/ui/quick-add'
import { MiniBarChart, CategoryBars } from '@/components/dashboard/Charts'
import { ChallengesCard }             from '@/components/dashboard/ChallengesCard'
import { GamificationCard }           from '@/components/dashboard/GamificationCard'
import {
  MonthCompareCard, BudgetProgressCard,
  QuickLinksCards, WealthSimulatorCard, RecentTransactionsCard,
} from '@/components/dashboard/Cards'

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
        {[0,1,2].map(i => (
          <div key={i} className="card-static" style={{ padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Bone w="32px" h="32px" r="10px" /><Bone w="60px" h="20px" r="6px" /><Bone w="50px" h="12px" r="6px" />
          </div>
        ))}
      </div>
      {[0,1,2].map(i => (
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

function useDashboardData() {
  const [data, setData] = useState<any>(null)
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useUser()
  const supabase = createClient()
  const CACHE_TTL = 2 * 60 * 1000

  useEffect(() => {
    const CACHE_KEY = `dashboard_${currentUser?.id}`
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data: cd, recentTx: cr, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL) { setData(cd); setRecentTx(cr); setLoading(false); return }
      }
    } catch {}

    async function fetchAll() {
      const user = currentUser
      if (!user) { setLoading(false); return }
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const [txRes, debtRes, invRes, goalRes, alertRes, recentRes, chartRes] = await Promise.all([
        supabase.from('transactions').select('type,amount,category').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
        supabase.from('debts').select('remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
        supabase.from('investments').select('shares,current_price').eq('user_id', user.id),
        supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('transactions').select('id,type,amount,category,description,transaction_date').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5),
        supabase.from('transactions').select('type,amount,transaction_date').eq('user_id', user.id).gte('transaction_date', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]),
      ])
      const txs      = txRes.data ?? []
      const income   = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)

      const months6  = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('ar-EG', { month: 'short' })
        const mt = (chartRes.data ?? []).filter(t => t.transaction_date?.startsWith(key))
        return { month: label, income: mt.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0), expense: mt.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0) }
      })
      const catMap: Record<string, number> = {}
      txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount) })
      const categories   = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
      const prevMonth    = months6[4] ?? { income: 0, expense: 0 }
      const newData = {
        income, expenses, months6, categories,
        net: income - expenses,
        prevIncome:   prevMonth.income,
        prevExpenses: prevMonth.expense,
        totalDebt:    (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0),
        invValue:     (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0),
        goalsSaved:   (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0),
        goalsTarget:  (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0),
        unreadAlerts: alertRes.count ?? 0,
      }
      const newRecent = recentRes.data ?? []
      setData(newData); setRecentTx(newRecent); setLoading(false)
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: newData, recentTx: newRecent, ts: Date.now() })) } catch {}
    }
    fetchAll()
  }, [currentUser])

  return { data, setData, recentTx, loading, supabase }
}


function CollapsibleSection({ title, icon, defaultOpen = false, children }: {
  title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon} {title}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s', display: 'inline-block' }}>▼</span>
      </button>
      {open && <div style={{ padding: '0 0 4px' }}>{children}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { t, lang } = useI18n()
  const { user: currentUser } = useUser()
  const { data, setData, recentTx, loading, supabase } = useDashboardData()

  if (loading) return <DashSkeleton />

  const net      = data?.net ?? 0
  const income   = data?.income ?? 0
  const expenses = data?.expenses ?? 0

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{t('dash_title')}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{t('dash_monthly')}</p>
        </div>
        {(data?.unreadAlerts ?? 0) > 0 && (
          <Link href="/dashboard/alerts" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 12, textDecoration: 'none', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 12, fontWeight: 700 }}>
            🔔 {data.unreadAlerts}
          </Link>
        )}
      </div>

      {/* أرقام الشهر — مفتوح دائماً */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: t('dash_income'),   value: `+${income.toFixed(0)}`,  color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)',  border: 'rgba(16,185,129,0.15)', icon: '↑' },
          { label: t('dash_expenses'), value: `${expenses.toFixed(0)}`, color: 'var(--accent-red-light)',   bg: 'var(--accent-red-dim)',    border: 'rgba(239,68,68,0.15)',  icon: '↓' },
          { label: t('dash_net'),      value: `${net >= 0 ? '+' : ''}${net.toFixed(0)}`, color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', bg: net >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: net >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', icon: '=' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: s.color, fontWeight: 900, marginBottom: 2, opacity: 0.7 }}>{s.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: s.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* إضافة سريعة — مفتوح دائماً */}
      <QuickAdd onAdded={async () => {
        const user = currentUser
        if (!user) return
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        const { data: txs } = await supabase.from('transactions').select('type,amount').eq('user_id', user.id).gte('transaction_date', start).lte('transaction_date', end)
        if (!txs) return
        const inc = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
        const exp = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
        setData((prev: any) => prev ? { ...prev, income: inc, expenses: exp, net: inc - exp } : prev)
      }} />

      {/* روابط سريعة — مفتوح دائماً */}
      <QuickLinksCards totalDebt={data?.totalDebt ?? 0} invValue={data?.invValue ?? 0} goalsSaved={data?.goalsSaved ?? 0} goalsTarget={data?.goalsTarget ?? 0} />

      {/* رحلة الثروة — مفتوح دائماً */}
      <GamificationCard />

      {/* آخر المعاملات — مفتوح دائماً */}
      <RecentTransactionsCard transactions={recentTx} lang={lang} />

      {/* خارطة الثراء — مطوية */}
      <CollapsibleSection icon="🗺️" title={lang === 'en' ? 'Wealth Roadmap' : 'خارطة الثراء'}>
        <div style={{ padding: '0 4px 4px' }}><WealthRoadmap /></div>
      </CollapsibleSection>

      {/* الميزانية والمقارنة — مطوية */}
      <CollapsibleSection icon="📊" title={lang === 'en' ? 'Budget & Comparison' : 'الميزانية والمقارنة'}>
        <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MonthCompareCard income={income} expenses={expenses} prevIncome={data?.prevIncome ?? 0} prevExpenses={data?.prevExpenses ?? 0} />
          <BudgetProgressCard income={income} expenses={expenses} net={net} />
        </div>
      </CollapsibleSection>

      {/* الرسوم البيانية — مطوية */}
      {(data?.months6?.some((m: any) => m.income > 0 || m.expense > 0) || (data?.categories?.length > 0)) && (
        <CollapsibleSection icon="📈" title={lang === 'en' ? 'Charts & Analytics' : 'الرسوم البيانية والتحليل'}>
          <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.months6?.some((m: any) => m.income > 0 || m.expense > 0) && <MiniBarChart data={data.months6} lang={lang} />}
            {data?.categories?.length > 0 && <CategoryBars categories={data.categories} lang={lang} />}
          </div>
        </CollapsibleSection>
      )}

      {/* محاكي الثروة — مطوي */}
      <CollapsibleSection icon="💰" title={lang === 'en' ? 'Wealth Simulator' : 'محاكي الثروة'}>
        <div style={{ padding: '8px 12px 12px' }}><WealthSimulatorCard net={net} lang={lang} /></div>
      </CollapsibleSection>

      {/* تحديات الادخار — مطوية */}
      <CollapsibleSection icon="🏆" title={lang === 'en' ? 'Savings Challenges' : 'تحديات الادخار'}>
        <div style={{ padding: '8px 12px 12px' }}><ChallengesCard lang={lang} data={data} net={net} income={income} expenses={expenses} /></div>
      </CollapsibleSection>

    </div>
  )
}
