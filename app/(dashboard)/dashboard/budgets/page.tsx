'use client'
import { clearUserCache } from '@/lib/cache'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import type { Budget } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { ListSkeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const CATEGORIES = [
  { key: 'طعام', ar: 'طعام', en: 'Food', icon: '🍔' },
  { key: 'مواصلات', ar: 'مواصلات', en: 'Transport', icon: '🚗' },
  { key: 'فواتير', ar: 'فواتير', en: 'Bills', icon: '💡' },
  { key: 'صحة', ar: 'صحة', en: 'Health', icon: '💊' },
  { key: 'ملابس', ar: 'ملابس', en: 'Clothes', icon: '👕' },
  { key: 'ترفيه', ar: 'ترفيه', en: 'Entertainment', icon: '🎮' },
  { key: 'تعليم', ar: 'تعليم', en: 'Education', icon: '📚' },
  { key: 'أخرى', ar: 'أخرى', en: 'Other', icon: '📝' },
]

const insightCls = {
  danger:  { wrap: 'bg-[rgba(239,68,68,0.08)]  border border-[rgba(239,68,68,0.2)]',  text: 'text-[#F87171]' },
  warning: { wrap: 'bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)]', text: 'text-[#FCD34D]' },
  success: { wrap: 'bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]', text: 'text-[#34D399]' },
  info:    { wrap: 'bg-[rgba(59,126,246,0.08)]  border border-[rgba(59,126,246,0.2)]',  text: 'text-[#6BA3FF]' },
}

// ── المستشار المالي الذكي ─────────────────────────────
function FinancialAdvisor({ budgets, spending, income, available, totalBudgeted, totalSpent, lang, t, baseCurrency }: {
  budgets: Budget[]; spending: Record<string, number>; income: number
  available: number; totalBudgeted: number; totalSpent: number; lang: string; t: any; baseCurrency: string
}) {
  const insights: { icon: string; text: string; type: 'warning' | 'success' | 'info' | 'danger' }[] = []

  budgets.forEach(b => {
    const spent = spending[b.category] ?? 0
    const limit = Number(b.monthly_limit)
    const cat = CATEGORIES.find(c => c.key === b.category)
    const name = lang === 'ar' ? cat?.ar : cat?.en
    if (spent > limit) {
      insights.push({ icon: '🔴', type: 'danger', text: t('budget_insight_over', name || '', (spent - limit).toFixed(0), baseCurrency) })
    } else if (limit > 0 && (spent / limit) > 0.8) {
      insights.push({ icon: '🔶', type: 'warning', text: t('budget_insight_near', name || '', (limit - spent).toFixed(0), baseCurrency) })
    }
  })

  if (totalBudgeted > available && available > 0) {
    insights.push({ icon: '⚠️', type: 'warning', text: t('budget_insight_deficit', (totalBudgeted - available).toFixed(0), baseCurrency) })
  }

  if (income > 0 && totalSpent > 0) {
    const spendRatio = (totalSpent / income) * 100
    if (spendRatio > 90) {
      insights.push({ icon: '🚨', type: 'danger', text: t('budget_insight_ratio_danger', spendRatio.toFixed(0)) })
    } else if (spendRatio < 70) {
      insights.push({ icon: '✅', type: 'success', text: t('budget_insight_ratio_success', spendRatio.toFixed(0)) })
    }
  }

  if (budgets.length === 0) {
    insights.push({ icon: '💡', type: 'info', text: t('budget_insight_empty') })
  }

  if (available > income * 0.2 && income > 0) {
    insights.push({ icon: '💰', type: 'success', text: t('budget_insight_surplus', available.toFixed(0), baseCurrency) })
  }

  if (insights.length === 0) return null

  return (
    <div className="px-4 pb-1">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] overflow-hidden">
        <div className="px-4 py-[14px] pb-[10px] flex items-center gap-2 border-b border-[var(--border)]">
          <span className="text-[18px]">🤖</span>
          <span className="text-[13px] font-black text-[var(--text-primary)]">
            {t('budget_advisor_title')}
          </span>
        </div>
        <div className="px-3 py-[10px] flex flex-col gap-2">
          {insights.slice(0, 3).map((ins, i) => {
            const c = insightCls[ins.type]
            return (
              <div key={i} className={`px-3 py-[10px] rounded-xl flex items-center gap-[10px] ${c.wrap}`}>
                <span className="text-base shrink-0">{ins.icon}</span>
                <span className={`text-[12px] font-bold leading-[1.5] ${c.text}`}>{ins.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── قاعدة 50/30/20 ───────────────────────────────────
function Rule502030({ income, totalDebtPayments, totalGoalSavings, t, onApply }: {
  income: number; totalDebtPayments: number; totalGoalSavings: number
  t: any; onApply: (suggestions: { category: string; limit: number }[]) => void
}) {
  const [show, setShow] = useState(false)
  if (income <= 0) return null

  const available = income - totalDebtPayments - totalGoalSavings
  const needs   = Math.round(available * 0.50)
  const wants   = Math.round(available * 0.30)
  const savings = Math.round(available * 0.20)

  const suggestions = [
    { category: 'فواتير',    limit: Math.round(needs * 0.4) },
    { category: 'طعام',      limit: Math.round(needs * 0.35) },
    { category: 'مواصلات',   limit: Math.round(needs * 0.25) },
    { category: 'ترفيه',     limit: Math.round(wants * 0.5) },
    { category: 'ملابس',     limit: Math.round(wants * 0.3) },
    { category: 'صحة',       limit: Math.round(wants * 0.2) },
  ]

  const ruleParts = [
    { label: t('budget_rule_needs'),   value: needs,   pct: '50%', textCls: 'text-[var(--accent-blue-light)]',   bgCls: 'bg-[var(--accent-blue-dim)]' },
    { label: t('budget_rule_wants'),   value: wants,   pct: '30%', textCls: 'text-[var(--accent-purple-light)]', bgCls: 'bg-[var(--accent-purple-dim)]' },
    { label: t('budget_rule_savings'), value: savings, pct: '20%', textCls: 'text-[var(--accent-green-light)]',  bgCls: 'bg-[var(--accent-green-dim)]' },
  ]

  return (
    <div className="px-4 pb-1">
      <div className="bg-[linear-gradient(135deg,rgba(59,126,246,0.08),rgba(139,92,246,0.06))] border border-[rgba(59,126,246,0.15)] rounded-[20px] overflow-hidden">
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="w-full px-4 py-[14px] flex items-center justify-between bg-transparent border-none cursor-pointer font-[inherit]"
        >
          <div className="flex items-center gap-2">
            <span className="text-[18px]">⚖️</span>
            <span className="text-[13px] font-black text-[var(--text-primary)]">
              {t('budget_rule_title')}
            </span>
          </div>
          <span className={`text-[11px] text-[var(--text-muted)] inline-block transition-transform duration-200 ${show ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {show && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 mb-[14px]">
              {ruleParts.map((item, i) => (
                <div key={i} className={`${item.bgCls} rounded-[14px] px-[10px] py-3 text-center`}>
                  <div className={`text-base font-black font-mono ${item.textCls}`}>{item.pct}</div>
                  <div className={`text-[13px] font-extrabold font-mono mt-0.5 ${item.textCls}`}>{item.value}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5 font-semibold">{item.label}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { onApply(suggestions); setShow(false) }}
              className="w-full py-[11px] rounded-xl bg-[var(--accent-blue)] border-none text-white text-[13px] font-extrabold cursor-pointer font-[inherit]"
            >
              {t('budget_rule_apply')}
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
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [baseCurrency, setBaseCurrency] = useState('JOD')
  const [totalDebtPayments, setTotalDebtPayments] = useState(0)
  const [totalGoalSavings, setTotalGoalSavings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'طعام', monthly_limit: '' })

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    setLoading(true)
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0]
    const [budgetRes, txRes, profileRes, debtRes, goalRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month).eq('year', year),
      supabase.from('transactions').select('category,amount,type').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay),
      supabase.from('profiles').select('monthly_income, currency').eq('id', user.id).single(),
      supabase.from('debts').select('monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('savings_goals').select('current_amount,target_amount').eq('user_id', user.id),
    ])
    setBudgets(budgetRes.data ?? [])
    const spendMap: Record<string, number> = {}
      ; (txRes.data ?? []).forEach((tx: any) => {
        if (tx.type === 'expense') spendMap[tx.category] = (spendMap[tx.category] ?? 0) + Number(tx.amount)
      })
    setSpending(spendMap)
    const actualIncome = (txRes.data ?? []).filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
    setMonthlyIncome(actualIncome || (profileRes.data?.monthly_income ?? 0))
    setBaseCurrency(profileRes.data?.currency || 'JOD')
    setTotalDebtPayments((debtRes.data ?? []).reduce((a: number, d: any) => a + Number(d.monthly_payment), 0))
    const goalTotal = (goalRes.data ?? []).reduce((a: number, g: any) => {
      const remaining = Number(g.target_amount) - Number(g.current_amount)
      return a + (remaining > 0 ? Math.min(remaining * 0.1, Number(g.target_amount) * 0.05) : 0)
    }, 0)
    setTotalGoalSavings(Math.round(goalTotal))
    setLoading(false)
  }, [currentUser, month, year, supabase])

  useEffect(() => { load() }, [load])

  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load() })

  function openAdd() { setForm({ category: 'طعام', monthly_limit: '' }); setEditingId(null); setShowForm(true) }
  function openEdit(b: any) { setForm({ category: b.category, monthly_limit: String(b.monthly_limit) }); setEditingId(b.id); setShowForm(true) }

  async function handleSave() {
    const user = currentUser
    if (!user || !form.monthly_limit) { toast.error(t('settings_enter_limit') || (lang === 'ar' ? 'أدخل الحد' : 'Enter a limit')); return }
    setSaving(true)
    if (editingId) {
      await supabase.from('budgets').update({ monthly_limit: parseFloat(form.monthly_limit) }).eq('id', editingId)
    } else {
      const { error } = await supabase.from('budgets').insert({ user_id: user.id, category: form.category, monthly_limit: parseFloat(form.monthly_limit), month, year })
      if (error?.code === '23505') { toast.error(t('budget_category_exists')); setSaving(false); return }
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
    setConfirmDeleteId(null)
    await load()
  }

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
    toast.success(t('budget_apply_success'))
    setSaving(false)
    await load()
  }

  const available     = monthlyIncome - totalDebtPayments - totalGoalSavings
  const totalBudgeted = budgets.reduce((a, b) => a + Number(b.monthly_limit), 0)
  const totalSpent    = budgets.reduce((a, b) => a + (spending[b.category] ?? 0), 0)
  const overallPct    = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0
  const months = lang === 'ar'
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div ref={pageRef} className="animate-fade-in pb-[100px]">
      <PullToRefreshIndicator refreshing={refreshing} />
      <PageHeader
        title={t('budget_title')}
        subtitle={t('budget_plan_pro')}
        action={
          <button
            type="button"
            onClick={openAdd}
            className="px-[18px] py-[10px] rounded-xl bg-[var(--accent-blue)] border-none text-white text-[13px] font-extrabold cursor-pointer font-[inherit]"
          >
            + {t('add')}
          </button>
        }
      />

      {/* اختيار الشهر */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
        {months.map((m, i) => {
          const isActive = month === i + 1
          const lbl = lang === 'en' ? `View budgets for ${m}` : `عرض ميزانيات ${m}`
          const cls = `px-[14px] py-[7px] rounded-full text-[12px] font-bold cursor-pointer font-[inherit] whitespace-nowrap shrink-0 border ${
            isActive ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white'
                     : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
          }`
          return isActive ? (
            <button key={i} type="button" onClick={() => setMonth(i + 1)} aria-label={lbl} aria-pressed="true" className={cls}>{m}</button>
          ) : (
            <button key={i} type="button" onClick={() => setMonth(i + 1)} aria-label={lbl} aria-pressed="false" className={cls}>{m}</button>
          )
        })}
      </div>

      {/* ملخص مالي */}
      {monthlyIncome > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-4">
            <div className="text-[12px] font-black text-[var(--text-secondary)] tracking-[0.08em] uppercase mb-3">
              {t('budget_monthly_summary')}
            </div>
            {[
              { label: t('budget_income_row'), value: monthlyIncome,      color: 'text-[var(--accent-green-light)]', sign: '+' },
              { label: t('budget_debt_row'),   value: totalDebtPayments,  color: 'text-[var(--accent-red-light)]',   sign: '-' },
              { label: t('budget_goals_row'),  value: totalGoalSavings,   color: 'text-[var(--accent-amber)]',       sign: '-' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-[var(--text-muted)]">{row.label}</span>
                <span className={`text-[14px] font-extrabold font-mono ${row.color}`}>{row.sign}{row.value.toFixed(0)} JOD</span>
              </div>
            ))}
            <div className="h-px bg-[var(--border)] my-[10px]" />
            <div className={`flex justify-between items-center ${totalBudgeted > 0 ? 'mb-3' : ''}`}>
              <span className="text-[14px] font-extrabold text-[var(--text-primary)]">{t('budget_available')}</span>
              <span className={`text-[20px] font-black font-mono ${available >= 0 ? 'text-[var(--accent-green-light)]' : 'text-[var(--accent-red-light)]'}`}>
                {available.toFixed(0)} {baseCurrency}
              </span>
            </div>
            {totalBudgeted > 0 && (
              <>
                <style>{`.budget-overall-fill{width:${overallPct.toFixed(2)}%}`}</style>
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-[6px]">
                  <span>{t('budget_spent_of')}</span>
                  <span className={`font-bold ${totalSpent > totalBudgeted ? 'text-[var(--accent-red-light)]' : 'text-[var(--text-muted)]'}`}>
                    {totalSpent.toFixed(0)} / {totalBudgeted.toFixed(0)} {baseCurrency}
                  </span>
                </div>
                <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className={`h-full budget-overall-fill rounded-full transition-[width] duration-500 ease-in-out ${totalSpent > totalBudgeted ? 'bg-[var(--accent-red)]' : 'bg-[var(--accent-blue)]'}`} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* المستشار المالي */}
      <FinancialAdvisor
        budgets={budgets} spending={spending} income={monthlyIncome}
        available={available} totalBudgeted={totalBudgeted} totalSpent={totalSpent} lang={lang} t={t} baseCurrency={baseCurrency}
      />

      {/* قاعدة 50/30/20 */}
      <Rule502030
        income={monthlyIncome} totalDebtPayments={totalDebtPayments}
        totalGoalSavings={totalGoalSavings} t={t} onApply={handleApply502030}
      />

      {/* قائمة الفئات */}
      <div className="px-4 pt-3 flex flex-col gap-3">
        {loading ? (
          <ListSkeleton count={3} />
        ) : budgets.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <div className="text-[40px] mb-3">📊</div>
            <div className="text-[15px] font-bold">{t('budget_empty_title')}</div>
            <div className="text-[13px] mt-[6px]">{t('budget_empty_sub')}</div>
          </div>
        ) : (
          <>
            <style>{budgets.map(b => {
              const spent = spending[b.category] ?? 0
              const limit = Number(b.monthly_limit)
              const pct = Math.min((spent / limit) * 100, 100)
              return `.bpct-${b.id.replace(/-/g, '')}{width:${pct.toFixed(2)}%}`
            }).join('')}</style>
            {budgets.map(b => {
              const cat       = CATEGORIES.find(c => c.key === b.category)
              const spent     = spending[b.category] ?? 0
              const limit     = Number(b.monthly_limit)
              const over      = spent > limit
              const warn      = !over && (spent / limit) > 0.8
              const remaining = Math.max(0, limit - spent)
              const pct       = Math.min((spent / limit) * 100, 100)
              const safeId    = b.id.replace(/-/g, '')
              return (
                <div
                  key={b.id}
                  className={`bg-[var(--bg-card)] rounded-[20px] p-5 border ${
                    over  ? 'border-[rgba(239,68,68,0.3)]'  :
                    warn  ? 'border-[rgba(245,158,11,0.2)]' :
                            'border-[var(--border)]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-[10px]">
                      <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px] ${
                        over ? 'bg-[rgba(239,68,68,0.1)]' : warn ? 'bg-[rgba(245,158,11,0.1)]' : 'bg-[var(--bg-secondary)]'
                      }`}>
                        {cat?.icon ?? '📝'}
                      </div>
                      <div>
                        <div className="text-[15px] font-extrabold text-[var(--text-primary)]">
                          {lang === 'ar' ? cat?.ar : cat?.en ?? b.category}
                        </div>
                        <div className={`text-[12px] font-semibold ${over ? 'text-[var(--accent-red-light)]' : warn ? 'text-[#F59E0B]' : 'text-[var(--text-muted)]'}`}>
                          {spent.toFixed(0)} / {limit.toFixed(0)} {baseCurrency}
                          {over && <span> ⚠️ {t('budget_over')}</span>}
                          {warn && !over && <span> 🔶 {t('budget_near')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="text-center">
                        <div className={`text-base font-black font-mono ${over ? 'text-[var(--accent-red-light)]' : 'text-[var(--accent-green-light)]'}`}>
                          {Math.round(pct)}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        aria-label={lang === 'en' ? 'Edit budget' : 'تعديل الميزانية'}
                        className="px-[10px] py-[6px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-[12px] cursor-pointer font-[inherit]"
                      >✏️</button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(b.id)}
                        aria-label={lang === 'en' ? 'Delete budget' : 'حذف الميزانية'}
                        className="px-[10px] py-[6px] rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--accent-red-light)] text-[12px] cursor-pointer font-[inherit]"
                      >🗑️</button>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-2">
                    <div className={`h-full bpct-${safeId} rounded-full transition-[width] duration-500 ease-in-out ${
                      over ? 'bg-[var(--accent-red)]' : warn ? 'bg-[#F59E0B]' : 'bg-[var(--accent-green)]'
                    }`} />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] flex justify-between">
                    <span>
                      {t('budget_remaining')}:{' '}
                      <span className={`font-bold ${over ? 'text-[var(--accent-red-light)]' : 'text-[var(--accent-green-light)]'}`}>
                        {remaining.toFixed(0)} {baseCurrency}
                      </span>
                    </span>
                    <span>{t('budget_limit')}: {limit.toFixed(0)} {baseCurrency}</span>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Modal إضافة/تعديل */}
      {showForm && (
        <Modal title={editingId ? t('budget_edit') : t('budget_new')} onClose={() => setShowForm(false)}>
          <div className="flex flex-col gap-4">
            {!editingId && (
              <div>
                <label className="text-[13px] text-[var(--text-muted)] font-bold block mb-2">{t('budget_category')}</label>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(64px,1fr))] gap-2">
                  {CATEGORIES.map(cat => {
                    const isSel = form.category === cat.key
                    const catLbl = lang === 'ar' ? cat.ar : cat.en
                    const catCls = `py-[10px] px-1 rounded-xl text-[11px] font-bold cursor-pointer font-[inherit] flex flex-col items-center gap-1 border ${
                      isSel ? 'bg-[var(--accent-blue-dim)] border-[rgba(59,126,246,0.3)] text-[var(--accent-blue-light)]'
                            : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)]'
                    }`
                    return isSel ? (
                      <button key={cat.key} type="button" onClick={() => setForm(f => ({ ...f, category: cat.key }))} aria-label={catLbl} aria-pressed="true" className={catCls}>
                        <span className="text-[18px]">{cat.icon}</span><span>{catLbl}</span>
                      </button>
                    ) : (
                      <button key={cat.key} type="button" onClick={() => setForm(f => ({ ...f, category: cat.key }))} aria-label={catLbl} aria-pressed="false" className={catCls}>
                        <span className="text-[18px]">{cat.icon}</span><span>{catLbl}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div>
              <label className="text-[13px] text-[var(--text-muted)] font-bold block mb-2">
                {t('budget_limit_monthly').replace('{}', baseCurrency)}
              </label>
              <input
                type="number"
                value={form.monthly_limit}
                onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))}
                placeholder="0.00"
                aria-label={t('budget_limit_monthly').replace('{}', baseCurrency)}
                autoFocus
                className="w-full px-[14px] py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-base font-[inherit] outline-none box-border"
              />
              {!editingId && available > 0 && (
                <div className="text-[11px] text-[var(--text-muted)] mt-[6px]">
                  💡 {t('budget_available_hint').replace('{1}', available.toFixed(0).toString()).replace('{2}', baseCurrency)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`w-full py-[14px] rounded-[14px] bg-[var(--accent-blue)] border-none text-white text-[15px] font-extrabold font-[inherit] ${saving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {saving ? '⏳ ...' : (editingId ? t('save') : t('add'))}
            </button>
          </div>
        </Modal>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title={t('budget_delete_title') || (lang === 'ar' ? 'حذف الميزانية' : 'Delete Budget')}
          message={t('budget_delete_msg') || (lang === 'ar' ? 'هل أنت متأكد من حذف هذه الميزانية؟ سيتم استرداد مبالغ الإنفاق إلى الفئة الافتراضية.' : 'Are you sure you want to delete this budget? Spending will revert to default category.')}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
