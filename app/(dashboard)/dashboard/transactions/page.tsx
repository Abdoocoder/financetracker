'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import { AddButton } from '@/components/ui/add-button'
import { StatBar } from '@/components/ui/stat-bar'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { EmptyState } from '@/components/ui/empty-state'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { SwipeRow } from '@/components/ui/swipe-row'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const CATEGORIES_EXPENSE = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','ديون','أخرى']
const CATEGORIES_INCOME  = ['راتب','عمل حر','استثمار','هدية','أخرى']


// مسح cache المستخدم بعد أي تعديل
function clearUserCache(userId: string) {
  try {
    sessionStorage.removeItem(`dashboard_${userId}`)
    sessionStorage.removeItem(`tx_${userId}`)
    sessionStorage.removeItem(`debts_${userId}`)
    sessionStorage.removeItem(`goals_${userId}`)
    sessionStorage.removeItem(`inv_${userId}`)
  } catch {}
}
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const { user: currentUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all'|'income'|'expense'>('all')
  const [form, setForm] = useState({ type: 'expense', amount: '', category: '', description: '', transaction_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string|null>(null)
  const supabase = createClient()
  const { t, lang } = useI18n()
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load() })
  const [errors, setErrors] = useState<Record<string,string>>({})

  // cache key فريد لكل مستخدم
  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(100)
    setTransactions(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setForm({ type: 'expense', amount: '', category: '', description: '', transaction_date: new Date().toISOString().split('T')[0] })
    setShowForm(true)
  }

  function startEdit(tx: any) {
    setEditingId(tx.id)
    setForm({ type: tx.type, amount: tx.amount.toString(), category: tx.category ?? '', description: tx.description ?? '', transaction_date: tx.transaction_date })
    setShowForm(true)
  }

  async function saveTransaction() {
    const errs: Record<string,string> = {}
    if (!form.amount) errs.amount = 'المبلغ مطلوب'
    if (!form.category) errs.category = 'الفئة مطلوبة'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    const user = currentUser
    if (!user) return
    if (editingId) {
      const { error } = await supabase.from('transactions').update({ type: form.type, amount: parseFloat(form.amount), category: form.category, description: form.description, transaction_date: form.transaction_date }).eq('id', editingId)
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(t('toast_edited'))
    } else {
      const { error } = await supabase.from('transactions').insert({ user_id: user.id, type: form.type, amount: parseFloat(form.amount), category: form.category, description: form.description, transaction_date: form.transaction_date })
      if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
      toast.success(form.type === 'income' ? t('toast_income_added') : t('toast_expense_added'))
    }
    setShowForm(false); setSaving(false); load()
  }

  async function deleteTransaction(id: string) {
    setDeletingId(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    toast.success(t('toast_deleted'))
    setDeletingId(null)
  }


  function exportCSV() {
    const rows = [
      ['التاريخ', 'النوع', 'الفئة', 'الوصف', 'المبلغ'],
      ...transactions.map(tx => [
        tx.transaction_date,
        tx.type === 'income' ? 'دخل' : 'مصروف',
        tx.category,
        tx.description ?? '',
        tx.amount,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `معاملات-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = transactions.filter(tx => filter === 'all' || tx.type === filter)
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((a,t) => a + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a,t) => a + Number(t.amount), 0)
  const net = totalIncome - totalExpense

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0,1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />)}
    </div>
  )

  return (
    <div className="animate-fade-in" ref={pageRef}>
      <PullToRefreshIndicator refreshing={refreshing} />
      <PageHeader
        title={t('trans_title')}
        subtitle={`${transactions.length} ${lang === "en" ? "transactions" : "معاملة"}`}
        action={<AddButton label={`+ إضافة`} onClick={openAdd} />}
      />

      <StatBar stats={[
        { label: t('dash_income'),   value: `${totalIncome.toFixed(0)}+`,  color: 'var(--accent-green-light)' },
        { label: t('dash_expenses'), value: `${totalExpense.toFixed(0)}`,  color: 'var(--accent-red-light)'   },
        { label: t('dash_net'),      value: `${net >= 0 ? '+' : ''}${net.toFixed(0)}`, color: net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
      ]} />

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all','income','expense'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 12,
            background: filter === f ? 'var(--accent-blue)' : 'var(--bg-card)',
            color: filter === f ? 'white' : 'var(--text-muted)',
            border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            {f === 'all' ? `الكل` : f === 'income' ? `💰 ${`دخل`}` : `💸 ${`مصروف`}`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon="💸" title={t("trans_empty")} action={<AddButton label={`+ ${t("trans_add")}`} onClick={openAdd} />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(tx => (
            <SwipeRow key={tx.id} onDelete={() => setConfirmDelete(tx.id)} opacity={deletingId === tx.id ? 0.4 : 1}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              direction: 'rtl',
            }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: tx.type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
                border: `1px solid ${tx.type === 'income' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {tx.type === 'income' ? '💰' : '💸'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.description || tx.category}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {tx.category} · {tx.transaction_date}
                </div>
              </div>

              {/* Amount */}
              <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: tx.type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)', flexShrink: 0 }}>
                {tx.type === 'income' ? '+' : '−'}{Number(tx.amount).toFixed(0)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEdit(tx)} style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)',
                  color: 'var(--accent-blue-light)', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✎</button>
                <button onClick={() => setConfirmDelete(tx.id)} disabled={deletingId === tx.id} style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)',
                  color: 'var(--accent-red-light)', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
            </div>
            </SwipeRow>
          ))}
        </div>
      )}

      {/* Modal */}
      {confirmDelete && (
        <ConfirmDialog
          title={lang === "en" ? "Delete Transaction" : "حذف المعاملة"}
          message="هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء."
          onConfirm={() => { deleteTransaction(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showForm && (
        <Modal title={editingId ? t("trans_edit") : `+ ${t("trans_add")}`} onClose={() => setShowForm(false)}>
          {/* Type Toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['expense','income'].map(type => (
              <button key={type} onClick={() => setForm(f => ({ ...f, type }))} style={{
                flex: 1, padding: '11px', borderRadius: 12,
                background: form.type === type
                  ? (type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)')
                  : 'var(--bg-card)',
                border: `1px solid ${form.type === type ? (type === 'income' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--border)'}`,
                color: form.type === type ? (type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)') : 'var(--text-muted)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {type === 'income' ? `💰 ${`دخل`}` : `💸 ${`مصروف`}`}
              </button>
            ))}
          </div>

          <FormField label={`المبلغ`}>
            <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          </FormField>
          <FormField label={`الفئة`}>
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">{`اختر فئة`}</option>
              {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={`الوصف`}>
            <Input placeholder={`وصف اختياري`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label={`التاريخ`}>
            <Input type="date" value={form.transaction_date} onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))} />
          </FormField>
          <SaveButton label={editingId ? `حفظ التعديل` : `إضافة`} loading={saving} onClick={saveTransaction} />
        </Modal>
      )}
    </div>
  )
}
