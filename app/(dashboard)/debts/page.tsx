'use client'
// app/(dashboard)/debts/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Debt } from '@/types'

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', original_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '' })
  const [saving, setSaving] = useState(false)
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')

  const supabase = createClient()

  const loadDebts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_paid', false)
      .order('priority', { ascending: true })
    setDebts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadDebts() }, [loadDebts])

  async function addDebt() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('debts').insert({
      user_id: user.id,
      name: form.name,
      original_amount: parseFloat(form.original_amount),
      remaining_amount: parseFloat(form.original_amount),
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      due_date: form.due_date || null,
      priority: parseInt(form.priority),
      notes: form.notes || null,
    })
    setForm({ name: '', original_amount: '', monthly_payment: '', due_date: '', priority: '3', notes: '' })
    setShowForm(false)
    setSaving(false)
    loadDebts()
  }

  async function makePayment(debtId: string) {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return
    const newRemaining = Math.max(0, debt.remaining_amount - amount)
    await supabase.from('debt_payments').insert({ debt_id: debtId, user_id: user.id, amount, payment_date: new Date().toISOString().split('T')[0] })
    await supabase.from('debts').update({ remaining_amount: newRemaining, is_paid: newRemaining === 0 }).eq('id', debtId)
    setPaymentDebtId(null)
    setPaymentAmount('')
    loadDebts()
  }

  const totalRemaining = debts.reduce((a, d) => a + d.remaining_amount, 0)
  const totalOriginal = debts.reduce((a, d) => a + d.original_amount, 0)
  const paidPct = totalOriginal > 0 ? ((totalOriginal - totalRemaining) / totalOriginal * 100).toFixed(1) : '0'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-2xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>إدارة الديون</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>تتبع ديونك وخطة السداد</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-medium hover:opacity-90">
          + إضافة دين
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'إجمالي الديون', value: `${totalRemaining.toFixed(2)} JOD`, color: 'var(--accent-red)' },
          { label: 'نسبة ما سُدِّد', value: `${paidPct}%`, color: 'var(--accent-green)' },
          { label: 'عدد الديون', value: debts.length.toString(), color: 'var(--accent-blue)' },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: 'var(--text-secondary)' }}>التقدم الإجمالي</span>
          <span style={{ color: 'var(--accent-green)' }}>{paidPct}%</span>
        </div>
        <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
          <div className="h-full rounded-full gradient-green transition-all duration-700"
            style={{ width: `${Math.min(parseFloat(paidPct), 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          <span>مسدد: {(totalOriginal - totalRemaining).toFixed(2)}</span>
          <span>متبقي: {totalRemaining.toFixed(2)}</span>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-6 rounded-2xl border animate-slide-up" style={{ background: 'var(--bg-card)', borderColor: 'rgba(79,142,247,0.3)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>إضافة دين جديد</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'اسم الدين', key: 'name', type: 'text', placeholder: 'مثال: أحمد القطيش' },
              { label: 'المبلغ الأصلي (JOD)', key: 'original_amount', type: 'number', placeholder: '100' },
              { label: 'القسط الشهري (JOD)', key: 'monthly_payment', type: 'number', placeholder: '30' },
              { label: 'تاريخ الاستحقاق', key: 'due_date', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                <input type={f.type} value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>الأولوية (1 = أعلى)</label>
              <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>أولوية {p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ملاحظات</label>
              <input type="text" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="أي تفاصيل إضافية" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addDebt} disabled={saving || !form.name || !form.original_amount}
              className="px-5 py-2.5 rounded-xl gradient-blue text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Debts list */}
      <div className="space-y-3">
        {debts.map((debt) => {
          const pct = ((debt.original_amount - debt.remaining_amount) / debt.original_amount * 100)
          const priorityColors = ['', 'var(--accent-red)', 'var(--accent-yellow)', 'var(--accent-blue)', 'var(--text-muted)', 'var(--text-muted)']
          return (
            <div key={debt.id} className="p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: priorityColors[debt.priority] }} />
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{debt.name}</div>
                    {debt.notes && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{debt.notes}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color: 'var(--accent-red)' }}>{debt.remaining_amount.toFixed(2)} JOD</div>
                  {debt.monthly_payment > 0 && (
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{debt.monthly_payment} JOD/شهر</div>
                  )}
                </div>
              </div>

              <div className="w-full h-2 rounded-full mb-2 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full gradient-green" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {pct.toFixed(0)}% مسدد ({(debt.original_amount - debt.remaining_amount).toFixed(2)} من {debt.original_amount.toFixed(2)})
                </span>
                {paymentDebtId === debt.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg text-xs outline-none"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      placeholder="المبلغ" />
                    <button onClick={() => makePayment(debt.id)}
                      className="px-3 py-1 rounded-lg gradient-green text-white text-xs font-medium">تسجيل</button>
                    <button onClick={() => setPaymentDebtId(null)}
                      className="px-3 py-1 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>إلغاء</button>
                  </div>
                ) : (
                  <button onClick={() => setPaymentDebtId(debt.id)}
                    className="text-xs px-3 py-1 rounded-lg font-medium hover:opacity-80 transition-opacity"
                    style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)' }}>
                    + تسجيل دفعة
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {debts.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-medium">لا توجد ديون! أو أضف ديونك لتتابع سدادها</div>
          </div>
        )}
      </div>
    </div>
  )
}
