'use client'
import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { useAccounts } from '@/hooks/useAccounts'
import type { Account, AccountType } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import styles from './accounts.module.css'

// ── Skeleton للتحميل ─────────────────────────────────
function AccountsSkeleton() {
  return (
    <div className={styles.skeletonContainer}>
      <div className={`skeleton ${styles.skeletonHero}`} />
      <div className={styles.skeletonRow}>
        <div className={`skeleton ${styles.skeletonButton}`} />
        <div className={`skeleton ${styles.skeletonButton}`} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className={`skeleton ${styles.skeletonItem}`} />
      ))}
    </div>
  )
}

// ── Dialog تأكيد الحذف ───────────────────────────────
function ConfirmArchiveDialog({ lang, onConfirm, onCancel }: { lang: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogEmoji}>📦</div>
        <h3 className={styles.dialogTitle}>
          {lang === 'en' ? 'Archive Account?' : 'أرشفة الحساب؟'}
        </h3>
        <p className={styles.dialogText}>
          {lang === 'en' ? 'The account will be hidden but all its transactions will be preserved.' : 'سيُخفى الحساب مع الاحتفاظ بجميع معاملاته.'}
        </p>
        <div className={styles.buttonRow}>
          <button onClick={onCancel} className={styles.secondaryButton}>
            {lang === 'en' ? 'Cancel' : 'إلغاء'}
          </button>
          <button onClick={onConfirm} className={`${styles.primaryButton} ${styles.dangerButton}`}>
            {lang === 'en' ? 'Archive' : 'أرشفة'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── أيقونات وألوان الحسابات ──────────────────────────
const ACCOUNT_TYPES: { type: AccountType; icon: string; labelAr: string; labelEn: string; color: string }[] = [
  { type: 'bank',        icon: '🏦', labelAr: 'بنك',           labelEn: 'Bank',         color: '#3B7EF6' },
  { type: 'cash',        icon: '💵', labelAr: 'نقدي',          labelEn: 'Cash',         color: '#10B981' },
  { type: 'savings',     icon: '🏛️', labelAr: 'توفير',         labelEn: 'Savings',      color: '#8B5CF6' },
  { type: 'credit_card', icon: '💳', labelAr: 'بطاقة ائتمان',  labelEn: 'Credit Card',  color: '#EF4444' },
]

const PRESET_COLORS = ['#3B7EF6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#64748B']

function typeInfo(type: AccountType) {
  return ACCOUNT_TYPES.find(t => t.type === type) ?? ACCOUNT_TYPES[0]
}

// ── بطاقة حساب ───────────────────────────────────────
function AccountCard({ acc, currency, lang, onEdit, onDelete }: {
  acc: Account; currency: string; lang: string
  onEdit: (a: Account) => void
  onDelete: (a: Account) => void
}) {
  const info = typeInfo(acc.type)
  const bal = acc.balance ?? 0
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  return (
    <div className={styles.card} style={{ border: `1px solid ${acc.color}33` }}>
      <div className={styles.iconBox} style={{ background: `${acc.color}20`, border: `1px solid ${acc.color}40` }}>
        {acc.icon}
      </div>

      <div className={styles.accountInfo}>
        <div className={styles.nameRow}>
          <span className={styles.accountName}>{acc.name}</span>
          {acc.is_default && (
            <span className={styles.defaultBadge} style={{ color: acc.color, background: `${acc.color}18`, border: `1px solid ${acc.color}30` }}>
              {lang === 'en' ? 'Default' : 'افتراضي'}
            </span>
          )}
        </div>
        <div className={styles.accountType}>
          {lang === 'en' ? info.labelEn : info.labelAr}
        </div>
      </div>

      <div className={styles.balanceRow}>
        <div className={`${styles.balanceAmount} ${bal >= 0 ? styles.textGreen : styles.textRed}`}>
          {bal >= 0 ? '+' : '-'}{fmt(Math.abs(bal))}
        </div>
        <div className={styles.balanceCurrency}>
          <span className={styles.balanceCurrency}>{currency}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={() => onEdit(acc)} aria-label={lang === 'en' ? 'Edit account' : 'تعديل الحساب'} className={styles.actionButton}>
          ✏️
        </button>
        {!acc.is_default && (
          <button onClick={() => onDelete(acc)} aria-label={lang === 'en' ? 'Archive account' : 'أرشفة الحساب'} className={`${styles.actionButton} ${styles.archiveButton}`}>
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}

// ── Modal إنشاء/تعديل حساب ───────────────────────────
function AccountModal({ account, lang, onSave, onClose }: {
  account?: Account; lang: string
  onSave: (data: Partial<Account>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank')
  const [openingBalance, setOpeningBalance] = useState(account?.opening_balance?.toString() ?? '0')
  const [color, setColor] = useState(account?.color ?? '#3B7EF6')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), type, opening_balance: parseFloat(openingBalance) || 0, color })
    setSaving(false)
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.modalScrollable}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {account ? (lang === 'en' ? 'Edit Account' : 'تعديل الحساب') : (lang === 'en' ? 'New Account' : 'حساب جديد')}
          </h2>
          <button onClick={onClose} aria-label={lang === 'en' ? 'Close' : 'إغلاق'} className={styles.closeButton}>✕</button>
        </div>

        {/* نوع الحساب */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            {lang === 'en' ? 'Account Type' : 'نوع الحساب'}
          </label>
          <div className={styles.typeGrid}>
            {ACCOUNT_TYPES.map(t => (
              <button key={t.type} onClick={() => { setType(t.type); setColor(t.color) }}
                className={styles.typeButton}
                style={{
                  background: type === t.type ? `${t.color}18` : 'var(--bg-elevated)',
                  border: `1px solid ${type === t.type ? t.color : 'var(--border)'}`,
                  color: type === t.type ? t.color : 'var(--text-muted)',
                }}>
                <span>{t.icon}</span>
                <span>{lang === 'en' ? t.labelEn : t.labelAr}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="account-name" className={styles.formLabel}>{lang === 'en' ? 'Name' : 'الاسم'}</label>
          <input id="account-name" value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'en' ? 'Account name' : 'اسم الحساب'} className={styles.input} />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="account-balance" className={styles.formLabel}>
            {lang === 'en' ? 'Opening Balance' : 'الرصيد الابتدائي'}
          </label>
          <input
            id="account-balance"
            type="number" min="0" step="0.01"
            placeholder="0"
            value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
            className={styles.input}
          />
        </div>

        {/* اللون */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            {lang === 'en' ? 'Color' : 'اللون'}
          </label>
          <div className={styles.presetColors}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                aria-label={c}
                className={styles.colorButton}
                style={{ background: c, border: `3px solid ${color === c ? 'var(--text-primary)' : 'transparent'}` }} />
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()}
          className={`${styles.primaryButton} ${styles.fullButton}`}
          style={{ background: color }}>
          {saving ? '⏳ ...' : lang === 'en' ? 'Save' : 'حفظ'}
        </button>
      </div>
    </div>
  )
}

// ── Modal التحويل بين الحسابات ────────────────────────
function TransferModal({ accounts, lang, onSave, onClose }: {
  accounts: Account[]; lang: string
  onSave: (fromId: string, toId: string, amount: number, date: string, note: string) => Promise<void>
  onClose: () => void
}) {
  const [fromId, setFromId] = useState(accounts.find(a => a.is_default)?.id ?? accounts[0]?.id ?? '')
  const [toId, setToId]     = useState(accounts.find(a => !a.is_default)?.id ?? '')
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!fromId || !toId || fromId === toId || !amount) return
    setSaving(true)
    await onSave(fromId, toId, parseFloat(amount), date, note)
    setSaving(false)
    onClose()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            🔄 {lang === 'en' ? 'Transfer Between Accounts' : 'تحويل بين الحسابات'}
          </h2>
          <button onClick={onClose} aria-label={lang === 'en' ? 'Close' : 'إغلاق'} className={styles.closeButton}>✕</button>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="transfer-from" className={styles.formLabel}>{lang === 'en' ? 'From' : 'من'}</label>
          <select id="transfer-from" value={fromId} onChange={e => setFromId(e.target.value)} className={styles.select}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="transfer-to" className={styles.formLabel}>{lang === 'en' ? 'To' : 'إلى'}</label>
          <select id="transfer-to" value={toId} onChange={e => setToId(e.target.value)} className={styles.select}>
            {accounts.filter(a => a.id !== fromId).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="transfer-amount" className={styles.formLabel}>{lang === 'en' ? 'Amount' : 'المبلغ'}</label>
          <input id="transfer-amount" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={styles.input} />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="transfer-date" className={styles.formLabel}>{lang === 'en' ? 'Date' : 'التاريخ'}</label>
          <input id="transfer-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={styles.input} />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="transfer-note" className={styles.formLabel}>{lang === 'en' ? 'Note (optional)' : 'ملاحظة (اختياري)'}</label>
          <input id="transfer-note" value={note} onChange={e => setNote(e.target.value)} placeholder={lang === 'en' ? 'Optional note' : 'ملاحظة اختيارية'} className={styles.input} />
        </div>

        <button onClick={handleSave} disabled={saving || !amount || fromId === toId}
          className={`${styles.primaryButton} ${styles.blueButton} ${styles.fullButton}`}>
          {saving ? '⏳ ...' : lang === 'en' ? 'Transfer' : 'تحويل'}
        </button>
      </div>
    </div>
  )
}

// ── الصفحة الرئيسية ───────────────────────────────────
export default function AccountsPage() {
  const { user } = useUser()
  const { lang } = useI18n()
  const { accounts, loading, totalBalance, createAccount, updateAccount, deleteAccount, transferBetween } = useAccounts(user?.id)
  const currency = accounts.find(a => a.is_default)?.currency ?? 'JOD'

  const [showCreate, setShowCreate] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | undefined>()
  const [showTransfer, setShowTransfer] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<Account | null>(null)

  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)

  if (loading) return <AccountsSkeleton />

  return (
    <div className={`animate-fade-in ${styles.pageContainer}`}>
      <PageHeader title={lang === 'en' ? '💰 Accounts' : '💰 الحسابات'} />

      {/* إجمالي الرصيد */}
      <div className={`${styles.heroBalanceCard} ${totalBalance >= 0 ? styles.heroPositive : styles.heroNegative}`}>
        <div className={styles.heroLabel}>
          {lang === 'en' ? 'Total Balance' : 'إجمالي الرصيد'}
        </div>
        <div className={`${styles.heroAmount} ${totalBalance >= 0 ? styles.textGreen : styles.textRed}`}>
          {totalBalance >= 0 ? '+' : '-'}{fmt(Math.abs(totalBalance))}
        </div>
        <div className={styles.heroCurrency}>{currency}</div>
      </div>

      {/* أزرار */}
      <div className={styles.buttonRow}>
        <button onClick={() => setShowCreate(true)}
          className={`${styles.primaryButton} ${styles.blueButton}`}>
          + {lang === 'en' ? 'New Account' : 'حساب جديد'}
        </button>
        {accounts.length >= 2 && (
          <button onClick={() => setShowTransfer(true)}
            className={styles.secondaryButton}>
            🔄 {lang === 'en' ? 'Transfer' : 'تحويل'}
          </button>
        )}
      </div>

      {/* قائمة الحسابات */}
      <div className={styles.accountList}>
        {accounts.map(acc => (
          <AccountCard key={acc.id} acc={acc} currency={currency} lang={lang}
            onEdit={a => setEditAccount(a)}
            onDelete={a => setConfirmDeleteId(a)}
          />
        ))}
      </div>

      {showCreate && (
        <AccountModal lang={lang} onSave={async d => { await createAccount(d as any) }} onClose={() => setShowCreate(false)} />
      )}

      {editAccount && (
        <AccountModal lang={lang} account={editAccount} onSave={async d => { await updateAccount(editAccount.id, d) }} onClose={() => setEditAccount(undefined)} />
      )}

      {showTransfer && accounts.length >= 2 && (
        <TransferModal accounts={accounts} lang={lang}
          onSave={async (f, t, a, d, n) => { await transferBetween(f, t, a, d, n) }}
          onClose={() => setShowTransfer(false)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmArchiveDialog
          lang={lang}
          onConfirm={async () => { await deleteAccount(confirmDeleteId.id); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
