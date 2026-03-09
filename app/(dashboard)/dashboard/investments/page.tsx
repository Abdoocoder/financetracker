'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Investment, InvestmentTransaction } from '@/types'

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBuyForm, setShowBuyForm] = useState<string | null>(null)
  const [form, setForm] = useState({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true })
  const [buyForm, setBuyForm] = useState({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [editPrice, setEditPrice] = useState<{id: string, price: string} | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at')
    setInvestments(inv ?? [])
    if (inv && inv.length > 0) {
      const { data: txns } = await supabase.from('investment_transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(10)
      setTransactions(txns ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // جلب أسعار حية
  async function refreshPrices() {
    setRefreshing(true)
    setRefreshMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let updated = 0

      // BTC من CoinGecko
      const btcInv = investments.find(i => i.symbol === 'BTC')
      if (btcInv) {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
        const data = await res.json()
        const btcPrice = data?.bitcoin?.usd
        if (btcPrice) {
          await supabase.from('investments').update({ current_price: btcPrice }).eq('id', btcInv.id)
          updated++
        }
      }

      // SPUS من Yahoo Finance (غير رسمي)
      const spusInv = investments.find(i => i.symbol === 'SPUS')
      if (spusInv) {
        try {
          const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/SPUS?interval=1d&range=1d')
          const data = await res.json()
          const spusPrice = data?.chart?.result?.[0]?.meta?.regularMarketPrice
          if (spusPrice) {
            await supabase.from('investments').update({ current_price: spusPrice }).eq('id', spusInv.id)
            updated++
          }
        } catch {
          // Yahoo قد يحجب الطلب من المتصفح
        }
      }

      await load()
      setRefreshMsg(updated > 0 ? `✅ تم تحديث ${updated} أصول` : '⚠️ تعذر التحديث، حاول لاحقاً')
    } catch {
      setRefreshMsg('❌ خطأ في الاتصال')
    }
    setRefreshing(false)
    setTimeout(() => setRefreshMsg(''), 3000)
  }

  async function addInvestment() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('investments').insert({ user_id: user.id, ...form, shares: 0, avg_buy_price: 0, current_price: 0 })
    setForm({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true })
    setShowForm(false); setSaving(false); load()
  }

  async function recordBuy(investmentId: string) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const shares = parseFloat(buyForm.shares)
    const price = parseFloat(buyForm.price)
    const commission = parseFloat(buyForm.commission)
    const inv = investments.find(i => i.id === investmentId)
    if (!inv) return
    await supabase.from('investment_transactions').insert({
      investment_id: investmentId, user_id: user.id, type: 'buy', shares, price, commission, transaction_date: buyForm.date
    })
    const totalShares = inv.shares + shares
    const newAvg = totalShares > 0 ? ((inv.shares * inv.avg_buy_price) + (shares * price)) / totalShares : price
    await supabase.from('investments').update({ shares: totalShares, avg_buy_price: newAvg, current_price: price }).eq('id', investmentId)
    setShowBuyForm(null)
    setBuyForm({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
    setSaving(false); load()
  }

  async function updatePrice(invId: string, price: number) {
    await supabase.from('investments').update({ current_price: price }).eq('id', invId)
    setEditPrice(null); load()
  }

  const totalValue = investments.reduce((a, i) => a + i.shares * i.current_price, 0)
  const totalCost = investments.reduce((a, i) => a + i.shares * i.avg_buy_price, 0)
  const totalPnL = totalValue - totalCost
  const pnlPct = totalCost > 0 ? (totalPnL / totalCost * 100).toFixed(1) : '0'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-3xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>المحفظة</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>SPUS · BTC</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshPrices} disabled={refreshing}
            className="px-3 py-2.5 rounded-xl text-sm font-black transition-all badge-green disabled:opacity-50"
            style={{ fontFamily: 'inherit' }}>
            {refreshing ? '⏳' : '🔄 تحديث'}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue"
            style={{ fontFamily: 'inherit' }}>
            + إضافة
          </button>
        </div>
      </div>

      {/* Refresh message */}
      {refreshMsg && (
        <div className="p-3 rounded-xl text-sm text-center badge-green animate-scale-in">{refreshMsg}</div>
      )}

      {/* Portfolio summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center glow-blue">
          <div className="text-base font-black font-mono" style={{ color: 'var(--accent-blue-light)' }}>${totalValue.toFixed(0)}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>القيمة</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-base font-black font-mono" style={{ color: totalPnL >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>الربح</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-base font-black font-mono" style={{ color: parseFloat(pnlPct) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
            {parseFloat(pnlPct) >= 0 ? '+' : ''}{pnlPct}%
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>العائد</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>إضافة أصل جديد</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'الرمز', key: 'symbol', placeholder: 'SPUS' },
              { label: 'الاسم', key: 'name', placeholder: 'SP Funds ETF' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input type="text" value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>النوع</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                <option value="etf">ETF</option>
                <option value="stock">سهم</option>
                <option value="crypto">عملة رقمية</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={form.is_halal} onChange={e => setForm(p => ({ ...p, is_halal: e.target.checked }))} className="w-4 h-4" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>✅ حلال</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addInvestment} disabled={saving || !form.symbol || !form.name}
              className="flex-1 py-3 rounded-xl gradient-blue text-white text-sm font-black disabled:opacity-50"
              style={{ fontFamily: 'inherit' }}>
              {saving ? '...' : 'إضافة'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Investment cards */}
      <div className="space-y-3">
        {investments.map((inv) => {
          const value = inv.shares * inv.current_price
          const cost = inv.shares * inv.avg_buy_price
          const pnl = value - cost
          const pnlP = cost > 0 ? (pnl / cost * 100).toFixed(1) : '0'
          const typeIcons: Record<string,string> = { etf: '📊', stock: '📈', crypto: '🪙', other: '💼' }

          return (
            <div key={inv.id} className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center text-white font-black text-xs shrink-0">
                    {inv.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="font-black" style={{ color: 'var(--text-primary)' }}>
                      {inv.symbol} {inv.is_halal && <span className="text-xs">✅</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{typeIcons[inv.type]} {inv.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black font-mono" style={{ color: 'var(--text-primary)' }}>${value.toFixed(2)}</div>
                  <div className="text-xs font-mono" style={{ color: pnl >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                    {pnl >= 0 ? '+' : ''}{pnlP}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'الوحدات', value: inv.shares.toFixed(4) },
                  { label: 'متوسط الشراء', value: `$${inv.avg_buy_price.toFixed(2)}` },
                  { label: 'السعر الحالي', value: `$${inv.current_price.toFixed(2)}` },
                ].map((s, i) => (
                  <div key={i} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-xs font-black font-mono" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {editPrice?.id === inv.id ? (
                <div className="flex gap-2 mb-3">
                  <input type="number" value={editPrice.price}
                    onChange={e => setEditPrice({ id: inv.id, price: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none text-center"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    placeholder="السعر $" autoFocus />
                  <button onClick={() => updatePrice(inv.id, parseFloat(editPrice.price))}
                    className="px-4 py-2 rounded-xl gradient-blue text-white text-sm font-black">✓</button>
                  <button onClick={() => setEditPrice(null)}
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>✕</button>
                </div>
              ) : null}

              {showBuyForm === inv.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'الوحدات', key: 'shares', placeholder: '0.5' },
                      { label: 'السعر $', key: 'price', placeholder: '50' },
                      { label: 'العمولة $', key: 'commission', placeholder: '0.5' },
                      { label: 'التاريخ', key: 'date', placeholder: '' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                        <input type={f.key === 'date' ? 'date' : 'number'}
                          value={(buyForm as any)[f.key]}
                          onChange={e => setBuyForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-2 py-2 rounded-xl text-xs outline-none"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                          placeholder={f.placeholder} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => recordBuy(inv.id)} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl gradient-green text-white text-sm font-black"
                      style={{ fontFamily: 'inherit' }}>
                      {saving ? '...' : 'تسجيل الشراء'}
                    </button>
                    <button onClick={() => setShowBuyForm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontFamily: 'inherit' }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowBuyForm(inv.id)}
                    className="flex-1 py-2.5 rounded-xl gradient-green text-white text-sm font-black hover:opacity-90"
                    style={{ fontFamily: 'inherit' }}>
                    + شراء
                  </button>
                  <button onClick={() => setEditPrice({ id: inv.id, price: inv.current_price.toString() })}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold badge-blue hover:opacity-80 transition-opacity"
                    style={{ fontFamily: 'inherit' }}>
                    ✏️ السعر
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="card p-4">
          <h3 className="font-black mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>آخر العمليات</h3>
          <div className="space-y-2">
            {transactions.map((t) => {
              const inv = investments.find(i => i.id === t.investment_id)
              return (
                <div key={t.id} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg gradient-blue flex items-center justify-center text-white text-xs font-black">
                      {t.type === 'buy' ? '↓' : '↑'}
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {inv?.symbol} · {t.type === 'buy' ? 'شراء' : 'بيع'}
                      </div>
                      <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.transaction_date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black font-mono" style={{ color: 'var(--text-primary)' }}>
                      ${(t.shares * t.price).toFixed(2)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {investments.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-4xl mb-3">📈</div>
          <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد استثمارات</div>
        </div>
      )}
    </div>
  )
}
