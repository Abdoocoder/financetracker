'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [form, setForm] = useState({ type: 'expense', amount: '', category: '', description: '', transaction_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(100)
    if (error) console.error(error)
    setTransactions(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addTransaction() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: form.type,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description,
      transaction_date: form.transaction_date,
    })
    if (error) console.error(error)
    setForm({ type: 'expense', amount: '', category: '', description: '', transaction_date: new Date().toISOString().split('T')[0] })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)
  const income = transactions.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
  const net = income - expenses

  const categoryIcons: Record<string, string> = {
    'راتب': '💼', 'طعام': '🍽️', 'مواصلات': '🚗', 'فواتير': '⚡',
    'اتصالات': '📱', 'ديون': '💳', 'ترفيه': '🎬', 'صحة': '🏥',
    'تعليم': '📚', 'ملابس': '👕', 'متنوع': '📦',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-pulse-slow">⏳</div>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>المعاملات</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{transactions.length} معاملة</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue"
          style={{ fontFamily: 'inherit' }}>
          + إضافة
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center glow-green">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الدخل</div>
          <div className="text-base font-black font-mono" style={{ color: 'var(--accent-green-light)' }}>+{income.toFixed(0)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>JOD</div>
        </div>
        <div className="card p-3 text-center glow-red">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>المصاريف</div>
          <div className="text-base font-black font-mono" style={{ color: 'var(--accent-red-light)' }}>-{expenses.toFixed(0)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>JOD</div>
        </div>
        <div className="card p-3 text-center" style={{ borderColor: net >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الصافي</div>
          <div className="text-base font-black font-mono" style={{ color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
            {net >= 0 ? '+' : ''}{net.toFixed(0)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>JOD</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {[
          { key: 'all', label: 'الكل' },
          { key: 'income', label: '💰 دخل' },
          { key: 'expense', label: '💸 مصاريف' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className="flex-1 py-2.5 text-xs font-black transition-all"
            style={{
              background: filter === f.key ? 'var(--accent-blue)' : 'var(--bg-secondary)',
              color: filter === f.key ? 'white' : 'var(--text-muted)',
              fontFamily: 'inherit',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>معاملة جديدة</h3>
          <div className="space-y-3">
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {['income', 'expense'].map(t => (
                <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                  className="flex-1 py-2.5 text-sm font-black transition-all"
                  style={{
                    background: form.type === t ? (t === 'income' ? '#10b981' : '#ef4444') : 'var(--bg-secondary)',
                    color: form.type === t ? 'white' : 'var(--text-muted)',
                    fontFamily: 'inherit',
                  }}>
                  {t === 'income' ? '💰 دخل' : '💸 مصروف'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'المبلغ (JOD)', key: 'amount', type: 'number', placeholder: '50' },
                { label: 'الفئة', key: 'category', type: 'text', placeholder: 'راتب / طعام...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>الوصف</label>
              <input type="text" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                placeholder="تفاصيل إضافية..." />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>التاريخ</label>
              <input type="date" value={form.transaction_date}
                onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={addTransaction} disabled={saving || !form.amount || !form.category}
                className="flex-1 py-3 rounded-xl gradient-blue text-white text-sm font-black disabled:opacity-50"
                style={{ fontFamily: 'inherit' }}>
                {saving ? '...' : 'حفظ'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: t.type === 'income' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
              {categoryIcons[t.category] ?? (t.type === 'income' ? '💰' : '💸')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {t.description || t.category || '—'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t.category} · {t.transaction_date}
              </div>
            </div>
            <div className="font-black font-mono text-sm shrink-0"
              style={{ color: t.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
              {t.type === 'income' ? '+' : '-'}{Number(t.amount).toFixed(2)}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد معاملات</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>اضغط + إضافة لتسجيل معاملة</div>
          </div>
        )}
      </div>
    </div>
  )
}
