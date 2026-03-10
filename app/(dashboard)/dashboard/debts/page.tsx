'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', original_amount: '', remaining_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '' })
  const [saving, setSaving] = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [payingSaving, setPayingSaving] = useState(false)
  const supabase = createClient()
  const { t } = useI18n()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false).order('priority')
    setDebts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function startEdit(d: any) {
    setEditingId(d.id)
    setForm({ name: d.name, original_amount: d.original_amount.toString(), remaining_amount: d.remaining_amount.toString(), monthly_payment: d.monthly_payment?.toString() ?? '', due_date: d.due_date ?? '', priority: d.priority.toString(), notes: d.notes ?? '' })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false); setEditingId(null)
    setForm({ name: '', original_amount: '', remaining_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '' })
  }

  async function saveDebt() {
    if (!form.name || !form.original_amount) { toast.warning(t('toast_fill_required')); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editingId) {
      const { error } = await supabase.from('debts').update({ name: form.name, original_amount: parseFloat(form.original_amount), remaining_amount: parseFloat(form.remaining_amount), monthly_payment: parseFloat(form.monthly_payment) || 0, due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null }).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('debts').insert({ user_id: user.id, name: form.name, original_amount: parseFloat(form.original_amount), remaining_amount: parseFloat(form.original_amount), monthly_payment: parseFloat(form.monthly_payment) || 0, due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null })
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_debt_added'))
    }
    cancelForm(); setSaving(false); load()
  }

  async function deleteDebt(id: string) {
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (error) { toast.error(t('toast_error_delete')); return }
    toast.success(t('toast_deleted')); load()
  }

  async function makePayment(debtId: string) {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { toast.warning(t('toast_fill_required')); return }
    setPayingSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    await supabase.from('debt_payments').insert({ debt_id: debtId, user_id: user.id, amount, payment_date: new Date().toISOString().split('T')[0] })
    await supabase.from('debts').update({ remaining_amount: newRemaining, is_paid: newRemaining === 0 }).eq('id', debtId)
    if (newRemaining === 0) toast.success(t('toast_debt_paid'))
    else toast.success(`${t('toast_payment_done')} ${amount} JOD`)
    setPaymentDebtId(null); setPaymentAmount(''); setPayingSaving(false); load()
  }

  const totalRemaining = debts.reduce((a, d) => a + d.remaining_amount, 0)
  const totalOriginal  = debts.reduce((a, d) => a + d.original_amount, 0)
  const paidPct = totalOriginal > 0 ? ((totalOriginal - totalRemaining) / totalOriginal * 100) : 0
  const priorityColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#94a3b8', '#94a3b8']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-3xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('debts_title')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{debts.length} {t('debts_active')}</p>
        </div>
        <button onClick={() => { cancelForm(); setShowForm(true) }}
          className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue" style={{ fontFamily: 'inherit' }}>
          + {t('debts_add')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('debts_total'),    value: `${totalRemaining.toFixed(0)}`, color: 'var(--accent-red-light)'   },
          { label: t('debts_paid_pct'), value: `${paidPct.toFixed(0)}%`,       color: 'var(--accent-green-light)' },
          { label: t('debts_count'),    value: `${debts.length}`,              color: 'var(--accent-blue-light)'  },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="text-lg font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex justify-between text-xs mb-2">
          <span style={{ color: 'var(--text-secondary)' }}>{t('debts_progress')}</span>
          <span className="font-bold" style={{ color: 'var(--accent-green-light)' }}>{paidPct.toFixed(0)}%</span>
        </div>
        <div className="progress-track h-3">
          <div className="progress-fill gradient-green" style={{ width: `${Math.min(paidPct, 100)}%` }} />
        </div>
      </div>

      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: editingId ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>
            {editingId ? t('debts_edit') : t('debts_new')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('debts_name'),     key: 'name',             type: 'text',   col: 'col-span-2' },
              { label: t('debts_original'), key: 'original_amount',  type: 'number', col: '' },
              { label: t('debts_remaining'),key: 'remaining_amount', type: 'number', col: '' },
              { label: t('debts_monthly'),  key: 'monthly_payment',  type: 'number', col: '' },
              { label: t('debts_due_date'), key: 'due_date',         type: 'date',   col: '' },
              { label: t('debts_notes'),    key: 'notes',            type: 'text',   col: 'col-span-2' },
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
            <button onClick={saveDebt} disabled={saving}
              className="flex-1 py-3 rounded-xl text-white text-sm font-black disabled:opacity-50"
              style={{ background: editingId ? '#f59e0b' : 'var(--accent-blue)', fontFamily: 'inherit' }}>
              {saving ? '...' : editingId ? t('debts_save_edit') : t('debts_save')}
            </button>
            <button onClick={cancelForm} className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
              {t('debts_cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {debts.map(debt => {
          const pct = (debt.original_amount - debt.remaining_amount) / debt.original_amount * 100
          return (
            <div key={debt.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: priorityColor[debt.priority] }} />
                  <div className="min-w-0">
                    <div className="font-black text-sm truncate" style={{ color: 'var(--text-primary)' }}>{debt.name}</div>
                    {debt.notes && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{debt.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 mr-2">
                  <div className="text-right ml-2">
                    <div className="font-black font-mono text-sm" style={{ color: 'var(--accent-red-light)' }}>{debt.remaining_amount.toFixed(0)} JOD</div>
                    {debt.monthly_payment > 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{debt.monthly_payment}{t('debts_per_month')}</div>}
                  </div>
                  <button onClick={() => startEdit(debt)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>✏️</button>
                  <button onClick={() => deleteDebt(debt.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>🗑️</button>
                </div>
              </div>
              <div className="progress-track mb-1.5">
                <div className="progress-fill gradient-green" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(0)}% {t('debts_paid')}</span>
                {paymentDebtId === debt.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                      placeholder="0" autoFocus onKeyDown={e => e.key === 'Enter' && makePayment(debt.id)} />
                    <button onClick={() => makePayment(debt.id)} disabled={payingSaving}
                      className="px-3 py-1.5 rounded-lg gradient-green text-white text-xs font-black disabled:opacity-50">
                      {payingSaving ? '⏳' : '✓'}
                    </button>
                    <button onClick={() => { setPaymentDebtId(null); setPaymentAmount('') }}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setPaymentDebtId(debt.id)} className="text-xs px-3 py-1.5 rounded-lg font-bold badge-green">
                    {t('debts_payment_add')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {debts.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>{t('debts_empty')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
