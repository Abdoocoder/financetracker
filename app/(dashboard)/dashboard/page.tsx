'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { WealthRoadmap } from '@/components/ui/wealth-roadmap'
import { useCachedData } from '@/lib/use-cached-data'
import { QuickAdd } from '@/components/ui/quick-add'

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
      <div className="card-static" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Bone w="120px" h="16px" r="6px" />
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bone w="36px" h="36px" r="10px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Bone w="70%" h="12px" r="6px" /><Bone w="40%" h="10px" r="6px" />
            </div>
            <Bone w="50px" h="14px" r="6px" />
          </div>
        ))}
      </div>
    </div>
  )
}


function MiniBarChart({ data, lang }: { data: { month: string; income: number; expense: number }[], lang: string }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const W = 300, H = 80, barW = 18
  const gap = (W - data.length * barW * 2) / (data.length + 1)
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{lang === 'en' ? 'Income & Expenses' : 'الإيرادات والمصروفات'}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--accent-green-light)', fontWeight: 700 }}>{`■ ${lang === 'en' ? 'Income' : 'دخل'}`}</span>
          <span style={{ fontSize: 10, color: 'var(--accent-red-light)', fontWeight: 700 }}>{`■ ${lang === 'en' ? 'Expense' : 'مصروف'}`}</span>
        </div>
      </div>
      <svg width="100%" viewBox={"0 0 " + W + " " + (H+20)} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const x = gap + i * (barW * 2 + gap)
          const ih = (d.income / maxVal) * H
          const eh = (d.expense / maxVal) * H
          return (
            <g key={i}>
              <rect x={x} y={H-ih} width={barW} height={ih} rx={3} fill="#10B981" opacity="0.8" />
              <rect x={x+barW+2} y={H-eh} width={barW} height={eh} rx={3} fill="#EF4444" opacity="0.8" />
              <text x={x+barW} y={H+14} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text-muted)' }}>{d.month}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function CategoryBars({ categories, lang }: { categories: [string, number][], lang: string }) {
  if (!categories.length) return null
  const max = categories[0][1]
  const COLORS = ['#3B7EF6','#8B5CF6','#F59E0B','#10B981','#EF4444']
  const CAT_TRANS: Record<string, string> = {
    'طعام':'Food','مواصلات':'Transport','فواتير':'Bills','صحة':'Health',
    'ملابس':'Clothes','ترفيه':'Entertainment','تعليم':'Education',
    'أخرى':'Other','راتب':'Salary','ديون':'Debts','استثمار':'Investment',
    'هدية':'Gift','عمل حر':'Freelance'
  }
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', display: 'block', marginBottom: 14 }}>{lang === 'en' ? 'Expense Breakdown' : 'توزيع المصاريف'}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(([cat, amt], i) => (
          <div key={cat}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{lang === 'en' ? (CAT_TRANS[cat] ?? cat) : cat}</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: COLORS[i], fontFamily: 'monospace' }}>{Number(amt).toFixed(0)} JOD</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (amt/max*100)+'%', borderRadius: 3, background: COLORS[i], transition: 'width 0.6s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


function ChallengesCard({ lang, data, net, income, expenses }: { lang: string, data: any, net: number, income: number, expenses: number }) {
  const { t } = useI18n()
  const challenges = [
    { id: 1, icon: '🍔', title: lang === 'en' ? 'No Restaurants Week' : 'أسبوع بدون مطاعم', days: 7 },
    { id: 2, icon: '💰', title: lang === 'en' ? 'Save 10% of Income' : 'وفّر 10% من دخلك', days: 30 },
    { id: 3, icon: '📉', title: lang === 'en' ? 'Spend Less Than Last Month' : 'أنفق أقل من الشهر الماضي', days: 30 },
    { id: 4, icon: '🎯', title: lang === 'en' ? 'Zero Extra Spending' : 'صفر مصاريف غير ضرورية', days: 14 },
  ]
  const [activeChallenge, setActiveChallenge] = useState<number|null>(null)
  const active = challenges.find(c => c.id === activeChallenge)

  const getProgress = (id: number) => {
    if (!data) return 0
    if (id === 1) {
      const foodSpend = (data.categories ?? []).find(([cat]: [string,number]) => cat === 'طعام')?.[1] ?? 0
      return foodSpend === 0 ? 100 : Math.max(0, 100 - (foodSpend / 50 * 100))
    }
    if (id === 2) { const t = income * 0.1; return t > 0 ? Math.min(100, (net / t) * 100) : 0 }
    if (id === 3) { const t = data?.prevExpenses ?? 0; return t > 0 ? Math.min(100, ((t - expenses) / t) * 100) : 0 }
    if (id === 4) {
      const entSpend = (data.categories ?? []).find(([cat]: [string,number]) => cat === 'ترفيه')?.[1] ?? 0
      return entSpend === 0 ? 100 : 0
    }
    return 0
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>🏆 {t('dash_challenges')}</span>
        {active && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue-light)', background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.2)', padding: '3px 10px', borderRadius: 100 }}>{t('dash_challenge_active')}</span>}
      </div>
      {active ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>{active.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{active.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{active.days} {t('dash_challenge_days_left')}</div>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('dash_challenge_progress')}</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent-green-light)' }}>{getProgress(active.id).toFixed(0)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)' }}>
              <div style={{ height: '100%', width: `${getProgress(active.id)}%`, borderRadius: 4, background: getProgress(active.id) >= 100 ? '#10B981' : 'var(--accent-blue)', transition: 'width 0.5s ease' }} />
            </div>
          </div>
          {getProgress(active.id) >= 100 && <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#10B981' }}>{t('dash_challenge_done')}</div>}
          <button onClick={() => setActiveChallenge(null)} style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {lang === 'en' ? 'Change Challenge' : 'تغيير التحدي'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {challenges.map(c => (
            <button key={c.id} onClick={() => setActiveChallenge(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'right' as const, width: '100%' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.days} {lang === 'en' ? 'days' : 'يوم'}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue-light)', background: 'rgba(59,126,246,0.1)', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>{t('dash_challenge_join')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { t, lang } = useI18n()
  const supabase = createClient()
  const { user: currentUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [recentTx, setRecentTx] = useState<any[]>([])
  const fetched = useRef(false)

  // cache key
  const CACHE_KEY = `dashboard_${currentUser?.id}`

  useEffect(() => {
    if (!currentUser) {
      fetched.current = false // إعادة ضبط عند تسجيل الخروج
      return
    }
    if (fetched.current) return
    fetched.current = true

    // عرض cache فوراً إن وجد
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { data, recentTx: rt, ts } = JSON.parse(cached)
        const age = Date.now() - ts
        if (age < 60000) { // أقل من دقيقة — عرض فوري
          setData(data)
          setRecentTx(rt)
          setLoading(false)
          if (age > 20000) { // أقدم من 20 ثانية — حدّث في الخلفية
            fetchAll(true)
          }
          return
        }
      } catch {}
    }

    async function fetchAll(background = false) {
      const user = currentUser
      if (!user) { setLoading(false); return }
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const [txRes, debtRes, invRes, goalRes, alertRes, recentRes, chartRes] = await Promise.all([
        supabase.from('transactions').select('type,amount,category').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
        supabase.from('debts').select('remaining_amount,monthly_payment').eq('user_id', user.id).eq('is_paid', false),
        supabase.from('investments').select('shares,current_price').eq('user_id', user.id),
        supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('transactions').select('id,type,amount,category,description,transaction_date').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5),
        supabase.from('transactions').select('type,amount,transaction_date,category').eq('user_id', user.id).gte('transaction_date', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]),
      ])
      const txs      = txRes.data ?? []
      const income   = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      const months6 = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
        const label = d.toLocaleDateString('ar-EG', { month: 'short' })
        const mt = (chartRes.data ?? []).filter((t) => t.transaction_date?.startsWith(key))
        months6.push({ month: label, income: mt.filter(t=>t.type==='income').reduce((a,t)=>a+Number(t.amount),0), expense: mt.filter(t=>t.type==='expense').reduce((a,t)=>a+Number(t.amount),0) })
      }
      const catMap: Record<string, number> = {}
      ;(txRes.data ?? [] as any[]).filter((t:any)=>t.type==='expense').forEach((t:any)=>{ catMap[t.category]=(catMap[t.category]??0)+Number(t.amount) })
      const categories = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
      const prevMonth = months6[4] ?? { income: 0, expense: 0 }
      const prevIncome = prevMonth.income
      const prevExpenses = prevMonth.expense
      const newData = { income, expenses, months6, categories, net: income - expenses, prevIncome, prevExpenses, totalDebt: (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0), invValue: (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0), goalsSaved: (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0), goalsTarget: (goalRes.data ?? []).reduce((a, g) => a + Number(g.target_amount), 0), unreadAlerts: alertRes.count ?? 0 }
      const newRecent = recentRes.data ?? []
      setData(newData)
      setRecentTx(newRecent)
      setLoading(false)
      // حفظ في cache
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: newData, recentTx: newRecent, ts: Date.now() })) } catch {}
    }
    fetchAll()
  }, [currentUser, supabase])

  if (loading) return <DashSkeleton />

  const net = data?.net ?? 0
  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const spendPct = income > 0 ? Math.min((expenses / income) * 100, 100) : 0
  const spendColor = spendPct > 90 ? '#EF4444' : spendPct > 70 ? '#F59E0B' : '#10B981'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <WealthRoadmap />
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

      <QuickAdd onAdded={async () => {
        // تحديث خفيف بدون skeleton
        const user = currentUser
        if (!user) return
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        const { data: txs } = await supabase.from('transactions').select('type,amount').eq('user_id', user.id).gte('transaction_date', start).lte('transaction_date', end)
        if (!txs) return
        const income = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
        const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
        setData((prev: any) => prev ? { ...prev, income, expenses, net: income - expenses } : prev)
      }} />

      {/* مقارنة مع الشهر الماضي */}
      {(data?.prevIncome > 0 || data?.prevExpenses > 0) && (() => {
        const incDiff = data.prevIncome > 0 ? ((income - data.prevIncome) / data.prevIncome * 100) : 0
        const expDiff = data.prevExpenses > 0 ? ((expenses - data.prevExpenses) / data.prevExpenses * 100) : 0
        return (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}>{t('dash_compare')}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, padding: '10px', borderRadius: 12, background: incDiff >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{incDiff >= 0 ? '📈' : '📉'}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: incDiff >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{incDiff >= 0 ? '+' : ''}{incDiff.toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{lang === 'en' ? 'Income' : 'الدخل'}</div>
              </div>
              <div style={{ flex: 1, padding: '10px', borderRadius: 12, background: expDiff <= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{expDiff <= 0 ? '✅' : '⚠️'}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: expDiff <= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{expDiff > 0 ? '+' : ''}{expDiff.toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{lang === 'en' ? 'Expenses' : 'المصاريف'}</div>
              </div>
            </div>
          </div>
        )
      })()}

      {income > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{lang === 'en' ? 'Monthly Budget' : 'الميزانية الشهرية'}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: spendColor, fontFamily: 'monospace' }}>{spendPct.toFixed(0)}% {lang === 'en' ? 'spent' : 'مُنفَق'}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${spendPct}%`, borderRadius: 4, background: spendColor, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Income' : 'الدخل'}: {income.toFixed(0)} JOD</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Remaining' : 'المتبقي'}: {Math.max(0, net).toFixed(0)} JOD</span>
          </div>
        </div>
      )}

      {data?.months6?.some((m: any) => m.income > 0 || m.expense > 0) && (
        <MiniBarChart data={data.months6} lang={lang} />
      )}
      {data?.categories?.length > 0 && (
        <CategoryBars categories={data.categories} lang={lang} />
      )}

      {[
        { label: t('dash_debts'),       value: `${(data?.totalDebt ?? 0).toFixed(0)} JOD`, color: 'var(--accent-red-light)',   bg: 'var(--accent-red-dim)',   border: 'rgba(239,68,68,0.15)',  icon: '◈', href: '/dashboard/debts'       },
        { label: t('dash_investments'), value: `$${(data?.invValue ?? 0).toFixed(0)}`,     color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)', border: 'rgba(16,185,129,0.15)', icon: '◎', href: '/dashboard/investments' },
        { label: t('dash_goals'),       value: `${(data?.goalsSaved ?? 0).toFixed(0)}/${(data?.goalsTarget ?? 0).toFixed(0)} JOD`, color: 'var(--accent-blue-light)', bg: 'var(--accent-blue-dim)', border: 'rgba(59,126,246,0.15)', icon: '◉', href: '/dashboard/goals' },
      ].map((c, i) => (
        <Link key={i} href={c.href} style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: c.color }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: c.color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{c.value}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>›</span>
          </div>
        </Link>
      ))}


      {/* محاكي الثروة - بطاقة سريعة */}
      <Link href="/dashboard/investments" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(59,126,246,0.2)', borderRadius: 16, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>📈 {lang === 'en' ? 'Wealth Simulator' : 'محاكي الثروة'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue-light)', background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.2)', padding: '3px 10px', borderRadius: 100 }}>{lang === 'en' ? 'View' : 'افتح ←'}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{lang === 'en' ? 'If you invest your monthly surplus:' : 'لو استثمرت فائضك الشهري:'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {(() => {
              const surplus = Math.max(0, Math.round(net))
              const invest = Math.max(surplus, 10)
              const future10 = invest * ((Math.pow(1 + 0.07/12, 120) - 1) / (0.07/12))
              const future20 = invest * ((Math.pow(1 + 0.07/12, 240) - 1) / (0.07/12))
              const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n.toFixed(0)}`
              return [
                { label: lang === 'en' ? 'Monthly' : 'شهرياً', value: `$${invest}`, color: 'var(--accent-blue-light)' },
                { label: lang === 'en' ? '10 years' : 'بعد 10 سنوات', value: fmt(future10), color: 'var(--accent-green-light)' },
                { label: lang === 'en' ? '20 years' : 'بعد 20 سنة', value: fmt(future20), color: '#F59E0B' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))
            })()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>💡 {lang === 'en' ? 'Based on 7% annual return (S&P500 avg)' : 'بناءً على عائد 7% سنوياً (متوسط S&P500)'}</div>
        </div>
      </Link>


      {/* تحديات الادخار */}
      <ChallengesCard lang={lang} data={data} net={net} income={income} expenses={expenses} />

      

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{t('dash_recent')}</span>
          <Link href="/dashboard/transactions" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue-light)', textDecoration: 'none' }}>{t('dash_view_all')}</Link>
        </div>
        {recentTx.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>{t('dash_no_transactions')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentTx.map(tx => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', borderRadius: 12, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: tx.type === 'income' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                  {tx.type === 'income' ? '💰' : '💸'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || tx.category || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{tx.transaction_date}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', flexShrink: 0, color: tx.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                  {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
