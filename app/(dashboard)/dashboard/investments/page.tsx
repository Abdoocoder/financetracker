'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import type { Investment, InvestmentTransaction } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { StatBar } from '@/components/ui/stat-bar'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { EmptyState } from '@/components/ui/empty-state'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { useI18n } from '@/lib/i18n'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'


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
export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const { user: currentUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBuyForm, setShowBuyForm] = useState<string | null>(null)
  const [showTxHistory, setShowTxHistory] = useState<string | null>(null)
  const [txHistory, setTxHistory] = useState<InvestmentTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [editingInv, setEditingInv] = useState<Investment | null>(null)
  const [form, setForm] = useState({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true })
  const [editForm, setEditForm] = useState({ symbol: '', name: '', type: 'etf', shares: '', avg_buy_price: '', current_price: '', is_halal: true, notes: '' })
  const [buyForm, setBuyForm] = useState({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [usdToJod, setUsdToJod] = useState<number | null>(null)
  const [showJod, setShowJod] = useState(false)
  const [priceStatus, setPriceStatus] = useState<Record<string, 'live' | 'manual'>>({})
  const { t, lang } = useI18n()
  const supabase = createClient()

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const cacheKey = `inv_${user.id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { try { const { d, ts } = JSON.parse(cached); if (Date.now() - ts < 30000) { setInvestments(d); setLoading(false); return } } catch {} }
    const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at')
    const result = inv ?? []
    setInvestments(result)
    setLoading(false)
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ d: result, ts: Date.now() })) } catch {}
  }, [supabase])

  const fetchExchangeRate = useCallback(async () => {
    try {
      const key = process.env.NEXT_PUBLIC_EXCHANGE_RATE_KEY
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/USD/JOD`)
      const data = await res.json()
      if (data.conversion_rate) setUsdToJod(data.conversion_rate)
    } catch {}
  }, [])

  useEffect(() => { load(); fetchExchangeRate() }, [load, fetchExchangeRate])

  function startEditInv(inv: Investment) {
    setEditingInv(inv)
    setEditForm({ symbol: inv.symbol, name: inv.name, type: inv.type, shares: inv.shares.toString(), avg_buy_price: inv.avg_buy_price.toString(), current_price: inv.current_price.toString(), is_halal: inv.is_halal, notes: inv.notes ?? '' })
  }

  async function saveEditInv() {
    if (!editingInv) return
    setSaving(true)
    await supabase.from('investments').update({ symbol: editForm.symbol.toUpperCase(), name: editForm.name, type: editForm.type, shares: parseFloat(editForm.shares) || 0, avg_buy_price: parseFloat(editForm.avg_buy_price) || 0, current_price: parseFloat(editForm.current_price) || 0, is_halal: editForm.is_halal, notes: editForm.notes || null }).eq('id', editingInv.id)
    clearUserCache(currentUser?.id ?? '')
    setEditingInv(null); setSaving(false); load()
  }

  async function deleteInv(id: string) {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  async function loadTxHistory(invId: string) {
    setTxLoading(true)
    setShowTxHistory(invId)
    const { data } = await supabase.from('investment_transactions').select('*').eq('investment_id', invId).order('transaction_date', { ascending: false })
    setTxHistory(data ?? [])
    setTxLoading(false)
  }

  async function refreshPrices() {
    setRefreshing(true); setRefreshMsg('')
    const newStatus: Record<string, 'live' | 'manual'> = {}
    let updated = 0; const failed: string[] = []
    try {
      for (const inv of investments) {
        try {
          const res = await fetch(`/api/stock-price?symbol=${inv.symbol}`)
          const data = await res.json()
          if (data.price) { await supabase.from('investments').update({ current_price: data.price }).eq('id', inv.id); newStatus[inv.id] = 'live'; updated++ }
          else { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
        } catch { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
      }
      await fetchExchangeRate(); await load(); setPriceStatus(newStatus)
      setRefreshMsg(updated === investments.length ? (lang === 'en' ? '✅ All prices updated' : '✅ تم تحديث جميع الأسعار') : updated > 0 ? (lang === 'en' ? `⚠️ Updated ${updated} — Failed: ${failed.join(', ')}` : `⚠️ تم ${updated} — تعذّر: ${failed.join(', ')}`) : (lang === 'en' ? '❌ Update failed' : '❌ تعذّر التحديث'))
    } catch { setRefreshMsg(lang === 'en' ? '❌ Error' : '❌ خطأ') }
    setRefreshing(false)
    setTimeout(() => setRefreshMsg(''), 5000)
  }

  async function addInvestment() {
    setSaving(true)
    const user = currentUser
    if (!user) return
    let initialPrice = 0
    try {
      if (form.type === 'crypto' && form.symbol.toUpperCase() === 'BTC') {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
        const data = await res.json()
        initialPrice = data?.bitcoin?.usd ?? 0
      } else {
        const res = await fetch(`/api/stock-price?symbol=${form.symbol.toUpperCase()}`)
        const data = await res.json()
        initialPrice = data?.price ?? 0
      }
    } catch {}
    await supabase.from('investments').insert({ user_id: user.id, ...form, symbol: form.symbol.toUpperCase(), shares: 0, avg_buy_price: 0, current_price: initialPrice })
    setForm({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true })
    setShowForm(false); setSaving(false); load()
  }

  async function recordBuy(investmentId: string) {
    setSaving(true)
    const user = currentUser
    if (!user) return
    const shares = parseFloat(buyForm.shares)
    const price = parseFloat(buyForm.price)
    const commission = parseFloat(buyForm.commission)
    const inv = investments.find(i => i.id === investmentId)
    if (!inv) return
    await supabase.from('investment_transactions').insert({ investment_id: investmentId, user_id: user.id, type: 'buy', shares, price, commission, transaction_date: buyForm.date })
    const totalShares = inv.shares + shares
    const newAvg = totalShares > 0 ? ((inv.shares * inv.avg_buy_price) + (shares * price)) / totalShares : price
    await supabase.from('investments').update({ shares: totalShares, avg_buy_price: newAvg, current_price: price }).eq('id', investmentId)
    clearUserCache(currentUser?.id ?? '')
    setShowBuyForm(null)
    setBuyForm({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
    setSaving(false); load()
  }

  const totalValueUSD = investments.reduce((a, i) => a + i.shares * i.current_price, 0)
  const totalCostUSD  = investments.reduce((a, i) => a + i.shares * i.avg_buy_price, 0)
  const totalPnL = totalValueUSD - totalCostUSD
  const pnlPct   = totalCostUSD > 0 ? (totalPnL / totalCostUSD * 100).toFixed(1) : '0'

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0,1].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
    </div>
  )

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="المحفظة"
        subtitle={usdToJod ? `1 USD = ${usdToJod.toFixed(3)} JOD` : undefined}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {usdToJod && (
              <button onClick={() => setShowJod(!showJod)} style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {showJod ? '$ USD' : (lang === 'en' ? 'JOD' : 'JOD د.أ')}
              </button>
            )}
            <button onClick={refreshPrices} disabled={refreshing} style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 16, cursor: refreshing ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: refreshing ? 0.5 : 1 }}>
              {refreshing ? '⏳' : '⟳'}
            </button>
            <button onClick={() => setShowForm(true)} style={{ padding: '9px 16px', borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: 'white', fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px var(--accent-blue-glow)' }}>+</button>
          </div>
        }
      />

      {refreshMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 12, fontSize: 13, textAlign: 'center', background: refreshMsg.startsWith('✅') ? 'var(--accent-green-dim)' : 'rgba(245,158,11,0.1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{refreshMsg}</div>
      )}

      <StatBar stats={[
        { label: lang === 'en' ? 'Value' : 'القيمة', value: showJod && usdToJod ? `${(totalValueUSD * usdToJod).toFixed(0)} JD` : `$${totalValueUSD.toFixed(0)}`, color: 'var(--accent-blue-light)' },
        { label: lang === 'en' ? 'Profit' : 'الربح',  value: showJod && usdToJod ? `${(totalPnL * usdToJod).toFixed(0)} JD` : `${totalPnL >= 0 ? '+$' : '-$'}${Math.abs(totalPnL).toFixed(0)}`, color: totalPnL >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
        { label: lang === 'en' ? 'Return' : 'العائد', value: `${parseFloat(pnlPct) >= 0 ? '+' : ''}${pnlPct}%`, color: parseFloat(pnlPct) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
      ]} />

      {investments.length === 0 ? (
        <EmptyState icon="📈" title="لا توجد استثمارات" subtitle="أضف أول أصل استثماري" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {investments.map(inv => {
            const valueUSD = inv.shares * inv.current_price
            const valueJOD = usdToJod ? valueUSD * usdToJod : null
            const costUSD  = inv.shares * inv.avg_buy_price
            const pnl  = valueUSD - costUSD
            const pnlP = costUSD > 0 ? (pnl / costUSD * 100).toFixed(1) : '0'
            const isPos = pnl >= 0
            const isLive = priceStatus[inv.id] === 'live'
            const typeColors: Record<string,string> = { etf: '#3B7EF6', stock: '#10B981', crypto: '#F59E0B', other: '#8B9CC8' }
            const typeColor = typeColors[inv.type] ?? '#3B7EF6'
            return (
              <div key={inv.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: typeColor, fontFamily: 'monospace', letterSpacing: '-0.03em' }}>
                    {inv.symbol.slice(0, 4)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{inv.symbol}</span>
                      {inv.is_halal && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'var(--accent-green-dim)', color: 'var(--accent-green-light)', fontWeight: 700 }}>{lang === 'en' ? 'Halal' : 'حلال'}</span>}
                      {isLive && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue-light)', fontWeight: 700 }}>LIVE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.name}</div>
                  </div>
                  <div style={{ textAlign: 'left', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {showJod && valueJOD ? `${valueJOD.toFixed(0)} JD` : `$${valueUSD.toFixed(2)}`}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isPos ? 'var(--accent-green-light)' : 'var(--accent-red-light)', fontFamily: 'monospace' }}>
                      {isPos ? '+' : ''}{pnlP}%
                    </div>
                  </div>
                  <button onClick={() => startEditInv(inv)} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: lang === 'en' ? 'Units' : 'الوحدات', value: inv.shares.toFixed(5) },
                    { label: lang === 'en' ? 'Avg Buy' : 'متوسط الشراء', value: `$${inv.avg_buy_price.toFixed(2)}` },
                    { label: lang === 'en' ? 'Current Price' : 'السعر الحالي', value: `$${inv.current_price.toFixed(2)}` },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => loadTxHistory(inv.id)}
                  style={{ width: '100%', padding: '9px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}
                >
                  {t('inv_tx_history')}
                </button>

                {showBuyForm === inv.id ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: lang === 'en' ? 'Units' : 'الوحدات', key: 'shares', placeholder: '0.5', type: 'number' },
                        { label: 'السعر $', key: 'price', placeholder: '50', type: 'number' },
                        { label: 'العمولة $', key: 'commission', placeholder: '0.5', type: 'number' },
                        { label: 'التاريخ', key: 'date', placeholder: '', type: 'date' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                          <input type={f.type} value={(buyForm as any)[f.key]} onChange={e => setBuyForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                            style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => recordBuy(inv.id)} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--accent-green)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: 'inherit', opacity: saving ? 0.5 : 1 }}>{saving ? '⏳' : (lang === 'en' ? 'Record Buy' : 'تسجيل الشراء')}</button>
                      <button onClick={() => setShowBuyForm(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowBuyForm(inv.id)} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? '+ Record Buy' : '+ تسجيل شراء'}</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title="إضافة أصل جديد" onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="الرمز"><Input placeholder="SPUS" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} /></FormField>
            <FormField label="الاسم"><Input placeholder="SP Funds ETF" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          </div>
          <FormField label="النوع">
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="etf">ETF</option>
              <option value="stock">{lang === 'en' ? 'Stock' : 'سهم'}</option>
              <option value="crypto">{lang === 'en' ? 'Crypto' : 'عملة رقمية'}</option>
              <option value="other">{lang === 'en' ? 'Other' : 'أخرى'}</option>
            </Select>
          </FormField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 14 }}>
            <input type="checkbox" checked={form.is_halal} onChange={e => setForm(f => ({ ...f, is_halal: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--accent-green)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{lang === 'en' ? '✅ Halal Investment' : '✅ استثمار حلال'}</span>
          </div>
          <SaveButton label="إضافة الأصل" loading={saving} onClick={addInvestment} />
        </Modal>
      )}

      {/* رسم بياني */}
      {investments.length > 0 && (() => {
        const total = investments.reduce((a,i) => a + i.shares * i.current_price, 0)
        const colors = ['#3B7EF6','#10B981','#F59E0B','#8B5CF6','#EF4444','#EC4899']
        return total > 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 14 }}>{t('inv_portfolio_chart')}</div>
            <div style={{ display: 'flex', height: 10, borderRadius: 8, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
              {investments.map((inv, i) => {
                const pct = total > 0 ? (inv.shares * inv.current_price / total) * 100 : 0
                return pct > 0 ? <div key={inv.id} style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 4 }} /> : null
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {investments.map((inv, i) => {
                const val = inv.shares * inv.current_price
                const pct = total > 0 ? (val / total * 100).toFixed(1) : '0'
                const pnl = val - (inv.shares * inv.avg_buy_price)
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{inv.symbol}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: pnl >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-secondary)', minWidth: 55, textAlign: 'left' }}>${val.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null
      })()}

      {/* Modal تاريخ المعاملات */}
      {showTxHistory && (
        <Modal title={t('inv_tx_history')} onClose={() => { setShowTxHistory(null); setTxHistory([]) }}>
          {txLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>{lang === 'en' ? '⏳ Loading...' : '⏳ جاري التحميل...'}</div>
          ) : txHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>لا توجد معاملات بعد</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {txHistory.map(tx => (
                <div key={tx.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: tx.type === 'buy' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {tx.type === 'buy' ? '📈' : '📉'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{tx.type === 'buy' ? (lang === 'en' ? 'Buy' : 'شراء') : (lang === 'en' ? 'Sell' : 'بيع')} {Number(tx.shares).toFixed(4)} {lang === 'en' ? 'units' : 'وحدة'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{tx.transaction_date} · سعر ${Number(tx.price).toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: tx.type === 'buy' ? 'var(--accent-red-light)' : 'var(--accent-green-light)' }}>
                      {tx.type === 'buy' ? '-' : '+'}${(Number(tx.shares) * Number(tx.price)).toFixed(0)}
                    </div>
                    {Number(tx.commission) > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>عمولة ${Number(tx.commission).toFixed(2)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {editingInv && (
        <Modal title={`تعديل ${editingInv.symbol}`} onClose={() => setEditingInv(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="الرمز"><Input value={editForm.symbol} onChange={e => setEditForm(f => ({ ...f, symbol: e.target.value }))} /></FormField>
            <FormField label="الاسم"><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="الوحدات"><Input type="number" value={editForm.shares} onChange={e => setEditForm(f => ({ ...f, shares: e.target.value }))} /></FormField>
            <FormField label="متوسط الشراء $"><Input type="number" value={editForm.avg_buy_price} onChange={e => setEditForm(f => ({ ...f, avg_buy_price: e.target.value }))} /></FormField>
            <FormField label="السعر الحالي $"><Input type="number" value={editForm.current_price} onChange={e => setEditForm(f => ({ ...f, current_price: e.target.value }))} /></FormField>
            <FormField label="النوع">
              <Select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                <option value="etf">ETF</option><option value="stock">{lang === 'en' ? 'Stock' : 'سهم'}</option><option value="crypto">{lang === 'en' ? 'Crypto' : 'عملة رقمية'}</option>
              </Select>
            </FormField>
          </div>
          <FormField label="ملاحظات"><Input placeholder="اختياري" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></FormField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 14 }}>
            <input type="checkbox" checked={editForm.is_halal} onChange={e => setEditForm(f => ({ ...f, is_halal: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--accent-green)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>✅ حلال</span>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: 12, marginBottom: 14 }}>
            ⚠️ تعديل الوحدات والأسعار يؤثر على حسابات الربح والخسارة
          </div>
          <SaveButton label="حفظ التعديلات" loading={saving} onClick={saveEditInv} />
          <button onClick={() => { if (confirm(lang === 'en' ? 'Delete this investment?' : 'حذف هذا الاستثمار؟')) { deleteInv(editingInv.id); setEditingInv(null) } }} style={{ width: '100%', padding: '12px', borderRadius: 10, marginTop: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🗑️ حذف الاستثمار
          </button>
        </Modal>
      )}
    </div>
  )
}
