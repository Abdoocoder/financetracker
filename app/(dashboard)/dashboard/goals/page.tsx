'use client'
export const dynamic = 'force-dynamic'
import { clearUserCache } from '@/lib/cache'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import type { SavingsGoal } from '@/types'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { ListSkeleton, Skeleton } from '@/components/ui/skeleton'

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const { user: currentUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯' })
  const [saving, setSaving] = useState(false)
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null)
  const [savingAmount, setSavingAmount] = useState('')
  const supabase = createClient()
  const { t, lang, currentLang } = useI18n()
  const baseCurrency = currentUser?.user_metadata?.base_currency || 'USD'
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load() })

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const cacheKey = `goals_${user.id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { try { const { d, ts } = JSON.parse(cached); if (Date.now() - ts < 30000) { setGoals(d); setLoading(false); return } } catch {} }
    const { data } = await supabase.from('savings_goals').select('*').eq('user_id', user.id).order('created_at')
    const result = data ?? []
    setGoals(result)
    setLoading(false)
    try { sessionStorage.setItem(`goals_${user.id}`, JSON.stringify({ d: result, ts: Date.now() })) } catch {}
  }, [supabase, currentUser])

  useEffect(() => { load() }, [load])

  function startEdit(g: any) {
    setEditingId(g.id)
    setForm({ name: g.name, target_amount: g.target_amount.toString(), current_amount: g.current_amount.toString(), target_date: g.target_date ?? '', icon: g.icon ?? '🎯' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false); setEditingId(null)
    setForm({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯' })
  }

  function validateGoalForm(): string | null {
    if (!form.name.trim()) return t('goals_name') + ' ' + (t('toast_fill_required'))
    const target = parseFloat(form.target_amount.replace(',', '.'))
    if (!form.target_amount.trim()) return t('goals_target') + ': ' + t('toast_fill_required')
    if (isNaN(target) || target <= 0) return t('goals_target') + ': ' + t('goals_target_invalid')
    const current = parseFloat(form.current_amount.replace(',', '.'))
    if (form.current_amount && (isNaN(current) || current < 0)) return t('goals_current') + ': ' + t('goals_current_invalid')
    if (!isNaN(current) && current > target) return t('goals_current_exceeds_target')
    return null
  }

  function mapGoalError(error: any): string {
    const msg = error?.message ?? ''
    if (msg.includes('check') && msg.includes('target_amount')) return t('goals_target_invalid')
    if (msg.includes('check') && msg.includes('current_amount')) return t('goals_current_invalid')
    if (msg.includes('duplicate') || msg.includes('unique')) return t('goals_name_error')
    if (msg.includes('foreign key')) return t('goals_user_error')
    return t('toast_error_save')
  }

  async function saveGoal() {
    const validationError = validateGoalForm()
    if (validationError) { toast.warning(validationError); return }
    setSaving(true)
    const user = currentUser
    if (!user) { setSaving(false); return }
    try {
      if (editingId) {
        const { error } = await supabase.from('savings_goals').update({ name: form.name.trim(), target_amount: parseFloat(form.target_amount.replace(',', '.')), current_amount: parseFloat(form.current_amount.replace(',', '.')) || 0, target_date: form.target_date || null, icon: form.icon }).eq('id', editingId)
        if (error) { toast.error(mapGoalError(error)); return }
        toast.success(t('toast_edited'))
      } else {
        const { error } = await supabase.from('savings_goals').insert({ user_id: user.id, name: form.name.trim(), target_amount: parseFloat(form.target_amount.replace(',', '.')), current_amount: parseFloat(form.current_amount.replace(',', '.')) || 0, target_date: form.target_date || null, icon: form.icon })
        if (error) { toast.error(mapGoalError(error)); return }
        toast.success(t('toast_goal_added'))
      }
      cancelForm(); load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) { toast.error(t('toast_error_delete')); return }
    toast.success(t('toast_deleted')); load()
  }

  async function addSaving(goalId: string) {
    const amount = parseFloat(savingAmount)
    if (!amount || amount <= 0) { toast.warning(t('toast_fill_required')); return }
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    const newAmount = Math.min(goal.current_amount + amount, goal.target_amount)
    const { error } = await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', goalId)
    if (error) { toast.error(t('toast_error_save')); return }
    if (newAmount >= goal.target_amount) toast.success(`${t('toast_goal_reached')} "${goal.name}"`)
    else toast.success(`${t('toast_saving_added')} ${amount} ${baseCurrency}`)
    setSavingGoalId(null); setSavingAmount(''); load()
  }

  const icons = ['🎯','🏠','✈️','📚','🚗','💍','🎓','💻','📱','🏋️']
  const totalTarget = goals.reduce((a, g) => a + g.target_amount, 0)
  const totalSaved  = goals.reduce((a, g) => a + g.current_amount, 0)

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-24 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <ListSkeleton count={3} />
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto" ref={pageRef}>
      <PullToRefreshIndicator refreshing={refreshing} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('goals_title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{goals.length} {t('goals_count')}</p>
        </div>
        <button onClick={() => { cancelForm(); setShowForm(true) }}
          className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue" style={{ fontFamily: 'inherit' }}>
          + {t('goals_add')}
        </button>
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3 text-center">
            <div className="text-base font-black font-mono" style={{ color: 'var(--accent-green-light)' }}>{totalSaved.toFixed(0)}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('goals_saved')} {baseCurrency}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-base font-black font-mono" style={{ color: 'var(--accent-blue-light)' }}>{totalTarget.toFixed(0)}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('goals_target_lbl')} {baseCurrency}</div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: editingId ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>
            {editingId ? t('goals_edit') : t('goals_new')}
          </h3>
          <div className="mb-3">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>{t('goals_icon')}</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(i => (
                <button key={i} onClick={() => setForm(p => ({ ...p, icon: i }))}
                  className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{ background: form.icon === i ? 'rgba(59,130,246,0.2)' : 'var(--bg-secondary)', border: form.icon === i ? '2px solid var(--accent-blue)' : '1px solid var(--border)' }}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('goals_name'),    key: 'name',           type: 'text',   col: 'col-span-2' },
              { label: t('goals_target'),  key: 'target_amount',  type: 'number', col: '' },
              { label: t('goals_current'), key: 'current_amount', type: 'number', col: '' },
              { label: t('goals_date'),    key: 'target_date',    type: 'date',   col: 'col-span-2' },
            ].map(f => (
              <div key={f.key} className={f.col}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveGoal} disabled={saving}
              className="flex-1 py-3 rounded-xl text-white text-sm font-black disabled:opacity-50"
              style={{ background: editingId ? '#f59e0b' : 'var(--accent-blue)', fontFamily: 'inherit' }}>
              {saving ? '⏳ ...' : editingId ? t('goals_save_edit') : t('goals_save')}
            </button>
            <button onClick={cancelForm} className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              {t('goals_cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
          const remaining = goal.target_amount - goal.current_amount
          return (
            <div key={goal.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: 'var(--bg-secondary)' }}>{goal.icon || '🎯'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black" style={{ color: 'var(--text-primary)' }}>{goal.name}</div>
                  {goal.target_date && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>📅 {goal.target_date}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="font-black font-mono text-sm ml-1" style={{ color: pct >= 100 ? 'var(--accent-green-light)' : 'var(--accent-blue-light)' }}>
                    {pct >= 100 ? '✅' : `${pct.toFixed(0)}%`}
                  </div>
                  <button onClick={() => startEdit(goal)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>✏️</button>
                  <button onClick={() => deleteGoal(goal.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>🗑️</button>
                </div>
              </div>
              <div className="progress-track mb-2">
                <div className="progress-fill gradient-blue" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{goal.current_amount.toFixed(0)}</span> / {goal.target_amount.toFixed(0)} {baseCurrency}
                </div>
                {remaining > 0 && (
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('goals_remaining')}: <span className="font-mono">{remaining.toFixed(0)} {baseCurrency}</span>
                  </div>
                )}
              </div>
              {savingGoalId === goal.id ? (
                <div className="flex gap-2 mt-2">
                  <input type="number" value={savingAmount} onChange={e => setSavingAmount(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none text-center"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-green)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    placeholder={`0 ${baseCurrency}`} autoFocus onKeyDown={e => e.key === 'Enter' && addSaving(goal.id)} />
                  <button onClick={() => addSaving(goal.id)} className="px-4 py-2 rounded-xl gradient-green text-white text-sm font-black">✓</button>
                  <button onClick={() => { setSavingGoalId(null); setSavingAmount('') }} className="px-3 py-2 rounded-xl text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>✕</button>
                </div>
              ) : (
                remaining > 0 && (
                  <button onClick={() => setSavingGoalId(goal.id)} className="w-full py-2 rounded-xl text-sm font-bold badge-green mt-1">
                    {t('goals_add_saving')}
                  </button>
                )
              )}
            </div>
          )
        })}
        {goals.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">🎯</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>{t('goals_empty')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
