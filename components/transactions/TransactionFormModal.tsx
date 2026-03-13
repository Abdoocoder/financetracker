'use client'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { useI18n } from '@/lib/i18n'
import type { TransactionForm } from '@/hooks/useTransactions'

const CATEGORIES_EXPENSE = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','ديون','أخرى']
const CATEGORIES_INCOME  = ['راتب','عمل حر','استثمار','هدية','أخرى']

interface Props {
  editingId: string | null
  form: TransactionForm
  saving: boolean
  onClose: () => void
  onSave: () => void
  onChange: (updates: Partial<TransactionForm>) => void
}

export function TransactionFormModal({ editingId, form, saving, onClose, onSave, onChange }: Props) {
  const { t, lang } = useI18n()
  return (
    <Modal title={editingId ? t('trans_edit') : `+ ${t('trans_add')}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['expense','income'] as const).map(type => (
          <button key={type} onClick={() => onChange({ type, category: '' })} style={{ flex: 1, padding: '11px', borderRadius: 12, background: form.type === type ? (type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)') : 'var(--bg-card)', border: `1px solid ${form.type === type ? (type === 'income' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)') : 'var(--border)'}`, color: form.type === type ? (type === 'income' ? 'var(--accent-green-light)' : 'var(--accent-red-light)') : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {type === 'income' ? `💰 ${lang === 'en' ? 'Income' : 'دخل'}` : `💸 ${lang === 'en' ? 'Expense' : 'مصروف'}`}
          </button>
        ))}
      </div>
      <FormField label={lang === 'en' ? 'Amount' : 'المبلغ'}>
        <Input type="number" placeholder="0.00" value={form.amount} onChange={e => onChange({ amount: e.target.value })} />
      </FormField>
      <FormField label={lang === 'en' ? 'Category' : 'الفئة'}>
        <Select value={form.category} onChange={e => onChange({ category: e.target.value })}>
          <option value="">{lang === 'en' ? 'Select category' : 'اختر فئة'}</option>
          {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </FormField>
      <FormField label={lang === 'en' ? 'Description' : 'الوصف'}>
        <Input placeholder={lang === 'en' ? 'Optional description' : 'وصف اختياري'} value={form.description} onChange={e => onChange({ description: e.target.value })} />
      </FormField>
      <FormField label={lang === 'en' ? 'Date' : 'التاريخ'}>
        <Input type="date" value={form.transaction_date} onChange={e => onChange({ transaction_date: e.target.value })} />
      </FormField>
      <SaveButton label={editingId ? (lang === 'en' ? 'Save Changes' : 'حفظ التعديل') : (lang === 'en' ? 'Add' : 'إضافة')} loading={saving} onClick={onSave} />
    </Modal>
  )
}
