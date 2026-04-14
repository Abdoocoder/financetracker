'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { clearUserCache } from '@/lib/cache'
import type { Investment, InvestmentTransaction } from '@/types'
import { fetchExchangeRate as fetchRate } from '@/lib/currency'
import { PageHeader } from '@/components/ui/page-header'
import { StatBar } from '@/components/ui/stat-bar'
import { Modal } from '@/components/ui/modal'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { EmptyState } from '@/components/ui/empty-state'
import { useI18n } from '@/lib/i18n'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { PageSkeleton, ListSkeleton, Skeleton } from '@/components/ui/skeleton'


// مسح cache المستخدم بعد أي تعديل

async function fetchStockPrice(symbol: string): Promise<number | null> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session?.access_token) return null
  try {
    const res = await fetch(`/api/stock-price?symbol=${symbol}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    return data.price ?? null
  } catch { return null }
}

function WealthSimulator({ lang, currency }: { lang: string; currency: string }) {
  const ar = lang === 'ar'
  const [monthly, setMonthly] = useState(50)
  const [years, setYears] = useState(10)
  const [rate, setRate] = useState(7)
  const [showDetails, setShowDetails] = useState(false)

  // حساب القيمة المستقبلية مع الفائدة المركبة
  function calc(m: number, y: number, r: number) {
    const monthlyRate = r / 100 / 12
    const months = y * 12
    if (monthlyRate === 0) return m * months
    return m * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
  }

  const future = calc(monthly, years, rate)
  const invested = monthly * years * 12
  const profit = future - invested
  const multiplier = future / invested

  // جدول تفصيلي
  const milestones = [1, 3, 5, 10, 15, 20].filter(y => y <= years + 5)

  return (
    <div style={{ margin: '20px 0', background: 'var(--bg-card)', borderRadius: 20, padding: 20, border: '1px solid rgba(59,126,246,0.2)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>
            📈 {ar ? 'محاكي الثروة' : 'Wealth Simulator'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {ar ? 'شاهد كيف ينمو استثمارك مع الزمن' : 'See how your investment grows over time'}
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20,
          background: 'linear-gradient(135deg, var(--accent-blue-dim), rgba(16,185,129,0.1))',
          border: '1px solid rgba(59,126,246,0.2)',
          fontSize: 11, fontWeight: 800, color: 'var(--accent-blue-light)',
        }}>
          {ar ? `${multiplier.toFixed(1)}x` : `${multiplier.toFixed(1)}x return`}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>

        {/* الاستثمار الشهري */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
              {ar ? 'الاستثمار الشهري' : 'Monthly Investment'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>
              {monthly} {currency}
            </span>
          </div>
          <input type="range" min={10} max={1000} step={10} value={monthly}
            aria-label={ar ? 'قيمة الاستثمار الشهري' : 'Monthly investment amount'}
            onChange={e => setMonthly(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>10 {currency}</span><span>1,000 {currency}</span>
          </div>
        </div>

        {/* عدد السنوات */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
              {ar ? 'المدة' : 'Duration'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>
              {years} {ar ? 'سنة' : 'yrs'}
            </span>
          </div>
          <input type="range" min={1} max={30} step={1} value={years}
            aria-label={ar ? 'عدد سنوات الاستثمار' : 'Investment duration in years'}
            onChange={e => setYears(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>1 {ar ? 'سنة' : 'yr'}</span><span>30 {ar ? 'سنة' : 'yrs'}</span>
          </div>
        </div>

        {/* معدل العائد */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
              {ar ? 'معدل العائد السنوي' : 'Annual Return'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-green-light)', fontFamily: 'monospace' }}>
              {rate}%
            </span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={rate}
            aria-label={ar ? 'معدل العائد السنوي' : 'Annual return rate'}
            onChange={e => setRate(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-green)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            <span>1%</span>
            <span style={{ color: '#F59E0B' }}>7% S&P500</span>
            <span>20%</span>
          </div>
        </div>
      </div>

      {/* النتيجة الرئيسية */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,126,246,0.1), rgba(16,185,129,0.08))',
        border: '1px solid rgba(59,126,246,0.2)',
        borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          {ar ? `بعد ${years} سنة ستمتلك` : `After ${years} years you'll have`}
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, fontFamily: 'monospace',
          background: 'linear-gradient(135deg, var(--accent-blue-light), var(--accent-green-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {future >= 1000000
            ? (future / 1000000).toFixed(2) + 'M'
            : future >= 1000
            ? (future / 1000).toFixed(1) + 'K'
            : future.toFixed(0)
          } {currency}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ar ? 'ما دفعته' : 'You invested'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {(invested/1000).toFixed(1)}K {currency}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ar ? 'الربح' : 'Profit'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-green-light)', fontFamily: 'monospace' }}>
              +{profit >= 1000 ? (profit/1000).toFixed(1) + 'K' : profit.toFixed(0)} {currency}
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ar ? 'المضاعف' : 'Multiplier'}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>
              {multiplier.toFixed(1)}x
            </div>
          </div>
        </div>
      </div>

      {/* جدول المعالم */}
      <button onClick={() => setShowDetails(!showDetails)} style={{
        width: '100%', padding: '10px', borderRadius: 12,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {showDetails
          ? (ar ? '▲ إخفاء التفاصيل' : '▲ Hide details')
          : (ar ? '▼ عرض التفاصيل سنة بسنة' : '▼ Show year by year')}
      </button>

      {showDetails && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {milestones.map(y => {
            const val = calc(monthly, y, rate)
            const inv = monthly * y * 12
            const pct = ((val - inv) / inv * 100)
            return (
              <div key={y} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 10,
                background: y === years ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)',
                border: `1px solid ${y === years ? 'rgba(59,126,246,0.2)' : 'var(--border)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: y === years ? 'var(--accent-blue-light)' : 'var(--text-muted)' }}>
                  {ar ? `بعد ${y} سنة` : `${y} years`}
                </span>
                <div style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: y === years ? 'var(--accent-blue-light)' : 'var(--text-primary)' }}>
                    {val >= 1000 ? (val/1000).toFixed(1) + 'K' : val.toFixed(0)} {currency}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--accent-green-light)' }}>+{pct.toFixed(0)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* تلميح */}
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        💡 {ar
          ? 'هذا الحساب يعتمد على الفائدة المركبة. العوائد الفعلية قد تختلف.'
          : 'This calculation is based on compound interest. Actual returns may vary.'}
      </div>
    </div>
  )
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const { user: currentUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBuyForm, setShowBuyForm] = useState<string | null>(null)
  const [showSellForm, setShowSellForm] = useState<string | null>(null)
  const [sellForm, setSellForm] = useState({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
  const [sellConfirm, setSellConfirm] = useState<{ inv: Investment; shares: number; price: number; commission: number; proceeds: number; realizedPnl: number } | null>(null)
  const [cashBalance, setCashBalance] = useState(0)
  const [cashCurrency, setCashCurrency] = useState('USD')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferRate, setTransferRate] = useState<number | null>(null)
  const [loadingRate, setLoadingRate] = useState(false)
  const [showTxHistory, setShowTxHistory] = useState<string | null>(null)
  const [txHistory, setTxHistory] = useState<InvestmentTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [editingInv, setEditingInv] = useState<Investment | null>(null)
  const [form, setForm] = useState({ symbol: '', name: '', type: 'etf', currency: 'USD', is_halal: true })
  const [editForm, setEditForm] = useState({ symbol: '', name: '', type: 'etf', shares: '', avg_buy_price: '', current_price: '', is_halal: true, notes: '', purchase_date: '' })
  const [buyForm, setBuyForm] = useState({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [pricesRefreshing, setPricesRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [usdToJod, setUsdToJod] = useState<number | null>(null)
  const [showJod, setShowJod] = useState(false)
  const [priceStatus, setPriceStatus] = useState<Record<string, 'live' | 'manual'>>({})
  const [userCurrency, setUserCurrency] = useState('JOD')
  const [sortBy, setSortBy] = useState<'none' | 'gain' | 'loss' | 'value' | 'name'>('none')
  const [filterType, setFilterType] = useState<'all' | 'halal' | 'crypto' | 'stocks'>('all')
  const { t, lang } = useI18n()
  const supabase = createClient()

  const load = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const cacheKey = `inv_${user.id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { try { const { d, ts } = JSON.parse(cached); if (Date.now() - ts < 300000) { setInvestments(d); setLoading(false); return } } catch {} }
    const { data: inv } = await supabase.from('investments').select('*').eq('user_id', user.id).order('created_at')
    const result = inv ?? []
    setInvestments(result)
    setLoading(false)
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ d: result, ts: Date.now() })) } catch {}
  }, [currentUser, supabase])

  const loadCashBalance = useCallback(async () => {
    const user = currentUser
    if (!user) return
    const { data } = await supabase.from('investment_cash').select('*').eq('user_id', user.id)
    if (data && data.length > 0) {
      setCashBalance(Number(data[0].balance))
      setCashCurrency(data[0].currency ?? 'USD')
    } else {
      setCashBalance(0)
    }
  }, [currentUser, supabase])

  useEffect(() => {
    if (currentUser) {
      supabase.from('profiles').select('currency').eq('id', currentUser.id).single()
        .then(({ data }) => { if (data?.currency) setUserCurrency(data.currency) })
    }
  }, [currentUser, supabase])

  useEffect(() => {
    if (userCurrency === 'USD') { setUsdToJod(1); return }
    fetchRate('USD', userCurrency).then(rate => { if (rate) setUsdToJod(rate) })
  }, [userCurrency])

  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load(); await loadCashBalance() })

  useEffect(() => {
    load()
    loadCashBalance()
    // تحديث تلقائي للأسعار في الخلفية بعد عرض البيانات المحفوظة
    const autoRefresh = async () => {
      if (!currentUser) return
      // نأخر التحديث 2 ثانية عشان يظهر المحتوى أولاً
      await new Promise(r => setTimeout(r, 2000))
      const { data: invs } = await supabase.from('investments').select('id,symbol').eq('user_id', currentUser.id)
      if (!invs?.length) return
      // Parallel calls — كل الأسهم معاً بدل واحد واحد
      await Promise.allSettled(
        invs.map(async (inv) => {
          try {
            const price = await fetchStockPrice(inv.symbol)
            if (price) await supabase.from('investments').update({ current_price: price }).eq('id', inv.id)
          } catch {}
        })
      )
      // نمسح الـ cache عشان يجلب البيانات الجديدة
      try { sessionStorage.removeItem(`inv_${currentUser.id}`) } catch {}
      load()
    }
    autoRefresh()
  }, [load, loadCashBalance, currentUser, supabase])

  function startEditInv(inv: Investment) {
    setEditingInv(inv)
    setEditForm({ symbol: inv.symbol, name: inv.name, type: inv.type, shares: inv.shares.toString(), avg_buy_price: inv.avg_buy_price.toString(), current_price: inv.current_price.toString(), is_halal: inv.is_halal, notes: inv.notes ?? '', purchase_date: inv.purchase_date ?? '' })
  }

  async function saveEditInv() {
    if (!editingInv) return
    setSaving(true)
    await supabase.from('investments').update({ symbol: editForm.symbol.toUpperCase(), name: editForm.name, type: editForm.type, shares: parseFloat(editForm.shares) || 0, avg_buy_price: parseFloat(editForm.avg_buy_price) || 0, current_price: parseFloat(editForm.current_price) || 0, is_halal: editForm.is_halal, notes: editForm.notes || null, ...(editForm.purchase_date ? { purchase_date: editForm.purchase_date } : {}) }).eq('id', editingInv.id)
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
    setPricesRefreshing(true); setRefreshMsg('')
    const newStatus: Record<string, 'live' | 'manual'> = {}
    let updated = 0; const failed: string[] = []
    try {
      for (const inv of investments) {
        try {
          const price = await fetchStockPrice(inv.symbol)
          if (price) { await supabase.from('investments').update({ current_price: price }).eq('id', inv.id); newStatus[inv.id] = 'live'; updated++ }
          else { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
        } catch { failed.push(inv.symbol); newStatus[inv.id] = 'manual' }
      }
      fetchRate('USD', userCurrency).then(r => { if (r) setUsdToJod(r) }); await load(); setPriceStatus(newStatus)
      setRefreshMsg(updated === investments.length ? (lang === 'en' ? '✅ All prices updated' : '✅ تم تحديث جميع الأسعار') : updated > 0 ? (lang === 'en' ? `⚠️ Updated ${updated} — Failed: ${failed.join(', ')}` : `⚠️ تم ${updated} — تعذّر: ${failed.join(', ')}`) : (lang === 'en' ? '❌ Update failed' : '❌ تعذّر التحديث'))
    } catch { setRefreshMsg(lang === 'en' ? '❌ Error' : '❌ خطأ') }
    setPricesRefreshing(false)
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
        initialPrice = (await fetchStockPrice(form.symbol.toUpperCase())) ?? 0
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

  function openSellConfirm(inv: Investment) {
    const shares = parseFloat(sellForm.shares)
    const price = parseFloat(sellForm.price)
    const commission = parseFloat(sellForm.commission) || 0
    if (!shares || shares <= 0 || !price || price <= 0) return
    if (shares > inv.shares) return
    const proceeds = shares * price - commission
    const realizedPnl = proceeds - shares * inv.avg_buy_price
    setSellConfirm({ inv, shares, price, commission, proceeds, realizedPnl })
  }

  async function confirmSell() {
    if (!sellConfirm || !currentUser) return
    const { inv, shares, price, commission, proceeds } = sellConfirm
    setSaving(true)
    await supabase.from('investment_transactions').insert({
      investment_id: inv.id, user_id: currentUser.id,
      type: 'sell', shares, price, commission,
      transaction_date: sellForm.date,
    })
    const newShares = inv.shares - shares
    await supabase.from('investments').update({ shares: newShares }).eq('id', inv.id)
    await supabase.rpc('upsert_investment_cash', {
      p_user_id: currentUser.id,
      p_currency: inv.currency ?? 'USD',
      p_amount: proceeds,
    })
    clearUserCache(currentUser.id)
    setSellConfirm(null)
    setShowSellForm(null)
    setSellForm({ shares: '', price: '', commission: '0.5', date: new Date().toISOString().split('T')[0] })
    setSaving(false)
    load()
    loadCashBalance()
  }

  async function openTransferModal() {
    setTransferAmount(cashBalance.toFixed(2))
    setShowTransferModal(true)
    if (cashCurrency !== userCurrency) {
      setLoadingRate(true)
      const rate = await fetchRate(cashCurrency, userCurrency)
      setTransferRate(rate)
      setLoadingRate(false)
    } else {
      setTransferRate(1)
    }
  }

  async function confirmTransfer() {
    const amount = parseFloat(transferAmount)
    if (!amount || amount <= 0 || amount > cashBalance || !currentUser) return
    setSaving(true)
    const convertedAmount = transferRate ? amount * transferRate : amount
    await supabase.from('transactions').insert({
      user_id: currentUser.id,
      type: 'income',
      category: 'استثمار',
      amount: convertedAmount,
      description: `تحويل من المحفظة الاستثمارية (${amount.toFixed(2)} ${cashCurrency}${cashCurrency !== userCurrency && transferRate ? ` ← ${convertedAmount.toFixed(2)} ${userCurrency}` : ''})`,
      transaction_date: new Date().toISOString().split('T')[0],
    })
    await supabase.rpc('upsert_investment_cash', {
      p_user_id: currentUser.id,
      p_currency: cashCurrency,
      p_amount: -amount,
    })
    clearUserCache(currentUser.id)
    setShowTransferModal(false)
    setSaving(false)
    loadCashBalance()
  }

  const totalValueUSD = investments.reduce((a, i) => a + i.shares * i.current_price, 0)
  const totalCostUSD  = investments.reduce((a, i) => a + i.shares * i.avg_buy_price, 0)
  const totalPnL = totalValueUSD - totalCostUSD
  const pnlPct   = totalCostUSD > 0 ? (totalPnL / totalCostUSD * 100).toFixed(1) : '0'

  const displayedInvestments = (() => {
    let list = [...investments]
    if (filterType === 'halal') list = list.filter(i => i.is_halal)
    else if (filterType === 'crypto') list = list.filter(i => i.type === 'crypto')
    else if (filterType === 'stocks') list = list.filter(i => i.type !== 'crypto')
    const gainPct = (i: Investment) => i.shares * i.avg_buy_price > 0
      ? (i.shares * i.current_price - i.shares * i.avg_buy_price) / (i.shares * i.avg_buy_price)
      : 0
    if (sortBy === 'gain') list.sort((a, b) => gainPct(b) - gainPct(a))
    else if (sortBy === 'loss') list.sort((a, b) => gainPct(a) - gainPct(b))
    else if (sortBy === 'value') list.sort((a, b) => (b.shares * b.current_price) - (a.shares * a.current_price))
    else if (sortBy === 'name') list.sort((a, b) => a.symbol.localeCompare(b.symbol))
    return list
  })()

  if (loading) return <PageSkeleton />

  return (
    <div ref={pageRef} className="animate-fade-in">
      <PullToRefreshIndicator refreshing={refreshing} />
      <PageHeader
        title={lang === 'en' ? 'Portfolio' : 'المحفظة'}
        subtitle={usdToJod && userCurrency !== 'USD' ? `1 USD = ${usdToJod.toFixed(3)} ${userCurrency}` : undefined}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {usdToJod !== null && (
              <button onClick={() => setShowJod(!showJod)} style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {showJod ? '$ USD' : userCurrency}
              </button>
            )}
            <button onClick={refreshPrices} disabled={pricesRefreshing} style={{ padding: '9px 12px', borderRadius: 12, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 16, cursor: pricesRefreshing ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: pricesRefreshing ? 0.5 : 1 }}>
              {pricesRefreshing ? '⏳' : '⟳'}
            </button>
            <button onClick={() => setShowForm(true)} style={{ padding: '9px 16px', borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', color: 'white', fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px var(--accent-blue-glow)' }}>+</button>
          </div>
        }
      />

      {refreshMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 12, fontSize: 13, textAlign: 'center', background: refreshMsg.startsWith('✅') ? 'var(--accent-green-dim)' : 'rgba(245,158,11,0.1)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{refreshMsg}</div>
      )}

      <StatBar stats={[
        { label: lang === 'en' ? 'Value' : 'القيمة', value: showJod && usdToJod ? `${(totalValueUSD * usdToJod).toFixed(0)} ${userCurrency}` : `$${totalValueUSD.toFixed(0)}`, color: 'var(--accent-blue-light)' },
        { label: lang === 'en' ? 'Profit' : 'الربح',  value: showJod && usdToJod ? `${(totalPnL * usdToJod).toFixed(0)} ${userCurrency}` : `${totalPnL >= 0 ? '+$' : '-$'}${Math.abs(totalPnL).toFixed(0)}`, color: totalPnL >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
        { label: lang === 'en' ? 'Return' : 'العائد', value: `${parseFloat(pnlPct) >= 0 ? '+' : ''}${pnlPct}%`, color: parseFloat(pnlPct) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
      ]} />

      {investments.length === 0 ? (
        <EmptyState icon="📈" title="لا توجد استثمارات" subtitle="أضف أول أصل استثماري" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Filter + Sort bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 1 }}>
              {(['all', 'halal', 'crypto', 'stocks'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                  background: filterType === f ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: filterType === f ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${filterType === f ? 'var(--accent-blue)' : 'var(--border)'}`,
                }}>
                  {f === 'all' ? (lang === 'ar' ? 'الكل' : 'All')
                    : f === 'halal' ? (lang === 'ar' ? 'حلال' : 'Halal')
                    : f === 'crypto' ? (lang === 'ar' ? 'كريبتو' : 'Crypto')
                    : (lang === 'ar' ? 'أسهم' : 'Stocks')}
                </button>
              ))}
            </div>
            <select
              aria-label={lang === 'ar' ? 'ترتيب الاستثمارات' : 'Sort investments'}
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={{
              padding: '5px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, flexShrink: 0,
              cursor: 'pointer', fontFamily: 'inherit', background: 'var(--bg-secondary)',
              color: sortBy !== 'none' ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              border: `1px solid ${sortBy !== 'none' ? 'rgba(59,126,246,0.4)' : 'var(--border)'}`,
              outline: 'none',
            }}>
              <option value="none">{lang === 'ar' ? 'ترتيب' : 'Sort'}</option>
              <option value="gain">{lang === 'ar' ? 'الأعلى ربحاً' : 'Top Gainers'}</option>
              <option value="loss">{lang === 'ar' ? 'الأعلى خسارة' : 'Top Losers'}</option>
              <option value="value">{lang === 'ar' ? 'القيمة' : 'Value'}</option>
              <option value="name">{lang === 'ar' ? 'الاسم' : 'Name'}</option>
            </select>
          </div>

          {displayedInvestments.map(inv => {
            const valueUSD = inv.shares * inv.current_price
            const valueLocal = usdToJod ? valueUSD * usdToJod : null
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
                  <div style={{ textAlign: lang === 'ar' ? 'right' : 'left', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {showJod && valueLocal ? `${valueLocal.toFixed(0)} ${userCurrency}` : `$${valueUSD.toFixed(2)}`}
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

                {/* ROI row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, marginBottom: 8, background: isPos ? 'var(--accent-green-dim)' : 'rgba(239,68,68,0.08)', border: `1px solid ${isPos ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                    {lang === 'ar' ? 'التكلفة' : 'Cost'}: ${costUSD.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 900, fontFamily: 'monospace', color: isPos ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                    P&L: {isPos ? '+' : ''}${pnl.toFixed(2)}
                  </span>
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
                        { label: lang === 'en' ? 'Price $' : 'السعر $', key: 'price', placeholder: '50', type: 'number' },
                        { label: lang === 'en' ? 'Commission $' : 'العمولة $', key: 'commission', placeholder: '0.5', type: 'number' },
                        { label: lang === 'en' ? 'Date' : 'التاريخ', key: 'date', placeholder: '', type: 'date' },
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
                  <button onClick={() => { setShowBuyForm(inv.id); setShowSellForm(null) }} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'var(--accent-green-dim)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-green-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? '+ Record Buy' : '+ تسجيل شراء'}</button>
                )}

                {showSellForm === inv.id ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      {[
                        { label: lang === 'en' ? 'Units to sell' : 'الوحدات للبيع', key: 'shares', placeholder: '0.5', type: 'number' },
                        { label: lang === 'en' ? 'Sale Price $' : 'سعر البيع $', key: 'price', placeholder: '50', type: 'number' },
                        { label: lang === 'en' ? 'Commission $' : 'العمولة $', key: 'commission', placeholder: '0.5', type: 'number' },
                        { label: lang === 'en' ? 'Date' : 'التاريخ', key: 'date', placeholder: '', type: 'date' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                          <input type={f.type} value={(sellForm as any)[f.key]} onChange={e => setSellForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                            style={{ width: '100%', padding: '9px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {lang === 'en' ? `Max: ${inv.shares.toFixed(4)} units` : `الحد الأقصى: ${inv.shares.toFixed(4)} وحدة`}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openSellConfirm(inv)} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.5 : 1 }}>
                        {lang === 'en' ? 'Review Sale' : 'مراجعة البيع'}
                      </button>
                      <button onClick={() => setShowSellForm(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setShowSellForm(inv.id); setShowBuyForm(null) }} style={{ width: '100%', padding: '11px', borderRadius: 10, marginTop: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? '- Record Sell' : '- تسجيل بيع'}</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={lang === 'en' ? 'Add New Asset' : 'إضافة أصل جديد'} onClose={() => setShowForm(false)}>
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
            <input
              type="checkbox"
              aria-label={lang === 'en' ? 'Mark investment as halal' : 'تحديد الاستثمار كحلال'}
              checked={form.is_halal}
              onChange={e => setForm(f => ({ ...f, is_halal: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-green)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{lang === 'en' ? '✅ Halal Investment' : '✅ استثمار حلال'}</span>
          </div>
          <SaveButton label={lang === 'en' ? 'Add Asset' : 'إضافة الأصل'} loading={saving} onClick={addInvestment} />
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
                    <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-secondary)', minWidth: 55, textAlign: lang === 'ar' ? 'right' : 'left' }}>${val.toFixed(0)}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
              <div className="skeleton" style={{ height: 62, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 62, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 62, borderRadius: 12 }} />
            </div>
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
                  <div style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
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


      {/* ── كاش المحفظة الاستثمارية ── */}
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${cashBalance > 0 ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 20, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cashBalance > 0 ? 12 : 0 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>💵 {lang === 'en' ? 'Portfolio Cash' : 'كاش المحفظة'}</span>
          {cashBalance > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, background: 'var(--accent-green-dim)', color: 'var(--accent-green-light)' }}>{cashCurrency}</span>}
        </div>
        {cashBalance <= 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{lang === 'en' ? 'No cash yet — will appear after selling investments' : 'لا يوجد كاش بعد — سيظهر هنا بعد بيع استثماراتك'}</div>
        ) : (
          <>
            <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--accent-green-light)', fontFamily: 'monospace', marginBottom: 12 }}>{cashBalance.toFixed(2)} {cashCurrency}</div>
            <button onClick={openTransferModal} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.2)', color: 'var(--accent-blue-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {lang === 'en' ? '→ Transfer to Main Wallet' : '→ نقل للمحفظة الرئيسية'}
            </button>
          </>
        )}
      </div>

      {/* مودال تأكيد البيع */}
      {sellConfirm && (
        <Modal title={lang === 'en' ? 'Confirm Sale' : 'تأكيد البيع'} onClose={() => setSellConfirm(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {[
              { label: lang === 'en' ? 'Avg. Buy Price' : 'متوسط سعر الشراء', value: `$${sellConfirm.inv.avg_buy_price.toFixed(2)}`, color: 'var(--text-muted)' },
              { label: lang === 'en' ? 'Sale Price' : 'سعر البيع', value: `$${sellConfirm.price.toFixed(2)}`, color: 'var(--text-muted)' },
              { label: lang === 'en' ? 'Net Proceeds' : 'العائد الصافي', value: `$${sellConfirm.proceeds.toFixed(2)}`, color: 'var(--text-primary)' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 900, fontFamily: 'monospace', color: r.color }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: 10, background: sellConfirm.realizedPnl >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${sellConfirm.realizedPnl >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{sellConfirm.realizedPnl >= 0 ? (lang === 'en' ? 'Realized Gain' : 'الربح المحقق') : (lang === 'en' ? 'Realized Loss' : 'الخسارة المحققة')}</span>
              <span style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: sellConfirm.realizedPnl >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' }}>
                {sellConfirm.realizedPnl >= 0 ? '+' : ''}${sellConfirm.realizedPnl.toFixed(2)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirmSell} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#EF4444', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: 'inherit', opacity: saving ? 0.5 : 1 }}>
              {saving ? '⏳' : (lang === 'en' ? 'Confirm Sale' : 'تأكيد البيع')}
            </button>
            <button onClick={() => setSellConfirm(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
          </div>
        </Modal>
      )}

      {/* مودال التحويل للمحفظة الرئيسية */}
      {showTransferModal && (
        <Modal title={lang === 'en' ? 'Transfer to Main Wallet' : 'نقل للمحفظة الرئيسية'} onClose={() => setShowTransferModal(false)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              {lang === 'en' ? `Available: ${cashBalance.toFixed(2)} ${cashCurrency}` : `المتاح: ${cashBalance.toFixed(2)} ${cashCurrency}`}
            </div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>{lang === 'en' ? `Amount (${cashCurrency})` : `المبلغ (${cashCurrency})`}</label>
            <input type="number" value={transferAmount}
              aria-label={lang === 'en' ? 'Transfer amount' : 'مبلغ التحويل'}
              placeholder={lang === 'en' ? 'Enter amount' : 'ادخل المبلغ'}
              onChange={e => setTransferAmount(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 18, fontWeight: 900, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
            {cashCurrency !== userCurrency && (
              <div style={{ marginTop: 12, padding: '12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {loadingRate ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>⏳ {lang === 'en' ? 'Fetching live rate...' : 'جاري جلب سعر الصرف...'}</div>
                ) : transferRate ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Exchange Rate' : 'سعر الصرف'}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>1 {cashCurrency} = {transferRate.toFixed(4)} {userCurrency}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'en' ? "You'll receive" : 'ستستلم'}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: 'var(--accent-green-light)' }}>{((parseFloat(transferAmount) || 0) * transferRate).toFixed(2)} {userCurrency}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--accent-red-light)', fontSize: 12 }}>❌ {lang === 'en' ? 'Could not fetch rate' : 'تعذر جلب سعر الصرف'}</div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirmTransfer} disabled={saving || loadingRate} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--accent-blue)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', border: 'none', fontFamily: 'inherit', opacity: (saving || loadingRate) ? 0.5 : 1 }}>
              {saving ? '⏳' : (lang === 'en' ? 'Confirm Transfer' : 'تأكيد النقل')}
            </button>
            <button onClick={() => setShowTransferModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
          </div>
        </Modal>
      )}

      {/* ── محاكي الثروة ── */}
      <WealthSimulator lang={lang} currency={userCurrency} />
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
          <FormField label={lang === 'en' ? 'Purchase Date' : 'تاريخ الشراء'}>
            <Input type="date" value={editForm.purchase_date} max={new Date().toISOString().split('T')[0]} onChange={e => setEditForm(f => ({ ...f, purchase_date: e.target.value }))} />
          </FormField>
          <FormField label={lang === 'en' ? 'Notes' : 'ملاحظات'}><Input placeholder={lang === "en" ? "Optional" : "اختياري"} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></FormField>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 14 }}>
            <input
              type="checkbox"
              aria-label={lang === 'en' ? 'Mark edited investment as halal' : 'تحديد الاستثمار المعدل كحلال'}
              checked={editForm.is_halal}
              onChange={e => setEditForm(f => ({ ...f, is_halal: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent-green)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>✅ {lang === 'en' ? 'Halal' : 'حلال'}</span>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: 12, marginBottom: 14 }}>
            ⚠️ {lang === 'en' ? 'Editing units and prices affects P&L calculations' : 'تعديل الوحدات والأسعار يؤثر على حسابات الربح والخسارة'}
          </div>
          <SaveButton label={lang === 'en' ? 'Save Changes' : 'حفظ التعديلات'} loading={saving} onClick={saveEditInv} />
          <button onClick={() => { if (confirm(lang === 'en' ? 'Delete this investment?' : 'حذف هذا الاستثمار؟')) { deleteInv(editingInv.id); setEditingInv(null) } }} style={{ width: '100%', padding: '12px', borderRadius: 10, marginTop: 8, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🗑️ {lang === 'en' ? 'Delete Investment' : 'حذف الاستثمار'}
          </button>
        </Modal>
      )}
    </div>
  )
}
