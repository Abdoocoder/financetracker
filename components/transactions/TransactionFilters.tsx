'use client'
import { useI18n } from '@/lib/i18n'
import type { TransactionFilter } from '@/hooks/useTransactions'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  filter: TransactionFilter
  onFilterChange: (f: TransactionFilter) => void
  filterMonth: number
  filterYear: number
  onMonthChange: (m: number) => void
  onYearChange: (y: number) => void
}

export function TransactionFilters({ search, onSearchChange, filter, onFilterChange, filterMonth, filterYear, onMonthChange, onYearChange }: Props) {
  const { lang } = useI18n()
  const months = lang === 'ar'
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]
  return (
    <>
      {/* فلتر الشهر والسنة */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={filterMonth} onChange={e => onMonthChange(Number(e.target.value))}
          style={{ flex: 2, padding: '9px 12px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          {months.map((m, i) => (
            <option key={i+1} value={i+1}>{m}</option>
          ))}
        </select>
        <select value={filterYear} onChange={e => onYearChange(Number(e.target.value))}
          style={{ flex: 1, padding: '9px 12px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div style={{ padding: '0 0 12px', position: 'relative' }}>
        <input type="text" value={search} onChange={e => onSearchChange(e.target.value)}
          placeholder={lang === 'ar' ? '🔍 ابحث عن معاملة...' : '🔍 Search transactions...'}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        {search && (
          <button onClick={() => onSearchChange('')} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', padding: 0 }}>✕</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'income', 'expense'] as const).map(f => (
          <button key={f} onClick={() => onFilterChange(f)} style={{ flex: 1, padding: '9px 4px', borderRadius: 12, background: filter === f ? 'var(--accent-blue)' : 'var(--bg-card)', color: filter === f ? 'white' : 'var(--text-muted)', border: `1px solid ${filter === f ? 'transparent' : 'var(--border)'}`, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {f === 'all' ? (lang === 'en' ? 'All' : 'الكل') : f === 'income' ? `💰 ${lang === 'en' ? 'Income' : 'دخل'}` : `💸 ${lang === 'en' ? 'Expense' : 'مصروف'}`}
          </button>
        ))}
      </div>
    </>
  )
}
