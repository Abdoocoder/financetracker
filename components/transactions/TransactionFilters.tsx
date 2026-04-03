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
    : ['January','February','March','April','May','June','July','August','September','October','November','December']

  const now = new Date()
  const isCurrentMonth = filterMonth === now.getMonth() + 1 && filterYear === now.getFullYear()

  function goPrev() {
    if (filterMonth === 1) { onMonthChange(12); onYearChange(filterYear - 1) }
    else onMonthChange(filterMonth - 1)
  }
  function goNext() {
    if (isCurrentMonth) return
    if (filterMonth === 12) { onMonthChange(1); onYearChange(filterYear + 1) }
    else onMonthChange(filterMonth + 1)
  }

  return (
    <>
      {/* ── Month Navigator ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '4px 6px' }}>
        <button onClick={goPrev} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {lang === 'ar' ? '›' : '‹'}
        </button>
        <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {months[filterMonth - 1]} {filterYear}
        </span>
        <button onClick={goNext} disabled={isCurrentMonth} style={{ width: 36, height: 36, borderRadius: 10, background: isCurrentMonth ? 'transparent' : 'var(--bg-secondary)', border: `1px solid ${isCurrentMonth ? 'transparent' : 'var(--border)'}`, color: isCurrentMonth ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: 16, cursor: isCurrentMonth ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrentMonth ? 0.3 : 1 }}>
          {lang === 'ar' ? '‹' : '›'}
        </button>
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
