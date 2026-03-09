'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'expense', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50)
    setTransactions(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addTransaction() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert({ user_id: user.id, ...form, amount: parseFloat(form.amount) })
    setForm({ type: 'expense', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] })
    setShowForm(false); setSaving(false); load()
  }

  const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-3xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>المعاملات</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{transactions.length} معاملة</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue">+ إضافة</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 glow-green">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>إجمالي الدخل</div>
          <div className="text-xl font-black font-mono" style={{ color: 'var(--accent-green-light)' }}>+{income.toFixed(2)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>JOD</div>
        </div>
        <div className="card p-4 glow-red">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>إجمالي المصاريف</div>
          <div className="text-xl font-black font-mono" style={{ color: 'var(--accent-red-light)' }}>-{expenses.toFixed(2)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>JOD</div>
        </div>
      </div>

      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>إضافة معاملة</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {['income','expense'].map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                    className="flex-1 py-2.5 text-sm font-black transition-all"
                    style={{ background: form.type === t ? (t === 'income' ? '#10b981' : '#ef4444') : 'var(--bg-secondary)', color: form.type === t ? 'white' : 'var(--text-muted)' }}>
                    {t === 'income' ? '💰 دخل' : '💸 مصروف'}
                  </button>
                ))}
              </div>
            </div>
            {[
              { label: 'المبلغ (JOD)', key: 'amount', type: 'number', placeholder: '50', col: '' },
              { label: 'الفئة', key: 'category', type: 'text', placeholder: 'راتب / إيجار', col: '' },
              { label: 'الوصف', key: 'description', type: 'text', placeholder: 'تفاصيل...', col: 'col-span-2' },
              { label: 'التاريخ', key: 'date', type: 'date', placeholder: '', col: 'col-span-2' },
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
            <button onClick={addTransaction} disabled={saving || !form.amount}
              className="flex-1 py-3 rounded-xl gradient-blue text-white text-sm font-black disabled:opacity-50">
              {saving ? '...' : 'حفظ'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {transactions.map((t) => (
          <div key={t.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: t.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {t.type === 'income' ? '💰' : '💸'}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.description || t.category || '—'}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.category} · {t.date}</div>
              </div>
            </div>
            <div className="font-black font-mono text-sm shrink-0" style={{ color: t.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
              {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد معاملات</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>أضف أول معاملة الآن</div>
          </div>
        )}
      </div>
    </div>
  )
}
