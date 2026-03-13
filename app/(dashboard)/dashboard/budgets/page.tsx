'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'

const CATEGORIES = [
  { key: 'طعام',     ar: 'طعام',     en: 'Food',          icon: '🍔' },
  { key: 'مواصلات', ar: 'مواصلات', en: 'Transport',      icon: '🚗' },
  { key: 'فواتير',  ar: 'فواتير',  en: 'Bills',          icon: '💡' },
  { key: 'صحة',     ar: 'صحة',     en: 'Health',         icon: '💊' },
  { key: 'ملابس',   ar: 'ملابس',   en: 'Clothes',        icon: '👕' },
  { key: 'ترفيه',   ar: 'ترفيه',   en: 'Entertainment',  icon: '🎮' },
  { key: 'تعليم',   ar: 'تعليم',   en: 'Education',      icon: '📚' },
  { key: 'أخرى',    ar: 'أخرى',    en: 'Other',          icon: '📝' },
]

function clearUserCache(userId: string) {
  try { ['dashboard','tx','debts','goals','inv'].forEach(k => sessionStorage.removeItem(`${k}_${userId}`)) } catch {}
}

// ── المستشار المالي الذكي ─────────────────────────────
function FinancialAdvisor({ budgets, spending, income, available, totalBudgeted, totalSpent, ar }: {
  budgets: any[]; spending: Record<string, number>; income: number
  available: number; totalBudgeted: number; totalSpent: number; ar: boolean
}) {
  const insights: { icon: string; text: string; type: 'warning' | 'success' | 'info' | 'danger' }[] = []

  // تجاوز الميزانية
  budgets.forEach(b => {
    const spent = spending[b.category] ?? 0
    const limit = Number(b.monthly_limit)
    const cat = CATEGORIES.find(c => c.key === b.category)
    const name = ar ? cat?.ar : cat?.en
    if (spent > limit) {
      insights.push({ icon: '🔴', type: 'danger', text: ar ? `تجاوزت ميزانية ${name} بـ ${(spent - limit).toFixed(0)} JOD` : `Over ${name} budget by ${(spent - limit).toFixed(0)} JOD` })
    } else if (limit > 0 && (spent / limit) > 0.8) {
      insights.push({ icon: '🔶', type: 'warning', text: ar ? `اقتربت من حد ${name} — ${(limit - spent).toFixed(0)} JOD متبقي` : `Near ${name} limit — ${(limit - spent).toFixed(0)} JOD left` })
    }
  })

  // ميزانية تتجاوز المتاح
  if (totalBudgeted > available && available > 0) {
    insights.push({ icon: '⚠️', type: 'warning', text: ar ? `ميزانيتك تتجاوز المتاح بـ ${(totalBudgeted - available).toFixed(0)} JOD` : `Budget exceeds available by ${(totalBudgeted - available).toFixed(0)} JOD` })
  }

  // نسبة الإنفاق من الدخل
  if (income > 0 && totalSpent > 0) {
    const spendRatio = (totalSpent / income) * 100
    if (spendRatio > 90) {
      insights.push({ icon: '🚨', type: 'danger', text: ar ? `أنفقت ${spendRatio.toFixed(0)}% من دخلك — خطر!` : `Spent ${spendRatio.toFixed(0)}% of income — danger!` })
    } else if (spendRatio < 70) {
      insights.push({ icon: '✅', type: 'success', text: ar ? `ممتاز! أنفقت ${spendRatio.toFixed(0)}% فقط من دخلك` : `Great! Only ${spendRatio.toFixed(0)}% of income spent` })
    }
  }

  // لا توجد ميزانيات
  if (budgets.length === 0) {
    insights.push({ icon: '💡', type: 'info', text: ar ? 'أضف ميزانية لكل فئة لتتبع إنفاقك بدقة' : 'Add budgets per category to track spending' })
  }

  // فائض جيد
  if (available > income * 0.2 && income > 0) {
    insights.push({ icon: '💰', type: 'success', text: ar ? `فائض ${available.toFixed(0)} JOD — فكر في الاستثمار!` : `${available.toFixed(0)} JOD surplus — consider investing!` })
  }

  if (insights.length === 0) return null

  const colors = {
    danger:  { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   color: '#F87171' },
    warning: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  color: '#FCD34D' },
    success: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  color: '#34D399' },
    info:    { bg: 'rgba(59,126,246,0.08)',  border: 'rgba(59,126,246,0.2)',  color: '#6BA3FF' },
  }

  return (
    <div style={{ padding: '0 16px 4px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>
            {ar ? 'المستشار المالي' : 'Financial Advisor'}
          </span>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.slice(0, 3).map((ins, i) => {
            const c = colors[ins.type]
            return (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 12, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color, lineHeight: 1.5 }}>{ins.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── قاعدة 50/30/20 ───────────────────────────────────
function Rule502030({ income, totalDebtPayments, totalGoalSavings, ar, onApply }: {
  income: number; totalDebtPayments: number; totalGoalSavings: number
  ar: boolean; onApply: (suggestions: { category: string; limit: number }[]) => void
}) {
  const [show, setShow] = useState(false)
  if (income <= 0) return null

  const available = income - totalDebtPayments - totalGoalSavings
  const needs    = Math.round(available * 0.50)
  const wants    = Math.round(available * 0.30)
  const savings  = Math.round(available * 0.20)

  const suggestions = [
    { category: 'فواتير',  limit: Math.round(needs * 0.4) },
    { category: 'طعام',    limit: Math.round(needs * 0.35) },
    { category: 'مواصلات', limit: Math.round(needs * 0.25) },
    { category: 'ترفيه',   limit: Math.round(wants * 0.5) },
    { category: 'ملابس',   limit: Math.round(wants * 0.3) },
    { category: 'صحة',     limit: Math.round(wants * 0.2) },
  ]

  return (
    <div style={{ padding: '0 16px 4px' }}>
      <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(139,92,246,0.06))', border: '1px solid rgba(59,126,246,0.15)', borderRadius: 20, overflow: 'hidden' }}>
        <button onClick={() => setShow(s => !s)} style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚖️</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>
              {ar ? 'قاعدة 50/30/20 المقترحة' : 'Suggested 50/30/20 Rule'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', transform: show ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </button>

        {show && (
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { label: ar ? '🏠 ضروريات' : '🏠 Needs',   value: needs,   pct: '50%', color: 'var(--accent-blue-light)', bg: 'var(--accent-blue-dim)' },
                { label: ar ? '🎯 رغبات'   : '🎯 Wants',   value: wants,   pct: '30%', color: 'var(--accent-purple-light)', bg: 'var(--accent-purple-dim)' },
                { label: ar ? '💰 ادخار'   : '💰 Savings', value: savings, pct: '20%', color: 'var(--accent-green-light)', bg: 'var(--accent-green-dim)' },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: item.color, fontFamily: 'monospace' }}>{item.pct}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: item.color, fontFamily: 'monospace', marginTop: 2 }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onApply(suggestions); setShow(false) }} style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              {ar ? '✨ تطبيق التوزيع المقترح' : '✨ Apply Suggested Split'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BudgetsPage() {
  const { user: currentUser } = useUser()
  const { t, lang } = useI18n()
  const supabase = createClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState<any[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [totalDebtPayments, setTotalDebtPayments] = useState(0)
  const [totalGoalSavings, setTotalGoalSavings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'طعام', monthly_limit: '' })
  const ar = lang === 'ar'

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    setLoading(true)
    const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0]
    const [budgetRes, txRes, profileRes, debtRes, goalRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month).eq('year', year),
      supabase.from('transactions').select('category,amount,type').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      supabase.from('profiles').select('monthly_income').eq('id', user.id).single(),
      supabase.from('debts').select('monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
    ])
    setBudgets(budgetRes.data ?? [])
    const spendMap: Record<string, number> = {}
    ;(txRes.data ?? []).forEach((tx: any) => {
      if (tx.type === 'expense') spendMap[tx.category] = (spendMap[tx.category] ?? 0) + Number(tx.amount)
    })
    setSpending(spendMap)
    const actualIncome = (txRes.data ?? []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
    setMonthlyIncome(actualIncome || (profileRes.data?.monthly_income ?? 0))
    setTotalDebtPayments((debtRes.data ?? []).reduce((a: number, d: any) => a + Number(d.monthly_payment), 0))
    const goalTotal = (goalRes.data ?? []).reduce((a: number, g: any) => {
      const remaining = Number(g.target_amount) - Number(g.current_amount)
      return a + (remaining > 0 ? Math.min(remaining * 0.1, Number(g.target_amount) * 0.05) : 0)
    }, 0)
    setTotalGoalSavings(Math.round(goalTotal))
    setLoading(false)
  }, [currentUser, month, year, supabase])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ category: 'طعام', monthly_limit: '' }); setEditingId(null); setShowForm(true) }
  function openEdit(b: any) { setForm({ category: b.category, monthly_limit: String(b.monthly_limit) }); setEditingId(b.id); setShowForm(true) }

  async function handleSave() {
    const user = currentUser
    if (!user || !form.monthly_limit) { toast.error(ar ? 'أدخل الحد' : 'Enter a limit'); return }
    setSaving(true)
    if (editingId) {
      await supabase.from('budgets').update({ monthly_limit: parseFloat(form.monthly_limit) }).eq('id', editingId)
    } else {
      const { error } = await supabase.from('budgets').insert({ user_id: user.id, category: form.category, monthly_limit: parseFloat(form.monthly_limit), month, year })
      if (error?.code === '23505') { toast.error(ar ? 'ميزانية هذه الفئة موجودة مسبقاً' : 'Budget already exists for this category'); setSaving(false); return }
    }
    clearUserCache(currentUser?.id ?? '')
    toast.success(t('toast_saved'))
    setShowForm(false)
    setSaving(false)
    await load()
  }

  async function handleDelete(id: string) {
    await supabase.from('budgets').delete().eq('id', id)
    clearUserCache(currentUser?.id ?? '')
    toast.success(t('toast_deleted'))
    await load()
  }

  // تطبيق قاعدة 50/30/20
  async function handleApply502030(suggestions: { category: string; limit: number }[]) {
    const user = currentUser
    if (!user) return
    setSaving(true)
    for (const s of suggestions) {
      const existing = budgets.find(b => b.category === s.category)
      if (existing) {
        await supabase.from('budgets').update({ monthly_limit: s.limit }).eq('id', existing.id)
      } else {
        await supabase.from('budgets').insert({ user_id: user.id, category: s.category, monthly_limit: s.limit, month, year })
      }
    }
    clearUserCache(user.id)
    toast.success(ar ? 'تم تطبيق التوزيع المقترح ✨' : 'Suggested split applied ✨')
    setSaving(false)
    await load()
  }

  const available = monthlyIncome - totalDebtPayments - totalGoalSavings
  const totalBudgeted = budgets.reduce((a, b) => a + Number(b.monthly_limit), 0)
  const totalSpent = budgets.reduce((a, b) => a + (spending[b.category] ?? 0), 0)
  const months = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 100px' }}>
      <PageHeader
        title={ar ? 'الميزانية' : 'Budget'}
        subtitle={ar ? 'خطط مالياً كالمحترفين' : 'Plan your finances like a pro'}
        action={<button onClick={openAdd} style={{ padding: '10px 18px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>+ {t('add')}</button>}
      />

      {/* اختيار الشهر */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto' }}>
        {months.map((m, i) => (
          <button key={i} onClick={() => setMonth(i + 1)} style={{ padding: '7px 14px', borderRadius: 100, background: month === i + 1 ? 'var(--accent-blue)' : 'var(--bg-card)', border: `1px solid ${month === i + 1 ? 'var(--accent-blue)' : 'var(--border)'}`, color: month === i + 1 ? 'white' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {m}
          </button>
        ))}
      </div>

      {/* ملخص مالي */}
      {monthlyIncome > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              {ar ? '📋 ملخص الشهر' : '📋 Monthly Summary'}
            </div>
            {[
              { label: ar ? '💵 الدخل' : '💵 Income', value: monthlyIncome, color: 'var(--accent-green-light)', sign: '+' },
              { label: ar ? '💳 أقساط الديون' : '💳 Debt Payments', value: totalDebtPayments, color: 'var(--accent-red-light)', sign: '-' },
              { label: ar ? '🎯 الأهداف' : '🎯 Goals', value: totalGoalSavings, color: 'var(--accent-amber)', sign: '-' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.color, fontFamily: 'monospace' }}>{row.sign}{row.value.toFixed(0)} JOD</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: totalBudgeted > 0 ? 12 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{ar ? '✅ المتاح للإنفاق' : '✅ Available to Spend'}</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: available >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>{available.toFixed(0)} JOD</span>
            </div>
            {totalBudgeted > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>{ar ? 'مُنفق من الفئات' : 'Spent from categories'}</span>
                  <span style={{ fontWeight: 700, color: totalSpent > totalBudgeted ? 'var(--accent-red-light)' : 'var(--text-muted)' }}>{totalSpent.toFixed(0)} / {totalBudgeted.toFixed(0)} JOD</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%`, background: totalSpent > totalBudgeted ? 'var(--accent-red)' : 'var(--accent-blue)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* المستشار المالي */}
      <FinancialAdvisor
        budgets={budgets} spending={spending} income={monthlyIncome}
        available={available} totalBudgeted={totalBudgeted} totalSpent={totalSpent} ar={ar}
      />

      {/* قاعدة 50/30/20 */}
      <Rule502030
        income={monthlyIncome} totalDebtPayments={totalDebtPayments}
        totalGoalSavings={totalGoalSavings} ar={ar} onApply={handleApply502030}
      />

      {/* قائمة الفئات */}
      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 20, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite' }} />)
        ) : budgets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{ar ? 'لا توجد فئات بعد' : 'No categories yet'}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{ar ? 'أضف ميزانية أو جرب قاعدة 50/30/20 ⬆️' : 'Add a budget or try the 50/30/20 rule ⬆️'}</div>
          </div>
        ) : budgets.map(b => {
          const cat = CATEGORIES.find(c => c.key === b.category)
          const spent = spending[b.category] ?? 0
          const limit = Number(b.monthly_limit)
          const pct = Math.min((spent / limit) * 100, 100)
          const over = spent > limit
          const warn = !over && pct > 80
          const remaining = Math.max(0, limit - spent)
          return (
            <div key={b.id} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 20, border: `1px solid ${over ? 'rgba(239,68,68,0.3)' : warn ? 'rgba(245,158,11,0.2)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: over ? 'rgba(239,68,68,0.1)' : warn ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {cat?.icon ?? '📝'}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{ar ? cat?.ar : cat?.en ?? b.category}</div>
                    <div style={{ fontSize: 12, color: over ? 'var(--accent-red-light)' : warn ? '#F59E0B' : 'var(--text-muted)', fontWeight: 600 }}>
                      {spent.toFixed(0)} / {limit.toFixed(0)} JOD
                      {over && <span> ⚠️ {ar ? 'تجاوزت!' : 'Over!'}</span>}
                      {warn && !over && <span> 🔶 {ar ? 'اقتربت' : 'Near limit'}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: over ? 'var(--accent-red-light)' : 'var(--accent-green-light)', fontFamily: 'monospace' }}>{Math.round(pct)}%</div>
                  </div>
                  <button onClick={() => openEdit(b)} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
                  <button onClick={() => handleDelete(b.id)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️</button>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--accent-red)' : warn ? '#F59E0B' : 'var(--accent-green)', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{ar ? 'متبقي' : 'Remaining'}: <span style={{ color: over ? 'var(--accent-red-light)' : 'var(--accent-green-light)', fontWeight: 700 }}>{remaining.toFixed(0)} JOD</span></span>
                <span>{ar ? 'الحد' : 'Limit'}: {limit.toFixed(0)} JOD</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal إضافة/تعديل */}
      {showForm && (
        <Modal title={editingId ? (ar ? 'تعديل الميزانية' : 'Edit Budget') : (ar ? 'ميزانية جديدة' : 'New Budget')} onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!editingId && (
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>{ar ? 'الفئة' : 'Category'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))} style={{ padding: '10px 4px', borderRadius: 12, background: form.category === cat.key ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)', border: `1px solid ${form.category === cat.key ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`, color: form.category === cat.key ? 'var(--accent-blue-light)' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <span>{ar ? cat.ar : cat.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>{ar ? 'الحد الشهري (JOD)' : 'Monthly Limit (JOD)'}</label>
              <input type="number" value={form.monthly_limit} onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))} placeholder="0.00" autoFocus style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              {!editingId && available > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>💡 {ar ? `المتاح للإنفاق: ${available.toFixed(0)} JOD` : `Available to spend: ${available.toFixed(0)} JOD`}</div>
              )}
            </div>
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
              {saving ? '...' : (editingId ? t('save') : t('add'))}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
