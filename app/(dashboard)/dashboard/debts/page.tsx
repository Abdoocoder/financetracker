'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/toast'
import type { Debt } from '@/types'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', original_amount: '', remaining_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '' })
  const [saving, setSaving] = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [payingSaving, setPayingSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false).order('priority')
    setDebts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function startEdit(d: Debt) {
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
    if (!form.name || !form.original_amount) { toast.warning('يرجى تعبئة اسم الدين والمبلغ'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editingId) {
      const { error: err } = await supabase.from('debts').update({
        name: form.name, original_amount: parseFloat(form.original_amount),
        remaining_amount: parseFloat(form.remaining_amount),
        monthly_payment: parseFloat(form.monthly_payment) || 0,
        due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null,
      }).eq('id', editingId)
      if (err) { toast.error('فشل تعديل الدين'); setSaving(false); return }
      toast.success('تم تعديل الدين بنجاح ✏️')
    } else {
      const { error: err } = await supabase.from('debts').insert({
        user_id: user.id, name: form.name,
        original_amount: parseFloat(form.original_amount),
        remaining_amount: parseFloat(form.original_amount),
        monthly_payment: parseFloat(form.monthly_payment) || 0,
        due_date: form.due_date || null, priority: parseInt(form.priority), notes: form.notes || null,
      })
      if (err) { toast.error('فشل إضافة الدين'); setSaving(false); return }
      toast.success('تم إضافة الدين بنجاح 💳')
    }
    cancelForm(); setSaving(false); load()
  }

  async function deleteDebt(id: string) {
    const { error: err } = await supabase.from('debts').delete().eq('id', id)
    if (err) { toast.error('فشل حذف الدين'); return }
    toast.success('تم حذف الدين')
    load()
  }

  async function makePayment(debtId: string) {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { toast.warning('أدخل مبلغاً صحيحاً'); return }
    setPayingSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    const { error: err } = await supabase.from('debt_payments').insert({
      debt_id: debtId, user_id: user.id, amount, payment_date: new Date().toISOString().split('T')[0]
    })
    if (err) { toast.error('فشل تسجيل الدفعة'); setPayingSaving(false); return }
    await supabase.from('debts').update({ remaining_amount: newRemaining, is_paid: newRemaining === 0 }).eq('id', debtId)
    if (newRemaining === 0) toast.success(`🎉 تهانينا! تم سداد "${debt.name}" بالكامل`)
    else toast.success(`تم تسجيل دفعة ${amount} JOD ✅`)
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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>إدارة الديون</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{debts.length} دين نشط</p>
        </div>
        <button onClick={() => { cancelForm(); setShowForm(true) }}
          className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue" style={{ fontFamily: 'inherit' }}>
          + إضافة
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي الديون', value: `${totalRemaining.toFixed(0)}`, color: 'var(--accent-red-light)' },
          { label: 'نسبة السداد',   value: `${paidPct.toFixed(0)}%`,       color: 'var(--accent-green-light)' },
          { label: 'عدد الديون',    value: `${debts.length}`,              color: 'var(--accent-blue-light)' },
        ].map((s, i) => (
          <div key={i} className="card p-3 text-center">
            <div className="text-lg font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex justify-between text-xs mb-2">
          <span style={{ color: 'var(--text-secondary)' }}>التقدم الإجمالي</span>
          <span className="font-bold" style={{ color: 'var(--accent-green-light)' }}>{paidPct.toFixed(0)}%</span>
        </div>
        <div className="progress-track h-3">
          <div className="progress-fill gradient-green" style={{ width: `${Math.min(paidPct, 100)}%` }} />
        </div>
      </div>

      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: editingId ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>
            {editingId ? '✏️ تعديل الدين' : 'إضافة دين جديد'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'اسم الدين', key: 'name', type: 'text', placeholder: 'قرض شخصي', col: 'col-span-2' },
              { label: 'المبلغ الأصلي', key: 'original_amount', type: 'number', placeholder: '1000', col: '' },
              { label: 'المبلغ المتبقي', key: 'remaining_amount', type: 'number', placeholder: '800', col: '' },
              { label: 'القسط الشهري', key: 'monthly_payment', type: 'number', placeholder: '50', col: '' },
              { label: 'تاريخ الاستحقاق', key: 'due_date', type: 'date', placeholder: '', col: '' },
              { label: 'ملاحظات', key: 'notes', type: 'text', placeholder: 'تفاصيل...', col: 'col-span-2' },
            ].map(f => (
              <div key={f.key} className={f.col}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveDebt} disabled={saving}
              className="flex-1 py-3 rounded-xl text-white text-sm font-black disabled:opacity-50"
              style={{ background: editingId ? '#f59e0b' : 'var(--accent-blue)', fontFamily: 'inherit' }}>
              {saving ? '...' : editingId ? 'حفظ التعديل' : 'إضافة'}
            </button>
            <button onClick={cancelForm} className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {debts.map((debt) => {
          const pct = (debt.original_amount - debt.remaining_amount) / debt.original_amount * 100
          const isPaymentOpen = paymentDebtId === debt.id
          return (
            <div key={debt.id} className="card p-4 animate-slide-up">
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
                    {debt.monthly_payment > 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{debt.monthly_payment}/شهر</div>}
                  </div>
                  <button onClick={() => startEdit(debt)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-yellow-light)' }}>✏️</button>
                  <button onClick={() => deleteDebt(debt.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red-light)' }}>🗑️</button>
                </div>
              </div>
              <div className="progress-track mb-1.5">
                <div className="progress-fill gradient-green" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(0)}% مسدد</span>
                {isPaymentOpen ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                      placeholder="المبلغ" autoFocus
                      onKeyDown={e => e.key === 'Enter' && makePayment(debt.id)} />
                    <button onClick={() => makePayment(debt.id)} disabled={payingSaving}
                      className="px-3 py-1.5 rounded-lg gradient-green text-white text-xs font-black disabled:opacity-50">
                      {payingSaving ? '⏳' : '✓'}
                    </button>
                    <button onClick={() => { setPaymentDebtId(null); setPaymentAmount('') }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setPaymentDebtId(debt.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold badge-green">+ دفعة</button>
                )}
              </div>
            </div>
          )
        })}
        {debts.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد ديون!</div>
          </div>
        )}
      </div>
    </div>
  )
}
