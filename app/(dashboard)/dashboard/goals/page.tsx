'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('savings_goals').select('*').eq('user_id', user.id).order('created_at')
    setGoals(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addGoal() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('savings_goals').insert({ user_id: user.id, ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount) })
    setForm({ name: '', target_amount: '', current_amount: '0', target_date: '', icon: '🎯' })
    setShowForm(false); setSaving(false); load()
  }

  const icons = ['🎯','🏠','✈️','📚','🚗','💍','🎓','💻','📱','🏋️']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-3xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>أهداف الادخار</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{goals.length} هدف</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue">+ إضافة</button>
      </div>

      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>هدف جديد</h3>
          <div className="mb-3">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>الأيقونة</label>
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
              { label: 'اسم الهدف', key: 'name', type: 'text', placeholder: 'شراء سيارة', col: 'col-span-2' },
              { label: 'المبلغ المستهدف', key: 'target_amount', type: 'number', placeholder: '5000', col: '' },
              { label: 'المبلغ الحالي', key: 'current_amount', type: 'number', placeholder: '0', col: '' },
              { label: 'تاريخ الهدف', key: 'target_date', type: 'date', placeholder: '', col: 'col-span-2' },
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
            <button onClick={addGoal} disabled={saving || !form.name || !form.target_amount}
              className="flex-1 py-3 rounded-xl gradient-blue text-white text-sm font-black disabled:opacity-50">
              {saving ? '...' : 'حفظ'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {goals.map((goal) => {
          const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
          const remaining = goal.target_amount - goal.current_amount
          return (
            <div key={goal.id} className="card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: 'var(--bg-secondary)' }}>{goal.icon || '🎯'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-black" style={{ color: 'var(--text-primary)' }}>{goal.name}</div>
                  {goal.target_date && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>الهدف: {goal.target_date}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black font-mono text-sm" style={{ color: 'var(--accent-blue-light)' }}>{pct.toFixed(0)}%</div>
                </div>
              </div>
              <div className="progress-track mb-2">
                <div className="progress-fill gradient-blue" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="font-mono">{goal.current_amount.toFixed(0)} JOD</span>
                <span>متبقي: <span className="font-mono font-bold" style={{ color: 'var(--accent-yellow-light)' }}>{remaining.toFixed(0)} JOD</span></span>
                <span className="font-mono">{goal.target_amount.toFixed(0)} JOD</span>
              </div>
            </div>
          )
        })}
        {goals.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">🎯</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد أهداف</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>حدد هدفك الأول وابدأ الادخار</div>
          </div>
        )}
      </div>
    </div>
  )
}
