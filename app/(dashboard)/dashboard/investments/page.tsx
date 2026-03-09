'use client'
// app/(dashboard)/investments/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Investment, InvestmentTransaction } from '@/types'

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBuyForm, setShowBuyForm] = useState<string | null>(null)
  const [form, setForm] = useState({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true, notes: '' })
  const [buyForm, setBuyForm] = useState({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at')
    setInvestments(inv ?? [])
    if (inv && inv.length > 0) {
      const { data: txns } = await supabase.from('investment_transactions')
        .select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(20)
      setTransactions(txns ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addInvestment() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('investments').insert({ user_id: user.id, ...form })
    setForm({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true, notes: '' })
    setShowForm(false)
    setSaving(false)
    load()
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

    // Insert transaction
    await supabase.from('investment_transactions').insert({
      investment_id: investmentId, user_id: user.id,
      type: 'buy', shares, price, commission, transaction_date: buyForm.date
    })

    // Update investment: recalculate avg price
    const totalShares = inv.shares + shares
    const newAvg = totalShares > 0 ? ((inv.shares * inv.avg_buy_price) + (shares * price)) / totalShares : price
    await supabase.from('investments').update({
      shares: totalShares,
      avg_buy_price: newAvg,
      current_price: price,
    }).eq('id', investmentId)

    setShowBuyForm(null)
    setBuyForm({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
    setSaving(false)
    load()
  }

  async function updatePrice(invId: string, price: number) {
    await supabase.from('investments').update({ current_price: price }).eq('id', invId)
    load()
  }

  const totalValue = investments.reduce((a, i) => a + i.shares * i.current_price, 0)
  const totalCost = investments.reduce((a, i) => a + i.shares * i.avg_buy_price, 0)
  const totalPnL = totalValue - totalCost
  const pnlPct = totalCost > 0 ? (totalPnL / totalCost * 100).toFixed(1) : '0'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-2xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>المحفظة الاستثمارية</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>SPUS وBTC وكل أصولك</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl gradient-blue text-white text-sm font-medium hover:opacity-90">
          + إضافة أصل
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xl font-bold" style={{ color: 'var(--accent-blue)' }}>${totalValue.toFixed(2)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>القيمة الحالية</div>
        </div>
        <div className="p-4 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xl font-bold" style={{ color: totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>الربح / الخسارة</div>
        </div>
        <div className="p-4 rounded-2xl border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xl font-bold" style={{ color: parseFloat(pnlPct) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {parseFloat(pnlPct) >= 0 ? '+' : ''}{pnlPct}%
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>نسبة العائد</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-6 rounded-2xl border animate-slide-up" style={{ background: 'var(--bg-card)', borderColor: 'rgba(79,142,247,0.3)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>إضافة أصل جديد</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'الرمز (Symbol)', key: 'symbol', type: 'text', placeholder: 'SPUS' },
              { label: 'الاسم', key: 'name', type: 'text', placeholder: 'SP Funds S&P 500 ETF' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                <input type={f.type} value={(form as Record<string, unknown>)[f.key] as string}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder={f.placeholder} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>النوع</label>
              <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option value="etf">ETF</option>
                <option value="stock">سهم</option>
                <option value="crypto">عملة رقمية</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_halal} onChange={e => setForm(prev => ({ ...prev, is_halal: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>✅ حلال (متوافق شرعياً)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addInvestment} disabled={saving || !form.symbol || !form.name}
              className="px-5 py-2.5 rounded-xl gradient-blue text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : 'إضافة'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Investment cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {investments.map((inv) => {
          const value = inv.shares * inv.current_price
          const cost = inv.shares * inv.avg_buy_price
          const pnl = value - cost
          const pnlP = cost > 0 ? (pnl / cost * 100).toFixed(1) : '0'
          const typeIcons: Record<string, string> = { etf: '📊', stock: '📈', crypto: '🪙', other: '💼' }

          return (
            <div key={inv.id} className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl gradient-blue flex items-center justify-center text-white font-bold text-sm">
                    {inv.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{inv.symbol}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {typeIcons[inv.type]} {inv.name} {inv.is_halal && '✅'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color: 'var(--text-primary)' }}>${value.toFixed(2)}</div>
                  <div className="text-xs" style={{ color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlP}%)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'الوحدات', value: inv.shares.toFixed(8).replace(/\.?0+$/, '') },
                  { label: 'متوسط الشراء', value: `$${inv.avg_buy_price.toFixed(4)}` },
                  { label: 'السعر الحالي', value: `$${inv.current_price.toFixed(4)}` },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{stat.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {showBuyForm === inv.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'عدد الوحدات', key: 'shares', placeholder: '0.5' },
                      { label: 'السعر ($)', key: 'price', placeholder: '50' },
                      { label: 'العمولة ($)', key: 'commission', placeholder: '0.5' },
                      { label: 'التاريخ', key: 'date', placeholder: '' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                        <input type={f.key === 'date' ? 'date' : 'number'}
                          value={(buyForm as Record<string, string>)[f.key]}
                          onChange={e => setBuyForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full px-2 py-2 rounded-lg text-xs outline-none"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          placeholder={f.placeholder} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => recordBuy(inv.id)} disabled={saving}
                      className="flex-1 py-2 rounded-lg gradient-green text-white text-xs font-medium">
                      {saving ? '...' : 'تسجيل الشراء'}
                    </button>
                    <button onClick={() => setShowBuyForm(null)}
                      className="flex-1 py-2 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setShowBuyForm(inv.id)}
                    className="flex-1 py-2 rounded-lg gradient-green text-white text-xs font-medium hover:opacity-90">
                    + شراء
                  </button>
                  <button onClick={() => {
                    const price = prompt('أدخل السعر الحالي ($):')
                    if (price) updatePrice(inv.id, parseFloat(price))
                  }} className="flex-1 py-2 rounded-lg text-xs font-medium"
                    style={{ background: 'rgba(79,142,247,0.15)', color: 'var(--accent-blue)' }}>
                    تحديث السعر
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>آخر العمليات</h3>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((t) => {
              const inv = investments.find(i => i.id === t.investment_id)
              return (
                <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded gradient-blue flex items-center justify-center text-white text-xs">{t.type === 'buy' ? '↓' : '↑'}</div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inv?.symbol ?? '-'} — {t.type === 'buy' ? 'شراء' : 'بيع'}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.transaction_date} | {t.shares} وحدة × ${t.price}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>${(t.shares * t.price).toFixed(2)}</div>
                    {t.commission > 0 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>عمولة: ${t.commission}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {investments.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
          <div className="text-4xl mb-3">📈</div>
          <div className="font-medium">أضف SPUS وBTC لتبدأ تتبع محفظتك</div>
        </div>
      )}
    </div>
  )
}
