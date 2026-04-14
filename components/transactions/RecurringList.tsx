'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { toast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { CURRENCIES } from '@/lib/currency'
import type { RecurringTransaction, RecurringFrequency } from '@/types'

const FREQ_LABELS: Record<RecurringFrequency, { ar: string; en: string }> = {
  daily:   { ar: 'يومي',   en: 'Daily' },
  weekly:  { ar: 'أسبوعي', en: 'Weekly' },
  monthly: { ar: 'شهري',   en: 'Monthly' },
  yearly:  { ar: 'سنوي',   en: 'Yearly' },
}

const EXPENSE_CATS = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','إيجار','اشتراكات','عناية','سفر','دين','أخرى']
const INCOME_CATS  = ['راتب','عمل حر','استثمار','مكافأة','أخرى']

interface RecurringForm {
  name: string
  amount: string
  category: string
  type: 'income' | 'expense'
  frequency: RecurringFrequency
  next_date: string
  currency: string
  notes: string
}

function defaultNextDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

const DEFAULT_FORM: RecurringForm = {
  name: '', amount: '', category: 'طعام', type: 'expense',
  frequency: 'monthly', next_date: defaultNextDate(),
  currency: 'JOD', notes: '',
}

export function RecurringList({ baseCurrency }: { baseCurrency: string }) {
  const [list, setList] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<RecurringForm>({ ...DEFAULT_FORM, currency: baseCurrency })
  const { user: currentUser } = useUser()
  const { t, lang } = useI18n()
  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    if (!currentUser) return
    const { data } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('next_date')
    setList((data as RecurringTransaction[]) ?? [])
    setLoading(false)
  }, [currentUser, supabase])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm({ ...DEFAULT_FORM, currency: baseCurrency, next_date: defaultNextDate() })
    setShowForm(true)
  }

  function openEdit(rec: RecurringTransaction) {
    setEditingId(rec.id)
    setForm({
      name: rec.name, amount: rec.amount.toString(), category: rec.category,
      type: rec.type as 'income' | 'expense', frequency: rec.frequency, next_date: rec.next_date,
      currency: rec.currency, notes: rec.notes ?? '',
    })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) { toast.warning(lang === 'en' ? 'Name required' : 'الاسم مطلوب'); return }
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { toast.warning(lang === 'en' ? 'Valid amount required' : 'أدخل مبلغاً صحيحاً'); return }
    if (!currentUser) return
    setSaving(true)
    const payload = {
      user_id: currentUser.id,
      name: form.name.trim(),
      amount: amt,
      category: form.category,
      type: form.type,
      frequency: form.frequency,
      next_date: form.next_date,
      currency: form.currency,
      notes: form.notes.trim() || null,
      is_active: true,
    }
    if (editingId) {
      const { error } = await supabase.from('recurring_transactions').update(payload).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('recurring_transactions').insert(payload)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(lang === 'en' ? 'Recurring transaction added ✅' : 'تمت إضافة المعاملة المتكررة ✅')
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function toggleActive(rec: RecurringTransaction) {
    await supabase.from('recurring_transactions').update({ is_active: !rec.is_active }).eq('id', rec.id)
    setList(prev => prev.map(r => r.id === rec.id ? { ...r, is_active: !r.is_active } : r))
  }

  async function remove(id: string) {
    await supabase.from('recurring_transactions').delete().eq('id', id)
    setList(prev => prev.filter(r => r.id !== id))
    toast.success(t('toast_deleted'))
  }

  const categories = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  if (loading) return <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          {lang === 'en' ? `${list.length} recurring rules` : `${list.length} قاعدة متكررة`}
        </span>
        <button onClick={openAdd} style={{ padding: '7px 14px', borderRadius: 10, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + {lang === 'en' ? 'Add Rule' : 'إضافة قاعدة'}
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {lang === 'en' ? 'No recurring transactions yet. Add one to automate your finances! 🔄' : 'لا توجد معاملات متكررة. أضف قاعدة لأتمتة تمويلك! 🔄'}
        </div>
      ) : list.map(rec => (
        <div key={rec.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '13px 14px', opacity: rec.is_active ? 1 : 0.5, borderRight: `3px solid ${rec.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)'}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>{rec.type === 'income' ? '📈' : '📉'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{rec.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {rec.category} · {FREQ_LABELS[rec.frequency]?.[lang as 'ar' | 'en'] ?? rec.frequency}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                {lang === 'en' ? 'Next:' : 'القادم:'} {rec.next_date}
              </div>
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: rec.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>
                {Number(rec.amount).toFixed(0)} {rec.currency}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              <button onClick={() => toggleActive(rec)} aria-label={rec.is_active ? (lang === 'en' ? 'Pause' : 'إيقاف مؤقت') : (lang === 'en' ? 'Resume' : 'استئناف')} title={rec.is_active ? 'Pause' : 'Resume'} style={{ width: 28, height: 28, borderRadius: 8, background: rec.is_active ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: '1px solid transparent', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {rec.is_active ? '⏸' : '▶'}
              </button>
              <button onClick={() => openEdit(rec)} aria-label={lang === 'en' ? 'Edit rule' : 'تعديل القاعدة'} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
              <button onClick={() => { if (window.confirm(lang === 'en' ? 'Delete this recurring rule?' : 'حذف هذه القاعدة المتكررة؟')) remove(rec.id) }} aria-label={lang === 'en' ? 'Delete rule' : 'حذف القاعدة'} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>
        </div>
      ))}

      {showForm && (
        <Modal title={editingId ? (lang === 'en' ? 'Edit Recurring Rule' : 'تعديل القاعدة المتكررة') : (lang === 'en' ? 'New Recurring Rule' : 'قاعدة متكررة جديدة')} onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* النوع */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['expense', 'income'] as const).map(tp => (
                <button key={tp} onClick={() => setForm(f => ({ ...f, type: tp, category: tp === 'income' ? 'راتب' : 'طعام' }))}
                  aria-pressed={form.type === tp}
                  style={{ padding: '9px', borderRadius: 10, border: `1px solid ${form.type === tp ? (tp === 'income' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)') : 'var(--border)'}`, background: form.type === tp ? (tp === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)') : 'transparent', color: form.type === tp ? (tp === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)') : 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {tp === 'income' ? (lang === 'en' ? '↑ Income' : '↑ دخل') : (lang === 'en' ? '↓ Expense' : '↓ مصروف')}
                </button>
              ))}
            </div>

            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={lang === 'en' ? 'Name (e.g. Rent, Salary)' : 'الاسم (مثال: إيجار، راتب)'} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder={lang === 'en' ? 'Amount' : 'المبلغ'} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} aria-label={lang === 'en' ? 'Currency' : 'العملة'} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </div>

            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} aria-label={lang === 'en' ? 'Category' : 'الفئة'} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as RecurringFrequency }))} aria-label={lang === 'en' ? 'Frequency' : 'التكرار'} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                {(Object.keys(FREQ_LABELS) as RecurringFrequency[]).map(k => (
                  <option key={k} value={k}>{FREQ_LABELS[k][lang as 'ar' | 'en'] ?? k}</option>
                ))}
              </select>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{lang === 'en' ? 'Next date' : 'التاريخ القادم'}</div>
                <input type="date" value={form.next_date} onChange={e => setForm(f => ({ ...f, next_date: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={lang === 'en' ? 'Notes (optional)' : 'ملاحظات (اختياري)'} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />

            <button onClick={save} disabled={saving} style={{ padding: '12px', borderRadius: 12, background: 'var(--accent-green)', color: 'white', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '⏳' : (editingId ? t('trans_save_edit') : (lang === 'en' ? 'Add Rule ✅' : 'إضافة القاعدة ✅'))}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
