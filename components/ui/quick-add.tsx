'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'

const QUICK_CATS = [
  { label: 'طعام', icon: '🍔', type: 'expense' },
  { label: 'مواصلات', icon: '🚗', type: 'expense' },
  { label: 'فواتير', icon: '💡', type: 'expense' },
  { label: 'صحة', icon: '💊', type: 'expense' },
  { label: 'راتب', icon: '💰', type: 'income' },
  { label: 'أخرى', icon: '📝', type: 'expense' },
]


function clearUserCache(userId: string) {
  try {
    ['dashboard','tx','debts','goals','inv'].forEach(k => 
      sessionStorage.removeItem(`${k}_${userId}`)
    )
  } catch {}
}
export function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const { user } = useUser()
  const supabase = createClient()
  const [selected, setSelected] = useState<typeof QUICK_CATS[0] | null>(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastTx, setLastTx] = useState<{ category: string; amount: number; type: string } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // جلب آخر معاملة
  useEffect(() => {
    async function loadLast() {
      if (!user) return
      const { data } = await supabase
        .from('transactions')
        .select('category, amount, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setLastTx(data)
    }
    loadLast()
  }, [supabase])

  async function save() {
    if (!selected || !amount) return
    setSaving(true)
    if (!user) { setSaving(false); return }
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: selected.type,
      amount: parseFloat(amount),
      category: selected.label,
      description: null,
      transaction_date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    setAmount('')
    setSelected(null)
    clearUserCache(user?.id ?? '')
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
    onAdded()
  }

  async function repeatLast() {
    if (!lastTx) return
    setSaving(true)
    if (!user) { setSaving(false); return }
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: lastTx.type,
      amount: lastTx.amount,
      category: lastTx.category,
      description: 'تكرار',
      transaction_date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    clearUserCache(user?.id ?? '')
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
    onAdded()
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>⚡ إضافة سريعة</span>
        {showSuccess && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green-light)', animation: 'fadeIn 0.2s ease' }}>✅ تم الحفظ!</span>
        )}
      </div>

      {/* Category buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {QUICK_CATS.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelected(selected?.label === cat.label ? null : cat)}
            style={{
              padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: selected?.label === cat.label
                ? cat.type === 'income' ? 'var(--accent-green)' : 'var(--accent-blue)'
                : 'var(--bg-secondary)',
              color: selected?.label === cat.label ? 'white' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
              outline: selected?.label === cat.label ? 'none' : '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 18 }}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Amount input */}
      {selected && (
        <div style={{ display: 'flex', gap: 8, animation: 'fadeSlideIn 0.2s ease' }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="المبلغ..."
            autoFocus
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              border: '1px solid var(--accent-blue)',
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              fontSize: 16, outline: 'none', fontFamily: 'inherit',
              textAlign: 'center', fontWeight: 700,
            }}
          />
          <button
            onClick={save}
            disabled={saving || !amount}
            style={{
              padding: '12px 20px', borderRadius: 12, border: 'none',
              background: selected.type === 'income' ? 'var(--accent-green)' : 'var(--accent-blue)',
              color: 'white', fontSize: 14, fontWeight: 700,
              cursor: saving || !amount ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving || !amount ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {saving ? '⏳' : '+ حفظ'}
          </button>
        </div>
      )}

      {/* تكرار آخر معاملة */}
      {lastTx && !selected && (
        <button
          onClick={repeatLast}
          disabled={saving}
          style={{
            padding: '10px 14px', borderRadius: 12,
            border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'right',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue-light)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <span>🔁</span>
          <span>تكرار آخر معاملة: {lastTx.category} — {Number(lastTx.amount).toFixed(0)} JOD</span>
        </button>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
