'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'

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

function clearUserCache(userId: string) {
  try { ['dashboard','tx','debts','goals','inv'].forEach(k => sessionStorage.removeItem(`${k}_${userId}`)) } catch {}
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'طعام', monthly_limit: '' })

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    setLoading(true)
    const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0]
    const [budgetRes, txRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month).eq('year', year),
      supabase.from('transactions').select('category,amount').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', firstDay).lte('transaction_date', lastDay)
    ])
    setBudgets(budgetRes.data ?? [])
    const spendMap: Record<string, number> = {}
    ;(txRes.data ?? []).forEach((tx: any) => { spendMap[tx.category] = (spendMap[tx.category] ?? 0) + Number(tx.amount) })
    setSpending(spendMap)
    setLoading(false)
  }, [currentUser, month, year, supabase])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ category: 'طعام', monthly_limit: '' }); setEditingId(null); setShowForm(true) }
  function openEdit(b: any) { setForm({ category: b.category, monthly_limit: String(b.monthly_limit) }); setEditingId(b.id); setShowForm(true) }

  async function handleSave() {
    const user = currentUser
    if (!user || !form.monthly_limit) { toast.error(lang === 'en' ? 'Enter a limit' : 'أدخل الحد'); return }
    setSaving(true)
    if (editingId) {
      await supabase.from('budgets').update({ monthly_limit: parseFloat(form.monthly_limit) }).eq('id', editingId)
    } else {
      const { error } = await supabase.from('budgets').insert({ user_id: user.id, category: form.category, monthly_limit: parseFloat(form.monthly_limit), month, year })
      if (error?.code === '23505') { toast.error(lang === 'en' ? 'Budget already exists for this category' : 'ميزانية هذه الفئة موجودة مسبقاً'); setSaving(false); return }
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

  const totalLimit = budgets.reduce((a, b) => a + Number(b.monthly_limit), 0)
  const totalSpent = budgets.reduce((a, b) => a + (spending[b.category] ?? 0), 0)
  const months = lang === 'ar'
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 100px' }}>
      <PageHeader
        title={lang === 'en' ? 'Budget' : 'الميزانية'}
        subtitle={lang === 'en' ? 'Monthly spending limits' : 'حدود الإنفاق الشهرية'}
        action={<button onClick={openAdd} style={{ padding: '10px 18px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>+ {t('add')}</button>}
      />

      {/* فلتر الشهر */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflowX: 'auto', flexDirection: 'row' }}>
        {months.map((m, i) => (
          <button key={i} onClick={() => setMonth(i + 1)} style={{ padding: '8px 14px', borderRadius: 20, background: month === i + 1 ? 'var(--accent-blue)' : 'var(--bg-secondary)', border: '1px solid', borderColor: month === i + 1 ? 'transparent' : 'var(--border)', color: month === i + 1 ? 'white' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {m}
          </button>
        ))}
      </div>

      {/* إجمالي */}
      {budgets.length > 0 && (
        <div style={{ margin: '0 16px 16px', background: 'var(--bg-card)', borderRadius: 20, padding: 20, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'en' ? 'Total Spent' : 'إجمالي المصروف'}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: totalSpent > totalLimit ? 'var(--accent-red-light)' : 'var(--accent-green-light)' }}>{totalSpent.toFixed(0)} / {totalLimit.toFixed(0)}</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%`, background: totalSpent > totalLimit ? 'var(--accent-red)' : 'var(--accent-green)', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            {Math.round((totalSpent / totalLimit) * 100)}% {lang === 'en' ? 'used' : 'مُنفق'}
          </div>
        </div>
      )}

      {/* قائمة الميزانيات */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 20, background: 'var(--bg-card)', animation: 'pulse 1.5s infinite' }} />)
        ) : budgets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{lang === 'en' ? 'No budgets yet' : 'لا توجد ميزانيات بعد'}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{lang === 'en' ? 'Add a spending limit for each category' : 'أضف حداً للإنفاق لكل فئة'}</div>
          </div>
        ) : budgets.map(b => {
          const cat = CATEGORIES.find(c => c.key === b.category)
          const spent = spending[b.category] ?? 0
          const pct = Math.min((spent / Number(b.monthly_limit)) * 100, 100)
          const over = spent > Number(b.monthly_limit)
          return (
            <div key={b.id} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 20, border: `1px solid ${over ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{cat?.icon ?? '📝'}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{lang === 'en' ? cat?.en : cat?.ar ?? b.category}</div>
                    <div style={{ fontSize: 12, color: over ? 'var(--accent-red-light)' : 'var(--text-muted)' }}>
                      {spent.toFixed(0)} / {Number(b.monthly_limit).toFixed(0)} {over ? (lang === 'en' ? '⚠️ Over budget!' : '⚠️ تجاوزت الحد!') : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(b)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
                  <button onClick={() => handleDelete(b.id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️</button>
                </div>
              </div>
              <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--accent-red)' : pct > 80 ? 'var(--accent-amber)' : 'var(--accent-green)', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'left' }}>{Math.round(pct)}%</div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showForm && (
        <Modal title={editingId ? (lang === 'en' ? 'Edit Budget' : 'تعديل الميزانية') : (lang === 'en' ? 'New Budget' : 'ميزانية جديدة')} onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!editingId && (
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>{lang === 'en' ? 'Category' : 'الفئة'}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => setForm(f => ({ ...f, category: cat.key }))} style={{ padding: '10px 4px', borderRadius: 12, background: form.category === cat.key ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)', border: `1px solid ${form.category === cat.key ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`, color: form.category === cat.key ? 'var(--accent-blue-light)' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <span>{lang === 'en' ? cat.en : cat.ar}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>{lang === 'en' ? 'Monthly Limit' : 'الحد الشهري'}</label>
              <input type="number" value={form.monthly_limit} onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 16, fontFamily: 'inherit', outline: 'none' }} />
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
