'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Investment, InvestmentTransaction } from '@/types'

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBuyForm, setShowBuyForm] = useState<string | null>(null)
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

  const fetchExchangeRate = useCallback(async () => {
    try {
      const key = process.env.NEXT_PUBLIC_EXCHANGE_RATE_KEY
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/USD/JOD`)
      const data = await res.json()
      if (data.conversion_rate) setUsdToJod(data.conversion_rate)
    } catch {}
  }, [])

  useEffect(() => { load(); fetchExchangeRate() }, [load, fetchExchangeRate])

  // فتح modal التعديل الكامل
  function startEditInv(inv: Investment) {
    setEditingInv(inv)
    setEditForm({
      symbol: inv.symbol,
      name: inv.name,
      type: inv.type,
      shares: inv.shares.toString(),
      avg_buy_price: inv.avg_buy_price.toString(),
      current_price: inv.current_price.toString(),
      is_halal: inv.is_halal,
      notes: inv.notes ?? '',
    })
  }

  async function saveEditInv() {
    if (!editingInv) return
    setSaving(true)
    await supabase.from('investments').update({
      symbol: editForm.symbol.toUpperCase(),
      name: editForm.name,
      type: editForm.type,
      shares: parseFloat(editForm.shares) || 0,
      avg_buy_price: parseFloat(editForm.avg_buy_price) || 0,
      current_price: parseFloat(editForm.current_price) || 0,
      is_halal: editForm.is_halal,
      notes: editForm.notes || null,
    }).eq('id', editingInv.id)
    setEditingInv(null)
    setSaving(false)
    load()
  }

  async function deleteInv(id: string) {
    await supabase.from('investments').delete().eq('id', id)
    load()
  }

  async function refreshPrices() {
    setRefreshing(true)
    setRefreshMsg('')
    const newStatus: Record<string, 'live' | 'manual'> = {}
    let updated = 0
    let failed: string[] = []
    try {
      for (const inv of investments) {
        try {
          if (inv.symbol === 'BTC') {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
            const data = await res.json()
            const price = data?.bitcoin?.usd
            if (price) {
              await supabase.from('investments').update({ current_price: price }).eq('id', inv.id)
              newStatus[inv.id] = 'live'; updated++
            } else { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
          } else {
            const res = await fetch(`/api/stock-price?symbol=${inv.symbol}`)
            const data = await res.json()
            if (data.price) {
              await supabase.from('investments').update({ current_price: data.price }).eq('id', inv.id)
              newStatus[inv.id] = 'live'; updated++
            } else { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
          }
        } catch { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
      }
      await fetchExchangeRate()
      await load()
      setPriceStatus(newStatus)
      setRefreshMsg(updated === investments.length ? `✅ تم تحديث جميع الأسعار` : updated > 0 ? `⚠️ تم تحديث ${updated} — تعذّر: ${failed.join(', ')}` : `❌ تعذّر التحديث`)
    } catch { setRefreshMsg('❌ خطأ في الاتصال') }
    setRefreshing(false)
    setTimeout(() => setRefreshMsg(''), 5000)
  }

  async function addInvestment() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await supabase.auth.getUser()
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
    setShowBuyForm(null)
    setBuyForm({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
    setSaving(false); load()
  }

  const totalValueUSD = investments.reduce((a, i) => a + i.shares * i.current_price, 0)
  const totalCostUSD = investments.reduce((a, i) => a + i.shares * i.avg_buy_price, 0)
  const totalPnL = totalValueUSD - totalCostUSD
  const pnlPct = totalCostUSD > 0 ? (totalPnL / totalCostUSD * 100).toFixed(1) : '0'
  const totalValueJOD = usdToJod ? totalValueUSD * usdToJod : null

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-3xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">

      {/* Modal تعديل الاستثمار */}
      {editingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setEditingInv(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5 animate-scale-in"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(245,158,11,0.4)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>✏️ تعديل {editingInv.symbol}</h3>
              <button onClick={() => setEditingInv(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'الرمز', key: 'symbol', type: 'text', placeholder: 'SPUS' },
                  { label: 'الاسم', key: 'name', type: 'text', placeholder: 'SP Funds ETF' },
                  { label: 'عدد الوحدات', key: 'shares', type: 'number', placeholder: '1.5' },
                  { label: 'متوسط سعر الشراء $', key: 'avg_buy_price', type: 'number', placeholder: '49.73' },
                  { label: 'السعر الحالي $', key: 'current_price', type: 'number', placeholder: '51.38' },
                ].map(f => (
                  <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                    <input type={f.type} value={(editForm as any)[f.key]}
                      onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                      placeholder={f.placeholder} />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>النوع</label>
                <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                  <option value="etf">ETF</option>
                  <option value="stock">سهم</option>
                  <option value="crypto">عملة رقمية</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>ملاحظات</label>
                <input type="text" value={editForm.notes}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  placeholder="ملاحظات اختيارية..." />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.is_halal}
                  onChange={e => setEditForm(p => ({ ...p, is_halal: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>✅ استثمار حلال</span>
              </div>

              {/* تحذير */}
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                ⚠️ تعديل الوحدات وسعر الشراء يؤثر على حسابات الربح والخسارة
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={saveEditInv} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-black disabled:opacity-50"
                  style={{ background: '#f59e0b', fontFamily: 'inherit' }}>
                  {saving ? '...' : 'حفظ التعديلات'}
                </button>
                <button onClick={() => setEditingInv(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>إلغاء</button>
              </div>

              <button onClick={() => { if(confirm('هل أنت متأكد من حذف هذا الاستثمار؟')) { deleteInv(editingInv.id); setEditingInv(null) } }}
                className="w-full py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red-light)', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'inherit' }}>
                🗑️ حذف الاستثمار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>المحفظة</h1>
          {usdToJod && <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--accent-green-light)' }}>1 USD = {usdToJod.toFixed(3)} JOD 💱</p>}
        </div>
        <div className="flex gap-2">
          {usdToJod && (
            <button onClick={() => setShowJod(!showJod)} className="px-3 py-2.5 rounded-xl text-xs font-black badge-blue" style={{ fontFamily: 'inherit' }}>
              {showJod ? '$ USD' : 'JOD د.أ'}
            </button>
          )}
          <button onClick={refreshPrices} disabled={refreshing} className="px-3 py-2.5 rounded-xl text-sm font-black badge-green disabled:opacity-50" style={{ fontFamily: 'inherit' }}>
            {refreshing ? '⏳' : '🔄'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-2.5 rounded-xl gradient-blue text-white text-sm font-black glow-blue" style={{ fontFamily: 'inherit' }}>+</button>
        </div>
      </div>

      {refreshMsg && (
        <div className="p-3 rounded-xl text-sm text-center animate-scale-in"
          style={{ background: refreshMsg.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: 'var(--text-primary)' }}>
          {refreshMsg}
        </div>
      )}

      {/* Portfolio summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center glow-blue">
          <div className="text-base font-black font-mono" style={{ color: 'var(--accent-blue-light)' }}>
            {showJod && totalValueJOD ? `${totalValueJOD.toFixed(0)}` : `$${totalValueUSD.toFixed(0)}`}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{showJod ? 'JOD' : 'USD'} · القيمة</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-base font-black font-mono" style={{ color: totalPnL >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
            {showJod && usdToJod ? `${(totalPnL * usdToJod).toFixed(0)}` : `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)}`}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{showJod ? 'JOD' : 'USD'} · الربح</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-base font-black font-mono" style={{ color: parseFloat(pnlPct) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
            {parseFloat(pnlPct) >= 0 ? '+' : ''}{pnlPct}%
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>العائد</div>
        </div>
      </div>

      {/* Exchange rate */}
      {usdToJod && totalValueJOD && (
        <div className="card p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💱</span>
            <div>
              <div className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>سعر الصرف الحي</div>
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>المحفظة = {totalValueJOD.toFixed(2)} دينار</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black font-mono text-sm" style={{ color: 'var(--accent-teal)' }}>{usdToJod.toFixed(4)}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>USD/JOD</div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card p-4 animate-scale-in" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
          <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>إضافة أصل جديد</h3>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'الرمز', key: 'symbol', placeholder: 'SPUS' }, { label: 'الاسم', key: 'name', placeholder: 'SP Funds ETF' }].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input type="text" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
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
              className="flex-1 py-3 rounded-xl gradient-blue text-white text-sm font-black disabled:opacity-50" style={{ fontFamily: 'inherit' }}>
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
          const valueUSD = inv.shares * inv.current_price
          const valueJOD = usdToJod ? valueUSD * usdToJod : null
          const costUSD = inv.shares * inv.avg_buy_price
          const pnl = valueUSD - costUSD
          const pnlP = costUSD > 0 ? (pnl / costUSD * 100).toFixed(1) : '0'
          const typeIcons: Record<string,string> = { etf: '📊', stock: '📈', crypto: '🪙', other: '💼' }
          const isLive = priceStatus[inv.id] === 'live'
          const isManual = priceStatus[inv.id] === 'manual'

          return (
            <div key={inv.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center text-white font-black text-xs shrink-0">
                    {inv.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-black" style={{ color: 'var(--text-primary)' }}>{inv.symbol}</span>
                      {inv.is_halal && <span className="text-xs">✅</span>}
                      {isLive && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green-light)', fontSize: '10px' }}>LIVE</span>}
                      {isManual && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '10px' }}>يدوي</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{typeIcons[inv.type]} {inv.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-black font-mono" style={{ color: 'var(--text-primary)' }}>
                      {showJod && valueJOD ? `${valueJOD.toFixed(2)} JOD` : `$${valueUSD.toFixed(2)}`}
                    </div>
                    {showJod && valueJOD && <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>${valueUSD.toFixed(2)}</div>}
                    <div className="text-xs font-mono" style={{ color: pnl >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                      {pnl >= 0 ? '+' : ''}{pnlP}%
                    </div>
                  </div>
                  {/* زر التعديل الكامل */}
                  <button onClick={() => startEditInv(inv)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>✏️</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'الوحدات', value: inv.shares.toFixed(5) },
                  { label: 'متوسط الشراء', value: `$${inv.avg_buy_price.toFixed(2)}` },
                  { label: 'السعر الحالي', value: `$${inv.current_price.toFixed(2)}` },
                ].map((s, i) => (
                  <div key={i} className="text-center p-2 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="text-xs font-black font-mono" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

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
                        <input type={f.key === 'date' ? 'date' : 'number'} value={(buyForm as any)[f.key]}
                          onChange={e => setBuyForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-2 py-2 rounded-xl text-xs outline-none"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                          placeholder={f.placeholder} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => recordBuy(inv.id)} disabled={saving}
                      className="flex-1 py-2.5 rounded-xl gradient-green text-white text-sm font-black" style={{ fontFamily: 'inherit' }}>
                      {saving ? '...' : 'تسجيل الشراء'}
                    </button>
                    <button onClick={() => setShowBuyForm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontFamily: 'inherit' }}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowBuyForm(inv.id)}
                  className="w-full py-2.5 rounded-xl gradient-green text-white text-sm font-black"
                  style={{ fontFamily: 'inherit' }}>+ تسجيل شراء</button>
              )}
            </div>
          )
        })}
      </div>

      {investments.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-4xl mb-3">📈</div>
          <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد استثمارات</div>
        </div>
      )}
    </div>
  )
}
