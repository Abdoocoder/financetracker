'use client'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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

function WealthSimulator({ currency }: { currency: string }) {
  const { t, lang } = useI18n()
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
    <div className="my-5 bg-[var(--bg-card)] rounded-[20px] p-5 border border-[rgba(59,126,246,0.2)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="text-[15px] font-black text-[var(--text-primary)]">
            📈 {t('inv_sim_title')}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {t('inv_sim_subtitle')}
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-gradient-to-br from-[var(--accent-blue-dim)] to-[rgba(16,185,129,0.1)] border border-[rgba(59,126,246,0.2)] text-[11px] font-extrabold text-[var(--accent-blue-light)]">
          {t('inv_sim_return').replace('{}', multiplier.toFixed(1))}
        </div>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-4 mb-5">

        {/* الاستثمار الشهري */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {t('inv_sim_monthly')}
            </span>
            <span className="text-sm font-black text-[var(--accent-blue-light)] font-mono">
              {monthly} {currency}
            </span>
          </div>
          <input type="range" min={10} max={1000} step={10} value={monthly}
            aria-label={t('inv_sim_monthly')}
            onChange={e => setMonthly(Number(e.target.value))}
            className="w-full accent-[var(--accent-blue)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>10 {currency}</span><span>1,000 {currency}</span>
          </div>
        </div>

        {/* عدد السنوات */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {t('inv_sim_duration')}
            </span>
            <span className="text-sm font-black text-[var(--accent-blue-light)] font-mono">
              {years} {t('inv_sim_years')}
            </span>
          </div>
          <input type="range" min={1} max={30} step={1} value={years}
            aria-label={t('inv_sim_duration')}
            onChange={e => setYears(Number(e.target.value))}
            className="w-full accent-[var(--accent-blue)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>1 {t('inv_sim_years')}</span><span>30 {t('inv_sim_years')}</span>
          </div>
        </div>

        {/* معدل العائد */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {t('inv_sim_rate')}
            </span>
            <span className="text-sm font-black text-[var(--accent-green-light)] font-mono">
              {rate}%
            </span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={rate}
            aria-label={t('inv_sim_rate')}
            onChange={e => setRate(Number(e.target.value))}
            className="w-full accent-[var(--accent-green)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>1%</span>
            <span className="text-[#F59E0B]">7% S&P500</span>
            <span>20%</span>
          </div>
        </div>
      </div>

      {/* النتيجة الرئيسية */}
      <div className="bg-gradient-to-br from-[rgba(59,126,246,0.1)] to-[rgba(16,185,129,0.08)] border border-[rgba(59,126,246,0.2)] rounded-2xl p-5 mb-4 text-center">
        <div className="text-xs text-[var(--text-muted)] mb-1.5">
          {t('inv_sim_after_years').replace('{}', years.toString())}
        </div>
        <div className="text-[36px] font-black font-mono bg-gradient-to-br from-[var(--accent-blue-light)] to-[var(--accent-green-light)] bg-clip-text text-transparent">
          {future >= 1000000
            ? (future / 1000000).toFixed(2) + 'M'
            : future >= 1000
            ? (future / 1000).toFixed(1) + 'K'
            : future.toFixed(0)
          } {currency}
        </div>
        <div className="flex justify-center gap-5 mt-3">
          <div className="text-center">
            <div className="text-[11px] text-[var(--text-muted)]">{t('inv_sim_invested')}</div>
            <div className="text-[13px] font-extrabold text-[var(--text-secondary)] font-mono">
              {(invested/1000).toFixed(1)}K {currency}
            </div>
          </div>
          <div className="w-px bg-[var(--border)]" />
          <div className="text-center">
            <div className="text-[11px] text-[var(--text-muted)]">{t('inv_sim_profit')}</div>
            <div className="text-[13px] font-extrabold text-[var(--accent-green-light)] font-mono">
              +{profit >= 1000 ? (profit/1000).toFixed(1) + 'K' : profit.toFixed(0)} {currency}
            </div>
          </div>
          <div className="w-px bg-[var(--border)]" />
          <div className="text-center">
            <div className="text-[11px] text-[var(--text-muted)]">{t('inv_sim_multiplier')}</div>
            <div className="text-[13px] font-extrabold text-[var(--accent-blue-light)] font-mono">
              {multiplier.toFixed(1)}x
            </div>
          </div>
        </div>
      </div>

      {/* جدول المعالم */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-bold cursor-pointer font-[inherit]"
      >
        {showDetails ? t('inv_sim_hide') : t('inv_sim_show')}
      </button>

      {showDetails && (
        <div className="mt-3 flex flex-col gap-1.5">
          {milestones.map(y => {
            const val = calc(monthly, y, rate)
            const inv = monthly * y * 12
            const pct = ((val - inv) / inv * 100)
            return (
              <div key={y} className={`flex justify-between items-center px-3.5 py-2.5 rounded-[10px] border ${y === years ? 'bg-[var(--accent-blue-dim)] border-[rgba(59,126,246,0.2)]' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
                <span className={`text-xs font-bold ${y === years ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-muted)]'}`}>
                  {t('inv_sim_after_y').replace('{}', y.toString())}
                </span>
                <div className={`text-${lang === 'ar' ? 'right' : 'left'}`}>
                  <div className={`text-[13px] font-black font-mono ${y === years ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-primary)]'}`}>
                    {val >= 1000 ? (val/1000).toFixed(1) + 'K' : val.toFixed(0)} {currency}
                  </div>
                  <div className="text-[10px] text-[var(--accent-green-light)]">+{pct.toFixed(0)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* تلميح */}
      <div className="mt-3 text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
        💡 {t('inv_sim_disclaimer')}
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
  const [confirmDeleteInvId, setConfirmDeleteInvId] = useState<string | null>(null)
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
        title={t('inv_title')}
        subtitle={usdToJod && userCurrency !== 'USD' ? `1 USD = ${usdToJod.toFixed(3)} ${userCurrency}` : undefined}
        action={
          <div className="flex gap-2">
            {usdToJod !== null && (
              <button
                type="button"
                onClick={() => setShowJod(!showJod)}
                className="px-3 py-2.5 rounded-xl bg-[var(--accent-blue-dim)] border border-[rgba(59,126,246,0.2)] text-[var(--accent-blue-light)] text-xs font-bold cursor-pointer font-[inherit]"
              >
                {showJod ? '$ USD' : userCurrency}
              </button>
            )}
            <button
              type="button"
              onClick={refreshPrices}
              disabled={pricesRefreshing}
              className={`px-3 py-2.5 rounded-xl bg-[var(--accent-green-dim)] border border-[rgba(16,185,129,0.2)] text-[var(--accent-green-light)] text-base font-[inherit] ${pricesRefreshing ? 'cursor-wait opacity-50' : 'cursor-pointer'}`}
            >
              {pricesRefreshing ? '⏳' : '⟳'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] text-white text-lg font-black border-none cursor-pointer font-[inherit] shadow-[0_4px_16px_var(--accent-blue-glow)]"
            >+</button>
          </div>
        }
      />

      {refreshMsg && (
        <div className={`px-4 py-3 rounded-xl mb-3 text-[13px] text-center text-[var(--text-primary)] border border-[var(--border)] ${refreshMsg.startsWith('✅') ? 'bg-[var(--accent-green-dim)]' : 'bg-[rgba(245,158,11,0.1)]'}`}>
          {refreshMsg}
        </div>
      )}

      <StatBar stats={[
        { label: t('inv_sort_value'), value: showJod && usdToJod ? `${(totalValueUSD * usdToJod).toFixed(0)} ${userCurrency}` : `$${totalValueUSD.toFixed(0)}`, color: 'var(--accent-blue-light)' },
        { label: t('inv_profit'),  value: showJod && usdToJod ? `${(totalPnL * usdToJod).toFixed(0)} ${userCurrency}` : `${totalPnL >= 0 ? '+$' : '-$'}${Math.abs(totalPnL).toFixed(0)}`, color: totalPnL >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
        { label: t('inv_roi_label'), value: `${parseFloat(pnlPct) >= 0 ? '+' : ''}${pnlPct}%`, color: parseFloat(pnlPct) >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)' },
      ]} />

      {investments.length === 0 ? (
        <EmptyState icon="📈" title={t('inv_empty')} subtitle={t('inv_add_first')} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Filter + Sort bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto shrink">
              {(['all', 'halal', 'crypto', 'stocks'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-[5px] rounded-full text-[11px] font-bold cursor-pointer font-[inherit] whitespace-nowrap shrink-0 border ${filterType === f ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]'}`}
                >
                  {f === 'all' ? t('inv_filter_all')
                    : f === 'halal' ? t('inv_filter_halal')
                    : f === 'crypto' ? t('inv_filter_crypto')
                    : t('inv_filter_stocks')}
                </button>
              ))}
            </div>
            <select
              aria-label={t('inv_sort_by')}
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className={`px-2.5 py-[5px] rounded-[10px] text-[11px] font-bold shrink-0 cursor-pointer font-[inherit] bg-[var(--bg-secondary)] outline-none border ${sortBy !== 'none' ? 'text-[var(--accent-blue-light)] border-[rgba(59,126,246,0.4)]' : 'text-[var(--text-muted)] border-[var(--border)]'}`}
            >
              <option value="none">{t('inv_sort_by')}</option>
              <option value="gain">{t('inv_sort_gain')}</option>
              <option value="loss">{t('inv_sort_loss')}</option>
              <option value="value">{t('inv_sort_value')}</option>
              <option value="name">{t('inv_sort_name')}</option>
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
            const typeCls: Record<string,string> = {
              etf:    'bg-[rgba(59,126,246,0.09)]  border-[rgba(59,126,246,0.19)]  text-[#3B7EF6]',
              stock:  'bg-[rgba(16,185,129,0.09)]  border-[rgba(16,185,129,0.19)]  text-[#10B981]',
              crypto: 'bg-[rgba(245,158,11,0.09)]  border-[rgba(245,158,11,0.19)]  text-[#F59E0B]',
              other:  'bg-[rgba(139,156,200,0.09)] border-[rgba(139,156,200,0.19)] text-[#8B9CC8]',
            }
            const typeClass = typeCls[inv.type] ?? typeCls.etf
            return (
              <div key={inv.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-4">
                <div className="flex items-center gap-3 mb-3.5">
                  <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-[11px] font-black font-mono tracking-[-0.03em] border ${typeClass}`}>
                    {inv.symbol.slice(0, 4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-sm font-black text-[var(--text-primary)]">{inv.symbol}</span>
                      {inv.is_halal && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-green-dim)] text-[var(--accent-green-light)] font-bold">{t('inv_halal').replace(' ✅', '')}</span>}
                      {isLive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-blue-dim)] text-[var(--accent-blue-light)] font-bold">LIVE</span>}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">{inv.name}</div>
                  </div>
                  <div className={`shrink-0 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className="text-[15px] font-black text-[var(--text-primary)] font-mono">
                      {showJod && valueLocal ? `${valueLocal.toFixed(0)} ${userCurrency}` : `$${valueUSD.toFixed(2)}`}
                    </div>
                    <div className={`text-xs font-bold font-mono ${isPos ? 'text-[var(--accent-green-light)]' : 'text-[var(--accent-red-light)]'}`}>
                      {isPos ? '+' : ''}{pnlP}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditInv(inv)}
                    className="w-8 h-8 rounded-[9px] shrink-0 bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B] text-[13px] cursor-pointer flex items-center justify-center"
                    aria-label={t('inv_edit_title')}
                  >✎</button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: t('inv_shares'), value: inv.shares.toFixed(5) },
                    { label: t('inv_avg_price'), value: `$${inv.avg_buy_price.toFixed(2)}` },
                    { label: t('inv_current_price'), value: `$${inv.current_price.toFixed(2)}` },
                  ].map((s, i) => (
                    <div key={i} className="text-center px-1 py-2 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border)]">
                      <div className="text-[11px] font-black text-[var(--text-primary)] font-mono">{s.value}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-0.5 font-semibold">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ROI row */}
                <div className={`flex justify-between px-3 py-2 rounded-[10px] mb-2 border ${isPos ? 'bg-[var(--accent-green-dim)] border-[rgba(16,185,129,0.2)]' : 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)]'}`}>
                  <span className="text-[11px] text-[var(--text-muted)] font-bold">
                    {t('inv_cost')}: ${costUSD.toFixed(2)}
                  </span>
                  <span className={`text-[11px] font-black font-mono ${isPos ? 'text-[var(--accent-green-light)]' : 'text-[var(--accent-red-light)]'}`}>
                    P&L: {isPos ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => loadTxHistory(inv.id)}
                  className="w-full py-2.5 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-bold cursor-pointer font-[inherit] mb-2"
                >
                  {t('inv_tx_history')}
                </button>

                {showBuyForm === inv.id ? (
                  <div>
                    <div className="grid grid-cols-2 gap-2 mb-2.5">
                      {[
                        { label: t('inv_shares'), key: 'shares', placeholder: '0.5', type: 'number' },
                        { label: t('inv_price_with_dollar_hint'), key: 'price', placeholder: '50', type: 'number' },
                        { label: t('inv_comm_hint'), key: 'commission', placeholder: '0.5', type: 'number' },
                        { label: t('inv_purchase_date'), key: 'date', placeholder: '', type: 'date' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-[5px] uppercase">{f.label}</label>
                          <input type={f.type} value={(buyForm as any)[f.key]} onChange={e => setBuyForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                            className="w-full px-2.5 py-[9px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-[inherit] outline-none box-border" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => recordBuy(inv.id)} disabled={saving} className={`flex-1 py-[11px] rounded-[10px] bg-[var(--accent-green)] text-white text-[13px] font-extrabold cursor-pointer border-none font-[inherit] ${saving ? 'opacity-50' : ''}`}>{saving ? '⏳' : t('inv_submit_btn')}</button>
                      <button type="button" onClick={() => setShowBuyForm(null)} className="flex-1 py-[11px] rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-[13px] cursor-pointer font-[inherit]">{t('inv_cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setShowBuyForm(inv.id); setShowSellForm(null) }} className="w-full py-[11px] rounded-[10px] bg-[var(--accent-green-dim)] border border-[rgba(16,185,129,0.2)] text-[var(--accent-green-light)] text-[13px] font-bold cursor-pointer font-[inherit]">{t('inv_record_buy')}</button>
                )}

                {showSellForm === inv.id ? (
                  <div className="mt-2">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {[
                        { label: t('inv_shares'), key: 'shares', placeholder: '0.5', type: 'number' },
                        { label: t('inv_price_with_dollar_hint'), key: 'price', placeholder: '50', type: 'number' },
                        { label: t('inv_comm_hint'), key: 'commission', placeholder: '0.5', type: 'number' },
                        { label: t('inv_purchase_date'), key: 'date', placeholder: '', type: 'date' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-[5px] uppercase">{f.label}</label>
                          <input type={f.type} value={(sellForm as any)[f.key]} onChange={e => setSellForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                            className="w-full px-2.5 py-[9px] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-[inherit] outline-none box-border" />
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mb-2">
                      {t('inv_sell_max_shares')}: {inv.shares.toFixed(4)} {t('inv_unit')}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openSellConfirm(inv)} disabled={saving} className={`flex-1 py-[11px] rounded-[10px] bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] text-[13px] font-extrabold cursor-pointer font-[inherit] ${saving ? 'opacity-50' : ''}`}>
                        {t('inv_sell_confirm_btn')}
                      </button>
                      <button type="button" onClick={() => setShowSellForm(null)} className="flex-1 py-[11px] rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-[13px] cursor-pointer font-[inherit]">{t('inv_cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setShowSellForm(inv.id); setShowBuyForm(null) }} className="w-full py-[11px] rounded-[10px] mt-2 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] text-[13px] font-bold cursor-pointer font-[inherit]">{t('inv_record_sell')}</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <Modal title={t('inv_new')} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label={t('inv_symbol')}><Input placeholder="SPUS" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} /></FormField>
            <FormField label={t('inv_name')}><Input placeholder="SP Funds ETF" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
          </div>
          <FormField label={t('inv_type_label')}>
            <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="etf">ETF</option>
              <option value="stock">{t('inv_filter_stocks')}</option>
              <option value="crypto">{t('inv_filter_crypto')}</option>
              <option value="other">{t('inv_type_other')}</option>
            </Select>
          </FormField>
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] bg-[var(--bg-card)] border border-[var(--border)] mb-3.5">
            <input
              type="checkbox"
              aria-label={t('inv_mark_halal')}
              checked={form.is_halal}
              onChange={e => setForm(f => ({ ...f, is_halal: e.target.checked }))}
              className="w-4 h-4 accent-[var(--accent-green)]"
            />
            <span className="text-[13px] text-[var(--text-secondary)] font-semibold">{t('inv_halal_asset')}</span>
          </div>
          <SaveButton label={t('inv_save')} loading={saving} onClick={addInvestment} />
        </Modal>
      )}

      {/* رسم بياني */}
      {investments.length > 0 && (() => {
        const total = investments.reduce((a,i) => a + i.shares * i.current_price, 0)
        const colorClasses = [
          'bg-[#3B7EF6]','bg-[#10B981]','bg-[#F59E0B]',
          'bg-[#8B5CF6]','bg-[#EF4444]','bg-[#EC4899]',
        ]
        return total > 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-4">
            <div className="text-[13px] font-black text-[var(--text-primary)] mb-3.5">{t('inv_portfolio_chart')}</div>
            <div className="flex h-[10px] rounded-lg overflow-hidden gap-0.5 mb-3.5">
              <style>{investments.map((inv, i) => {
                const pct = total > 0 ? (inv.shares * inv.current_price / total) * 100 : 0
                return `.cb-${inv.id.replace(/-/g,'')}{width:${pct.toFixed(2)}%}`
              }).join('')}</style>
              {investments.map((inv, i) => {
                const pct = total > 0 ? (inv.shares * inv.current_price / total) * 100 : 0
                return pct > 0 ? <div key={inv.id} className={`h-full rounded-[4px] ${colorClasses[i % colorClasses.length]} cb-${inv.id.replace(/-/g,'')}`} /> : null
              })}
            </div>
            <div className="flex flex-col gap-2">
              {investments.map((inv, i) => {
                const val = inv.shares * inv.current_price
                const pct = total > 0 ? (val / total * 100).toFixed(1) : '0'
                const pnl = val - (inv.shares * inv.avg_buy_price)
                return (
                  <div key={inv.id} className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${colorClasses[i % colorClasses.length]}`} />
                    <span className="text-[13px] font-bold text-[var(--text-primary)] flex-1">{inv.symbol}</span>
                    <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
                    <span className={`text-xs font-bold font-mono ${pnl >= 0 ? 'text-[var(--accent-green-light)]' : 'text-[var(--accent-red-light)]'}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}</span>
                    <span className={`text-xs font-black font-mono text-[var(--text-secondary)] min-w-[55px] ${lang === 'ar' ? 'text-right' : 'text-left'}`}>${val.toFixed(0)}</span>
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
            <div className="flex flex-col gap-2 p-1">
              <div className="skeleton h-[62px] rounded-xl" />
              <div className="skeleton h-[62px] rounded-xl" />
              <div className="skeleton h-[62px] rounded-xl" />
            </div>
          ) : txHistory.length === 0 ? (
            <div className="text-center p-6 text-[var(--text-muted)]">{t('inv_empty_tx')}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {txHistory.map(tx => (
                <div key={tx.id} className="px-3.5 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-base shrink-0 ${tx.type === 'buy' ? 'bg-[var(--accent-green-dim)]' : 'bg-[var(--accent-red-dim)]'}`}>
                    {tx.type === 'buy' ? '📈' : '📉'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-[var(--text-primary)]">{tx.type === 'buy' ? t('inv_buy') : t('inv_sell')} {Number(tx.shares).toFixed(4)} {t('inv_unit')}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{tx.transaction_date} · سعر ${Number(tx.price).toFixed(2)}</div>
                  </div>
                  <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <div className={`text-[13px] font-black font-mono ${tx.type === 'buy' ? 'text-[var(--accent-red-light)]' : 'text-[var(--accent-green-light)]'}`}>
                      {tx.type === 'buy' ? '-' : '+'}${(Number(tx.shares) * Number(tx.price)).toFixed(0)}
                    </div>
                    {Number(tx.commission) > 0 && <div className="text-[10px] text-[var(--text-muted)]">عمولة ${Number(tx.commission).toFixed(2)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}


      {/* ── كاش المحفظة الاستثمارية ── */}
      <div className={`bg-[var(--bg-card)] rounded-[20px] p-4 mb-4 border ${cashBalance > 0 ? 'border-[rgba(16,185,129,0.3)]' : 'border-[var(--border)]'}`}>
        <div className={`flex items-center justify-between ${cashBalance > 0 ? 'mb-3' : ''}`}>
          <span className="text-[15px] font-black text-[var(--text-primary)]">💵 {t('inv_cash_title').replace('💵 ', '')}</span>
          {cashBalance > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[var(--accent-green-dim)] text-[var(--accent-green-light)]">{cashCurrency}</span>}
        </div>
        {cashBalance <= 0 ? (
          <div className="text-xs text-[var(--text-muted)] mt-2">{t('inv_cash_empty')}</div>
        ) : (
          <>
            <div className="text-[30px] font-black text-[var(--accent-green-light)] font-mono mb-3">{cashBalance.toFixed(2)} {cashCurrency}</div>
            <button
              type="button"
              onClick={openTransferModal}
              className="w-full py-[11px] rounded-[10px] bg-[var(--accent-blue-dim)] border border-[rgba(59,126,246,0.2)] text-[var(--accent-blue-light)] text-[13px] font-bold cursor-pointer font-[inherit]"
            >
              → {t('inv_cash_transfer_btn')}
            </button>
          </>
        )}
      </div>

      {/* مودال تأكيد البيع */}
      {sellConfirm && (
        <Modal title={t('inv_sell_confirm_btn')} onClose={() => setSellConfirm(null)}>
          <div className="flex flex-col gap-2.5 mb-4">
            {[
              { label: t('inv_sell_avg_buy'), value: `$${sellConfirm.inv.avg_buy_price.toFixed(2)}`, cls: 'text-[var(--text-muted)]' },
              { label: t('inv_sale_price'), value: `$${sellConfirm.price.toFixed(2)}`, cls: 'text-[var(--text-muted)]' },
              { label: t('inv_sell_proceeds'), value: `$${sellConfirm.proceeds.toFixed(2)}`, cls: 'text-[var(--text-primary)]' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <span className="text-[13px] text-[var(--text-muted)]">{r.label}</span>
                <span className={`text-[13px] font-black font-mono ${r.cls}`}>{r.value}</span>
              </div>
            ))}
            <div className={`flex justify-between p-3 rounded-[10px] border ${sellConfirm.realizedPnl >= 0 ? 'bg-[var(--accent-green-dim)] border-[rgba(16,185,129,0.3)]' : 'bg-[var(--accent-red-dim)] border-[rgba(239,68,68,0.3)]'}`}>
              <span className="text-sm font-bold text-[var(--text-primary)]">{sellConfirm.realizedPnl >= 0 ? t('inv_sell_realized_gain') : t('inv_sell_realized_loss')}</span>
              <span className={`text-base font-black font-mono ${sellConfirm.realizedPnl >= 0 ? 'text-[var(--accent-green-light)]' : 'text-[var(--accent-red-light)]'}`}>
                {sellConfirm.realizedPnl >= 0 ? '+' : ''}${sellConfirm.realizedPnl.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={confirmSell} disabled={saving} className={`flex-1 py-3 rounded-[10px] bg-[#EF4444] text-white text-[13px] font-extrabold cursor-pointer border-none font-[inherit] ${saving ? 'opacity-50' : ''}`}>
              {saving ? '⏳' : t('inv_sell_confirm_btn')}
            </button>
            <button type="button" onClick={() => setSellConfirm(null)} className="flex-1 py-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-[13px] cursor-pointer font-[inherit]">{t('inv_cancel')}</button>
          </div>
        </Modal>
      )}

      {/* مودال التحويل للمحفظة الرئيسية */}
      {showTransferModal && (
        <Modal title={t('inv_cash_transfer_title')} onClose={() => setShowTransferModal(false)}>
          <div className="mb-4">
            <div className="text-xs text-[var(--text-muted)] mb-3">
              {t('inv_available')}: {cashBalance.toFixed(2)} {cashCurrency}
            </div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase">{t('inv_cash_transfer_amount_hint')}</label>
            <input type="number" value={transferAmount}
              aria-label={t('inv_cash_transfer_amount_hint')}
              placeholder={t('inv_cash_transfer_amount')}
              onChange={e => setTransferAmount(e.target.value)}
              className="w-full p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-lg font-black font-mono outline-none box-border text-center"
            />
            {cashCurrency !== userCurrency && (
              <div className="mt-3 p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)]">
                {loadingRate ? (
                  <div className="text-center text-[var(--text-muted)] text-xs">⏳ {t('inv_fetching_rate')}</div>
                ) : transferRate ? (
                  <>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-[var(--text-muted)]">{t('inv_exchange_rate')}</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">1 {cashCurrency} = {transferRate.toFixed(4)} {userCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[var(--text-muted)]">{t('inv_receive_amount')}</span>
                      <span className="text-sm font-black font-mono text-[var(--accent-green-light)]">{((parseFloat(transferAmount) || 0) * transferRate).toFixed(2)} {userCurrency}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[var(--accent-red-light)] text-xs">❌ {t('inv_fetch_rate_err')}</div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={confirmTransfer} disabled={saving || loadingRate} className={`flex-1 py-3 rounded-[10px] bg-[var(--accent-blue)] text-white text-[13px] font-extrabold cursor-pointer border-none font-[inherit] ${(saving || loadingRate) ? 'opacity-50' : ''}`}>
              {saving ? '⏳' : t('inv_cash_transfer_confirm')}
            </button>
            <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] text-[13px] cursor-pointer font-[inherit]">{t('inv_cancel')}</button>
          </div>
        </Modal>
      )}

      {/* ── محاكي الثروة ── */}
      <WealthSimulator currency={userCurrency} />
      {editingInv && (
        <Modal title={`${t('inv_edit_title')} ${editingInv.symbol}`} onClose={() => setEditingInv(null)}>
          <div className="grid grid-cols-2 gap-2.5">
            <FormField label={t('inv_symbol')}><Input value={editForm.symbol} onChange={e => setEditForm(f => ({ ...f, symbol: e.target.value }))} /></FormField>
            <FormField label={t('inv_name')}><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label={t('inv_shares')}><Input type="number" value={editForm.shares} onChange={e => setEditForm(f => ({ ...f, shares: e.target.value }))} /></FormField>
            <FormField label={t('inv_avg_price')}><Input type="number" value={editForm.avg_buy_price} onChange={e => setEditForm(f => ({ ...f, avg_buy_price: e.target.value }))} /></FormField>
            <FormField label={t('inv_current_price')}><Input type="number" value={editForm.current_price} onChange={e => setEditForm(f => ({ ...f, current_price: e.target.value }))} /></FormField>
            <FormField label={t('inv_type_label')}>
              <Select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                <option value="etf">ETF</option><option value="stock">{t('inv_filter_stocks')}</option><option value="crypto">{t('inv_filter_crypto')}</option><option value="other">{t('inv_type_other')}</option>
              </Select>
            </FormField>
          </div>
          <FormField label={t('inv_purchase_date')}>
            <Input type="date" value={editForm.purchase_date} max={new Date().toISOString().split('T')[0]} onChange={e => setEditForm(f => ({ ...f, purchase_date: e.target.value }))} />
          </FormField>
          <FormField label={t('inv_notes')}><Input placeholder={t('inv_optional')} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></FormField>
          <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] bg-[var(--bg-card)] border border-[var(--border)] mb-3.5">
            <input
              type="checkbox"
              aria-label={t('inv_mark_halal')}
              checked={editForm.is_halal}
              onChange={e => setEditForm(f => ({ ...f, is_halal: e.target.checked }))}
              className="w-4 h-4 accent-[var(--accent-green)]"
            />
            <span className="text-[13px] text-[var(--text-secondary)] font-semibold">{t('inv_halal_asset')}</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-[10px] bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B] text-xs mb-3.5">
            ⚠️ {t('inv_edit_warning')}
          </div>
          <SaveButton label={t('inv_save')} loading={saving} onClick={saveEditInv} />
          <button
            type="button"
            onClick={() => setConfirmDeleteInvId(editingInv.id)}
            className="w-full py-3 rounded-[10px] mt-2 bg-[var(--accent-red-dim)] border border-[rgba(239,68,68,0.2)] text-[var(--accent-red-light)] text-[13px] font-bold cursor-pointer font-[inherit]"
          >
            🗑️ {t('inv_delete_btn').replace('🗑️ ', '')}
          </button>
        </Modal>
      )}

      {confirmDeleteInvId && (
        <ConfirmDialog
          title={t('confirm')}
          message={t('inv_delete_confirm')}
          confirmLabel={t('inv_delete_btn')}
          cancelLabel={t('cancel')}
          onConfirm={() => {
            deleteInv(confirmDeleteInvId)
            setConfirmDeleteInvId(null)
            setEditingInv(null)
          }}
          onCancel={() => setConfirmDeleteInvId(null)}
          danger
        />
      )}
    </div>
  )
}
