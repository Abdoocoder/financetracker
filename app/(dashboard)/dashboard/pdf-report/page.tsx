'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'

export default function PDFReportPage() {
  const { lang } = useI18n()
  const ar = lang === 'ar'
  const { user } = useUser()
  const supabase = useMemo(() => createClient(), [])
  const printRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const [txRes, debtRes, invRes, goalRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('transaction_date', firstDay).lte('transaction_date', lastDay).order('transaction_date'),
      supabase.from('debts').select('*').eq('user_id', user.id).eq('is_paid', false),
      supabase.from('investments').select('*').eq('user_id', user.id),
      supabase.from('savings_goals').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('full_name, currency, monthly_income').eq('id', user.id).single(),
    ])

    const txs = txRes.data ?? []
    const txIncome = txs.filter((t: any) => t.type === 'income').reduce((a: number, t: any) => a + Number(t.amount), 0)
    const monthlyIncome = Number(profileRes.data?.monthly_income ?? 0)
    const income = txIncome + monthlyIncome
    const expenses = txs.filter((t: any) => t.type === 'expense').reduce((a: number, t: any) => a + Number(t.amount), 0)
    const catMap: Record<string, number> = {}
    txs.filter((t: any) => t.type === 'expense').forEach((t: any) => { catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount) })
    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1])

    setData({
      profile: profileRes.data,
      transactions: txs,
      income,
      expenses,
      net: income - expenses,
      categories,
      debts: debtRes.data ?? [],
      investments: invRes.data ?? [],
      goals: goalRes.data ?? [],
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [user, month, year])

  const monthNames = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['January','February','March','April','May','June','July','August','September','October','November','December']

  const fmt = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
  const currency = data?.profile?.currency ?? 'JOD'

  return (
    <>
      {/* Controls - hidden when printing */}
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: 'var(--text-primary)', flex: 1 }}>
          📄 {ar ? 'التقرير الشهري' : 'Monthly Report'}
        </h1>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
          {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          🖨️ {ar ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{ar ? 'جاري التحميل...' : 'Loading...'}</div>}

      {data && (
        <div ref={printRef} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Cairo, sans-serif' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', padding: '24px 0 16px', borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>🌅 فجرك</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--text-secondary)' }}>
              {ar ? 'التقرير المالي الشهري' : 'Monthly Financial Report'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              {monthNames[month]} {year} — {data.profile?.full_name ?? ''}
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: ar ? 'الدخل' : 'Income', val: data.income, color: '#10B981' },
              { label: ar ? 'المصاريف' : 'Expenses', val: data.expenses, color: '#EF4444' },
              { label: ar ? 'الصافي' : 'Net', val: data.net, color: data.net >= 0 ? '#10B981' : '#EF4444' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{fmt(s.val)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{currency}</div>
              </div>
            ))}
          </div>

          {/* Categories */}
          {data.categories.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>📊 {ar ? 'توزيع المصاريف' : 'Expense Breakdown'}</div>
              {data.categories.map(([cat, amt]: [string, number]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                  <span style={{ fontWeight: 700 }}>{fmt(amt)} {currency}</span>
                </div>
              ))}
            </div>
          )}

          {/* Transactions */}
          {data.transactions.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>💳 {ar ? 'المعاملات' : 'Transactions'} ({data.transactions.length})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: '6px 8px', textAlign: ar ? 'right' : 'left' }}>{ar ? 'التاريخ' : 'Date'}</th>
                    <th style={{ padding: '6px 8px', textAlign: ar ? 'right' : 'left' }}>{ar ? 'الفئة' : 'Category'}</th>
                    <th style={{ padding: '6px 8px', textAlign: ar ? 'right' : 'left' }}>{ar ? 'الوصف' : 'Description'}</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>{ar ? 'المبلغ' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx: any) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>{tx.transaction_date}</td>
                      <td style={{ padding: '5px 8px' }}>{tx.category}</td>
                      <td style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>{tx.description}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: tx.type === 'income' ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                        {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Debts & Investments Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {data.debts.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>💳 {ar ? 'الديون النشطة' : 'Active Debts'}</div>
                {data.debts.map((d: any) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{d.name}</span>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>{fmt(d.remaining_amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {data.goals.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>🎯 {ar ? 'أهداف الادخار' : 'Savings Goals'}</div>
                {data.goals.map((g: any) => (
                  <div key={g.id} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{g.name}</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>{fmt(g.current_amount)} / {fmt(g.target_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            {ar ? `تقرير فجرك المالي — ${monthNames[month]} ${year}` : `Fajrak Financial Report — ${monthNames[month]} ${year}`}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </>
  )
}
