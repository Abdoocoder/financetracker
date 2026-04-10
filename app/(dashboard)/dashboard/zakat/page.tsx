'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { fetchExchangeRate } from '@/lib/currency'
import type { Investment, ZakatHistory } from '@/types'

const HAUL_DAYS = 354 // حول هجري
const TROY_OZ_TO_GRAM = 31.1035

function haulStart(inv: Investment): Date {
  if (inv.purchase_date) return new Date(inv.purchase_date)
  return new Date(inv.created_at)
}

function haulDaysLeft(inv: Investment): number {
  const haulDate = new Date(haulStart(inv).getTime() + HAUL_DAYS * 24 * 60 * 60 * 1000)
  return Math.ceil((haulDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function haulDueDate(inv: Investment): string {
  const haulDate = new Date(haulStart(inv).getTime() + HAUL_DAYS * 24 * 60 * 60 * 1000)
  return haulDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ZakatPage() {
  const { lang } = useI18n()
  const ar = lang === 'ar'
  const { user } = useUser()
  const supabase = useMemo(() => createClient(), [])

  const [goldGram, setGoldGram] = useState(0)
  const [goldPrice, setGoldPrice] = useState(30)
  const [silverGram, setSilverGram] = useState(0)
  const [silverPrice, setSilverPrice] = useState(0.35)
  const [cash, setCash] = useState(0)
  const [investments, setInvestments] = useState(0)
  const [debtsOwed, setDebtsOwed] = useState(0)
  const [currency, setCurrency] = useState('JOD')
  const [history, setHistory] = useState<ZakatHistory[]>([])
  const [invItems, setInvItems] = useState<Investment[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetchingPrices, setFetchingPrices] = useState(false)
  const [zakatSummary, setZakatSummary] = useState<any>(null)
  const currentYear = new Date().getFullYear()

  async function loadData() {
    if (!user) return
    const [invRes, profileRes, histRes] = await Promise.all([
      supabase.from('investments').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('currency').eq('id', user.id).single(),
      supabase.from('zakat_history').select('*').eq('user_id', user.id).order('year', { ascending: false }),
    ])

    const currencyCode = profileRes.data?.currency ?? 'JOD'
    setCurrency(currencyCode)
    setHistory(histRes.data ?? [])
    setInvItems(invRes.data ?? [])

    const usdToLocal = currencyCode !== 'USD' ? (await fetchExchangeRate('USD', currencyCode) ?? 1) : 1
    
    // جلب البيانات المالية الموحدة للملء التلقائي
    const { data: dash } = await supabase.rpc('get_financial_dashboard', {
      p_user_id: user.id,
      p_usd_to_local_rate: usdToLocal
    })

    if (dash) {
      // ملء تلقائي للمدخلات
      setCash((dash.total_accounts_balance ?? 0) + (dash.goals_saved ?? 0))
      setInvestments((dash.investments_value_local ?? 0) + (dash.investment_cash_local ?? 0))
      setDebtsOwed(dash.total_debt_owed ?? 0)
    }

    const { data: zakat } = await supabase.rpc('get_zakat_summary', {
      p_user_id: user.id,
      p_gold_price_per_gram: goldPrice,
      p_silver_price_per_gram: silverPrice,
      p_usd_to_local_rate: usdToLocal
    })
    setZakatSummary(zakat)
  }

  useEffect(() => { loadData() }, [user])

  useEffect(() => {
    async function updateZakat() {
      if (!user) return
      const usdToLocal = currency !== 'USD' ? (await fetchExchangeRate('USD', currency) ?? 1) : 1
      const { data: zakat } = await supabase.rpc('get_zakat_summary', {
        p_user_id: user.id,
        p_gold_price_per_gram: goldPrice,
        p_silver_price_per_gram: silverPrice,
        p_usd_to_local_rate: usdToLocal
      })
      setZakatSummary(zakat)
    }
    const timer = setTimeout(updateZakat, 500)
    return () => clearTimeout(timer)
  }, [goldPrice, silverPrice, goldGram, silverGram, cash, investments, debtsOwed])

  const nisab = zakatSummary?.nisab_effective ?? 0
  const totalZakatable = (zakatSummary?.zakatable_assets ?? 0) + (goldGram * goldPrice) + (silverGram * silverPrice)
  const zakatDue = totalZakatable >= nisab ? totalZakatable * 0.025 : 0
  const eligible = totalZakatable >= nisab
  const nisabGold = zakatSummary?.nisab_gold ?? 0

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

  async function fetchLivePrices() {
    setFetchingPrices(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const headers: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      const res = await fetch(`/api/zakat/prices?currency=${currency}`, { headers }).catch(() => null)
      if (res?.ok) {
        const data = await res.json()
        if (data.gold > 0) setGoldPrice(data.gold)
        if (data.silver > 0) setSilverPrice(data.silver)
      }
    } catch {
      // If our proxy fails, let's keep current values
    } finally {
      setFetchingPrices(false)
    }
  }

  useEffect(() => { fetchLivePrices() }, [user])

  // استثمارات تقترب حولها (أقل من 60 يوم)
  const urgentInv = invItems
    .filter(i => i.created_at || i.purchase_date)
    .map(i => ({ ...i, daysLeft: haulDaysLeft(i), dueDate: haulDueDate(i) }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('zakat_history').upsert({
      user_id: user.id, year: currentYear,
      gold_gram: goldGram, silver_gram: silverGram,
      cash, investments, debts_owed: debtsOwed,
      total_zakatable: totalZakatable, zakat_due: zakatDue, is_paid: false,
    }, { onConflict: 'user_id,year' })
    const { data } = await supabase.from('zakat_history').select('*').eq('user_id', user.id).order('year', { ascending: false })
    setHistory(data ?? [])
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function togglePaid(id: string, isPaid: boolean) {
    await supabase.from('zakat_history').update({ is_paid: !isPaid }).eq('id', id)
    setHistory(h => h.map(r => r.id === id ? { ...r, is_paid: !isPaid } : r))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
          🌙 {ar ? 'حاسبة الزكاة' : 'Zakat Calculator'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {ar ? `حساب زكاة ${currentYear} — النصاب: ${fmt(nisab)} ${currency}` : `Zakat for ${currentYear} — Nisab: ${fmt(nisab)} ${currency}`}
        </p>
      </div>

      {/* ── حول الاستثمارات ── */}
      {urgentInv.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
              🗓️ {ar ? 'حول استثماراتك' : 'Investment Haul Dates'}
            </div>
            <button onClick={loadData} style={{
              padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              🔄 {ar ? 'تحديث' : 'Refresh'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urgentInv.map(inv => {
              const overdue = inv.daysLeft < 0
              const urgent = inv.daysLeft >= 0 && inv.daysLeft <= 30
              const soon = inv.daysLeft > 30 && inv.daysLeft <= 60
              const color = overdue ? '#EF4444' : urgent ? '#F59E0B' : soon ? '#3B7EF6' : '#10B981'
              const bg = overdue ? 'rgba(239,68,68,0.06)' : urgent ? 'rgba(245,158,11,0.06)' : soon ? 'rgba(59,126,246,0.04)' : 'var(--bg-elevated)'
              const border = overdue ? 'rgba(239,68,68,0.2)' : urgent ? 'rgba(245,158,11,0.2)' : soon ? 'rgba(59,126,246,0.15)' : 'var(--border)'
              const invValue = Number(inv.shares) * Number(inv.current_price)
              return (
                <div key={inv.id} style={{ padding: '12px 14px', borderRadius: 14, background: bg, border: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {inv.symbol ?? inv.name ?? (ar ? 'استثمار' : 'Investment')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {fmt(invValue)} {currency} · {ar ? `موعد الحول: ${inv.dueDate}` : `Haul due: ${inv.dueDate}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace' }}>
                      {overdue ? (ar ? 'متأخر' : 'Overdue') : `${inv.daysLeft}`}
                    </div>
                    {!overdue && <div style={{ fontSize: 10, color, fontWeight: 700 }}>{ar ? 'يوم' : 'days'}</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', padding: '8px 10px', borderRadius: 10, background: 'var(--bg-elevated)' }}>
            {ar ? 'الحول يُحسب من تاريخ الشراء إن وُجد، وإلا من تاريخ الإضافة (354 يوماً هجرياً)' : 'Haul calculated from purchase date if set, otherwise from creation date (354 lunar days)'}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
            💡 {ar ? 'لم يتغير تاريخ الحول؟ عدّل الاستثمار في صفحة الاستثمارات وأدخل تاريخ الشراء، ثم اضغط تحديث.' : "Haul date not updated? Edit the investment in the Investments page, enter the purchase date, then click Refresh."}
          </div>
        </div>
      )}

      {/* ── نتيجة الحساب ── */}
      <div style={{
        background: eligible ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
        border: `1px solid ${eligible ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
        borderRadius: 20, padding: 20, textAlign: 'center'
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
          {eligible ? (ar ? '✅ وجبت عليك الزكاة' : '✅ Zakat is due') : (ar ? '⏳ لم يبلغ المال النصاب بعد' : '⏳ Below nisab threshold')}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, color: eligible ? '#10B981' : 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
          {fmt(zakatDue)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{currency} {ar ? '(2.5% من المال الزكوي)' : '(2.5% of zakatable assets)'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{ar ? 'المال الزكوي' : 'Zakatable Assets'}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmt(totalZakatable)}</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{ar ? 'النصاب (الذهب)' : 'Nisab (Gold)'}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmt(nisabGold)}</div>
          </div>
        </div>
      </div>

      {/* ── الأصول (مع تلقائي) ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            📊 {ar ? 'أصولك' : 'Your Assets'}
          </div>
          <button onClick={fetchLivePrices} disabled={fetchingPrices} style={{
            padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(59,126,246,0.3)',
            background: 'var(--accent-blue-dim)', color: 'var(--accent-blue-light)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            opacity: fetchingPrices ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {fetchingPrices ? '⏳' : '🔄'} {ar ? 'أسعار حية' : 'Live Prices'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          {ar ? '✅ محسوب تلقائياً: الاستثمارات + أهداف الادخار + الديون' : '✅ Auto-filled: investments, savings goals, debts'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: ar ? `سعر غرام الذهب (${currency})` : `Gold Price/gram (${currency})`, val: goldPrice, set: setGoldPrice, hint: ar ? 'السعر الحالي في السوق' : 'Current market price', auto: false },
            { label: ar ? 'ذهب (غرام)' : 'Gold (grams)', val: goldGram, set: setGoldGram, hint: ar ? 'المصاغ والسبائك' : 'Jewelry & bars', auto: false },
            { label: ar ? `سعر غرام الفضة (${currency})` : `Silver Price/gram (${currency})`, val: silverPrice, set: setSilverPrice, hint: '', auto: false },
            { label: ar ? 'فضة (غرام)' : 'Silver (grams)', val: silverGram, set: setSilverGram, hint: '', auto: false },
            { label: ar ? `نقد + أهداف الادخار (${currency})` : `Cash + Savings Goals (${currency})`, val: cash, set: setCash, hint: ar ? '✅ أهداف الادخار محسوبة تلقائياً' : '✅ Auto-includes savings goals', auto: true },
            { label: ar ? `استثمارات (${currency})` : `Investments (${currency})`, val: investments, set: setInvestments, hint: ar ? '✅ محسوب من محفظتك تلقائياً' : '✅ Auto-fetched from portfolio', auto: true },
            { label: ar ? `ديون عليك (${currency})` : `Debts You Owe (${currency})`, val: debtsOwed, set: setDebtsOwed, hint: ar ? '✅ محسوب من ديونك تلقائياً' : '✅ Auto-fetched from your debts', auto: true },
          ].map(({ label, val, set, hint, auto }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: auto ? '#10B981' : 'var(--text-secondary)' }}>{label}</span>
                {hint && <span style={{ fontSize: 10, color: auto ? '#10B981' : 'var(--text-muted)' }}>{hint}</span>}
              </div>
              <input type="number" value={val} onChange={e => set(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: auto ? 'rgba(16,185,129,0.04)' : 'var(--bg-elevated)',
                  border: `1px solid ${auto ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                  color: 'var(--text-primary)', fontSize: 15, fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          marginTop: 16, width: '100%', padding: '14px', borderRadius: 14,
          background: 'var(--accent-blue)', border: 'none', cursor: 'pointer',
          color: 'white', fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
          opacity: saving ? 0.7 : 1,
        }}>
          {saved ? (ar ? '✅ تم الحفظ' : '✅ Saved') : saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ حساب الزكاة' : 'Save Zakat Calculation')}
        </button>
      </div>

      {/* ── السجل ── */}
      {history.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
            📋 {ar ? 'سجل الزكاة' : 'Zakat History'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map(record => (
              <div key={record.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 14,
                background: record.is_paid ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)',
                border: `1px solid ${record.is_paid ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {record.year} — {fmt(record.zakat_due ?? 0)} {currency}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {ar ? `مال زكوي: ${fmt(record.total_zakatable ?? 0)}` : `Zakatable: ${fmt(record.total_zakatable ?? 0)}`}
                  </div>
                </div>
                <button onClick={() => togglePaid(record.id, record.is_paid)} style={{
                  padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                  background: record.is_paid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: record.is_paid ? '#10B981' : '#F59E0B',
                }}>
                  {record.is_paid ? (ar ? '✅ مُؤدَّاة' : '✅ Paid') : (ar ? '⏳ لم تُؤدَّ' : '⏳ Unpaid')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── تنبيه شرعي ── */}
      <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 800, marginBottom: 6 }}>📌 {ar ? 'تنبيه شرعي' : 'Note'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {ar
            ? 'تجب الزكاة بعد مرور حول هجري (354 يوماً) على بلوغ النصاب. الحساب هنا تقريبي — استشر عالماً للتحقق.'
            : 'Zakat is due after one lunar year (354 days) passes on wealth above nisab. This is an estimate — consult a scholar for verification.'}
        </div>
      </div>
    </div>
  )
}
