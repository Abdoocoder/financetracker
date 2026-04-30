import { Modal } from '@/components/ui/modal'
import { FormField, Input, SaveButton } from '@/components/ui/form-field'
import { CURRENCIES } from '@/lib/currency'
import { useI18n } from '@/lib/i18n'
import styles from './DebtForm.module.css'

const PRIORITY_CONFIG = [
  { color: '#EF4444', ar: 'عالية جداً', en: 'Very High' },
  { color: '#F59E0B', ar: 'عالية', en: 'High' },
  { color: '#3B7EF6', ar: 'متوسطة', en: 'Medium' },
  { color: '#8B9CC8', ar: 'منخفضة', en: 'Low' },
  { color: '#4A5568', ar: 'مؤجلة', en: 'Deferred' },
]

interface FormState {
  name: string
  original_amount: string
  original_amount_foreign: string
  remaining_amount: string
  monthly_payment: string
  due_date: string
  priority: string
  notes: string
  payment_day: string
  auto_deduct: boolean
  received_amount: boolean
  paid_from_account: boolean
  currency: string
  exchange_rate: string
  debt_type: 'owed' | 'receivable'
}

interface Props {
  form: FormState
  setForm: (updater: (f: FormState) => FormState) => void
  editingId: string | null
  baseCurrency: string
  lang: string
  saving: boolean
  onSave: () => void
  onClose: () => void
}

export function DebtForm({ form, setForm, editingId, baseCurrency, lang, saving, onSave, onClose }: Props) {
  const { t } = useI18n()

  const owedActive = form.debt_type === 'owed'
  const receivableActive = form.debt_type === 'receivable'

  return (
    <Modal title={editingId ? t('debts_edit') : t('debts_new')} onClose={onClose}>

      {/* نوع الدين — two styled radio-like buttons */}
      <div className={styles.typeRow} role="group" aria-label={t('debts_type_owed')}>
        <label className={`${styles.typeBtn} ${owedActive ? styles.typeBtnOwed : ''}`}>
          <input
            type="radio"
            name="debt_type"
            value="owed"
            checked={owedActive}
            onChange={() => setForm(f => ({ ...f, debt_type: 'owed' }))}
            className={styles.srOnly}
          />
          💳 {t('debts_type_owed')}
        </label>
        <label className={`${styles.typeBtn} ${receivableActive ? styles.typeBtnReceivable : ''}`}>
          <input
            type="radio"
            name="debt_type"
            value="receivable"
            checked={receivableActive}
            onChange={() => setForm(f => ({ ...f, debt_type: 'receivable' }))}
            className={styles.srOnly}
          />
          💰 {t('debts_type_receivable')}
        </label>
      </div>

      <FormField label={t('debts_name')}>
        <Input autoFocus placeholder={t('debts_name_hint')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </FormField>

      <div className={styles.grid2}>
        <FormField label={t('trans_amount')}>
          <Input type="number" placeholder="0"
            value={form.currency === baseCurrency ? form.original_amount : form.original_amount_foreign}
            onChange={e => form.currency === baseCurrency
              ? setForm(f => ({ ...f, original_amount: e.target.value }))
              : setForm(f => ({ ...f, original_amount_foreign: e.target.value }))} />
        </FormField>
        <FormField label={t('settings_currency')}>
          <select
            title={t('settings_currency')}
            aria-label={t('settings_currency')}
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            className="input-field"
          >
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
          </select>
        </FormField>
      </div>

      {form.currency !== baseCurrency && (
        <div className={styles.fxBox}>
          <div className={styles.grid2}>
            <FormField label={t('trans_exchange_rate') || 'سعر الصرف'}>
              <Input type="number" step="0.0001" value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: e.target.value }))} />
            </FormField>
            <FormField label={t('trans_equivalent')}>
              <div className={styles.equivalent}>
                {(parseFloat(form.original_amount_foreign) * parseFloat(form.exchange_rate) || 0).toFixed(2)} {baseCurrency}
              </div>
            </FormField>
          </div>
        </div>
      )}

      <div className={styles.grid2}>
        <FormField label={t('debts_monthly')}>
          <Input type="number" placeholder="0" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))} />
        </FormField>
        <FormField label={t('debts_due_date')}>
          <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </FormField>
      </div>

      <FormField label={t('priority_title')}>
        <select
          title={t('priority_title')}
          aria-label={t('priority_title')}
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          className="input-field"
        >
          {PRIORITY_CONFIG.map((p, i) => (
            <option key={i + 1} value={i + 1}>{t(`priority_${i + 1}` as Parameters<typeof t>[0])}</option>
          ))}
        </select>
      </FormField>

      {!editingId && form.debt_type === 'owed' && (
        <FormField label={t('debts_receive_confirm')}>
          <label className={`${styles.toggleBtn} ${form.received_amount ? styles.toggleBtnActiveGreen : ''}`}>
            <input
              type="checkbox"
              checked={form.received_amount}
              onChange={() => setForm(f => ({ ...f, received_amount: !f.received_amount }))}
              className={styles.srOnly}
            />
            <div className={`${styles.checkBox} ${form.received_amount ? styles.checkBoxGreen : ''}`}>
              {form.received_amount && <span className={styles.checkMark}>✓</span>}
            </div>
            <div className={lang === 'ar' ? styles.toggleTextRight : styles.toggleTextLeft}>
              <div className={`${styles.toggleTitle} ${form.received_amount ? styles.toggleTitleGreen : ''}`}>
                {t('debts_receive_confirm_yes')}
              </div>
              <div className={styles.toggleDesc}>
                {t('debts_receive_confirm_desc')}
              </div>
            </div>
          </label>
        </FormField>
      )}

      {!editingId && form.debt_type === 'receivable' && (
        <FormField label={t('debts_lent_from_account')}>
          <label className={`${styles.toggleBtn} ${form.paid_from_account ? styles.toggleBtnActiveRed : ''}`}>
            <input
              type="checkbox"
              checked={form.paid_from_account}
              onChange={() => setForm(f => ({ ...f, paid_from_account: !f.paid_from_account }))}
              className={styles.srOnly}
            />
            <div className={`${styles.checkBox} ${form.paid_from_account ? styles.checkBoxRed : ''}`}>
              {form.paid_from_account && <span className={styles.checkMark}>✓</span>}
            </div>
            <div className={lang === 'ar' ? styles.toggleTextRight : styles.toggleTextLeft}>
              <div className={`${styles.toggleTitle} ${form.paid_from_account ? styles.toggleTitleRed : ''}`}>
                {t('debts_lent_from_account_yes')}
              </div>
              <div className={styles.toggleDesc}>
                {t('debts_lent_from_account_desc')}
              </div>
            </div>
          </label>
        </FormField>
      )}

      <FormField label={t('debts_notes')}>
        <Input placeholder={t('debts_notes_hint')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </FormField>
      <FormField label={t('debts_payment_day')}>
        <Input type="number" placeholder="1" value={form.payment_day} onChange={e => setForm(f => ({ ...f, payment_day: e.target.value }))} />
      </FormField>

      <FormField label={t('debts_auto_deduct')}>
        <label className={styles.autoDeductRow}>
          <input
            type="checkbox"
            role="switch"
            checked={form.auto_deduct}
            onChange={() => setForm(f => ({ ...f, auto_deduct: !f.auto_deduct }))}
            aria-label={t('debts_auto_deduct')}
            className={styles.srOnly}
          />
          <span className={`${styles.switchBtn} ${form.auto_deduct ? styles.switchBtnOn : ''}`} aria-hidden="true">
            <span className={`${styles.switchThumb} ${form.auto_deduct ? styles.switchThumbOn : ''}`} />
          </span>
          <span className={`${styles.autoDeductLabel} ${form.auto_deduct ? styles.autoDeductLabelOn : ''}`}>
            {form.auto_deduct ? t('debts_auto_on') : t('debts_auto_off')}
          </span>
        </label>
      </FormField>

      <SaveButton label={editingId ? t('debts_save_edit') : t('debts_save')} loading={saving} onClick={onSave} />
    </Modal>
  )
}
