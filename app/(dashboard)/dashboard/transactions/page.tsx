'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { AddButton } from '@/components/ui/add-button'
import { StatBar } from '@/components/ui/stat-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccounts } from '@/hooks/useAccounts'
import { TransactionItem } from '@/components/transactions/TransactionItem'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal'
import { RecurringList } from '@/components/transactions/RecurringList'

import { ListSkeleton } from '@/components/ui/skeleton'

export default function TransactionsPage() {
  const { t } = useI18n()
  const { profile, user } = useUser()
  const tx = useTransactions()
  const { totalBalance, loading: accountsLoading } = useAccounts(user?.id)
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await tx.load() })
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all')

  const today = new Date().toISOString().split('T')[0]
  const completed = tx.filtered.filter(item => item.transaction_date <= today)
  const upcoming = tx.filtered.filter(item => item.transaction_date > today)
  const baseCurrency = profile?.currency ?? 'JOD'
  const fmt = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
  const monthStartBalance = accountsLoading ? null : (totalBalance - (tx.monthToDateNet ?? 0))

  if (tx.loading) return <ListSkeleton count={8} />

  return (
    <div className="animate-fade-in" ref={pageRef}>
      <PullToRefreshIndicator refreshing={refreshing} />
      <PageHeader
        title={t('trans_title')}
        subtitle={`${tx.transactions.length} ${t('trans_count')}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {activeTab === 'all' && (
              <button onClick={tx.exportCSV} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                📥 CSV
              </button>
            )}
            {activeTab === 'all' && <AddButton label={`+ ${t('add')}`} onClick={tx.openAdd} />}
          </div>
        }
      />

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['all', 'recurring'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${activeTab === tab ? 'var(--accent-blue-light)' : 'var(--border)'}`, background: activeTab === tab ? 'var(--accent-blue-dim)' : 'transparent', color: activeTab === tab ? 'var(--accent-blue-light)' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {tab === 'all' ? `📋 ${t('trans_all')}` : `🔄 ${t('trans_recurring')}`}
          </button>
        ))}
      </div>

      {activeTab === 'recurring' ? (
        <RecurringList baseCurrency={baseCurrency} />
      ) : (
        <>
          <StatBar stats={[
            { label: t('dash_income'), value: `${tx.totalIncome.toFixed(0)}+`, color: 'var(--accent-green-light)' },
            { label: t('dash_expenses'), value: tx.totalRealExpense.toFixed(0), color: 'var(--accent-red-light)' },
            ...(tx.totalDebtPayments > 0 ? [{ label: t('dash_debt_payments'), value: `💳 ${tx.totalDebtPayments.toFixed(0)}`, color: 'var(--accent-blue-light)' }] : []),
            { label: t('dash_net'), value: `${tx.net >= 0 ? '+' : ''}${tx.net.toFixed(0)}`, color: tx.net >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
            ...(monthStartBalance === null ? [] : [{
              label: t('trans_month_start'),
              value: `${monthStartBalance >= 0 ? '+' : '-'}${fmt(Math.abs(monthStartBalance))}`,
              color: monthStartBalance >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
            }]),
            ...(accountsLoading ? [] : [{
              label: t('trans_now_all'),
              value: `${totalBalance >= 0 ? '+' : '-'}${fmt(Math.abs(totalBalance))}`,
              color: totalBalance >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
            }]),
          ]} />
          <TransactionFilters
            search={tx.search}
            onSearchChange={tx.setSearch}
            filter={tx.filter}
            onFilterChange={tx.setFilter}
            filterMonth={tx.filterMonth}
            filterYear={tx.filterYear}
            onMonthChange={tx.setFilterMonth}
            onYearChange={tx.setFilterYear}
          />

          {tx.filtered.length === 0 ? (
            <EmptyState icon="💸" title={t('trans_empty')} action={<AddButton label={`+ ${t('trans_add')}`} onClick={tx.openAdd} />} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {upcoming.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <span style={{ fontSize: 14 }}>⏳</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-amber-light)' }}>
                      {t('trans_upcoming')} — {upcoming.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.75 }}>
                    {upcoming.map(item => (
                      <div key={item.id} style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, fontSize: 10, fontWeight: 800, color: 'var(--accent-amber-light)', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '2px 7px' }}>
                          {t('trans_scheduled')}
                        </div>
                        <TransactionItem tx={item} deletingId={tx.deletingId} onEdit={tx.startEdit} onDelete={(id) => tx.setConfirmDelete(id)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {completed.length > 0 && (
                <div>
                  {upcoming.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <span style={{ fontSize: 14 }}>✅</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-green-light)' }}>
                        {t('trans_completed')} — {completed.length}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {completed.map(item => (
                      <TransactionItem key={item.id} tx={item} deletingId={tx.deletingId} onEdit={tx.startEdit} onDelete={(id) => tx.setConfirmDelete(id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tx.hasMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button onClick={tx.loadMore} disabled={tx.loadingMore} style={{ padding: '12px 32px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: tx.loadingMore ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: tx.loadingMore ? 0.6 : 1 }}>
                {tx.loadingMore ? '⏳ ...' : `${t('trans_load_more')} ↓`}
              </button>
            </div>
          )}
        </>
      )}

      {tx.confirmDelete && (
        <ConfirmDialog
          title={t('trans_delete_title')}
          message={t('trans_delete_msg')}
          onConfirm={() => { tx.deleteTransaction(tx.confirmDelete!); tx.setConfirmDelete(null) }}
          onCancel={() => tx.setConfirmDelete(null)}
        />
      )}

      {tx.showForm && (
        <TransactionFormModal
          editingId={tx.editingId}
          form={tx.form}
          saving={tx.saving}
          onClose={tx.closeForm}
          onSave={tx.saveTransaction}
          onChange={(updates) => tx.setForm(prev => ({ ...prev, ...updates }))}
        />
      )}
    </div>
  )
}
