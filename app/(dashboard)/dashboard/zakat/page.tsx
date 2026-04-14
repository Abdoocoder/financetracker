'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { fetchExchangeRate } from '@/lib/currency'
import type { Investment, ZakatHistory } from '@/types'
import { CalculatorDisclaimer } from '@/components/ui/calculator-disclaimer'

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
  const { t } = useI18n()
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
          🌙 {t('zakat_title')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {t('zakat_header_desc', { year: currentYear, nisab: fmt(nisab), currency })}
        </p>
      </div>

      <CalculatorDisclaimer storageKey="disclaimer_zakat" />

      {/* ── حول الاستثمارات ── */}
      {urgentInv.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
              {t('zakat_haul_title')}
            </div>
            <button onClick={loadData} style={{
              padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              🔄 {t('zakat_refresh')}
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
                      {inv.symbol ?? inv.name ?? t('inv_assets')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {fmt(invValue)} {currency} · {t('zakat_haul_due', { date: inv.dueDate })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace' }}>
                      {overdue ? t('zakat_overdue') : `${inv.daysLeft}`}
                    </div>
                    {!overdue && <div style={{ fontSize: 10, color, fontWeight: 700 }}>{t('zakat_days')}</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', padding: '8px 10px', borderRadius: 10, background: 'var(--bg-elevated)' }}>
            {t('zakat_haul_note')}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, padding: '8px 10px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
            {t('zakat_haul_purchase_tip')}
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
          {eligible ? t('zakat_due_msg') : t('zakat_below_nisab')}
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, color: eligible ? '#10B981' : 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 4 }}>
          {fmt(zakatDue)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('zakat_percentage', { currency })}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{t('zakat_total_zakatable')}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmt(totalZakatable)}</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{t('zakat_nisab_gold_label')}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmt(nisabGold)}</div>
          </div>
        </div>
      </div>

      {/* ── الأصول (مع تلقائي) ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            📊 {t('zakat_assets_header')}
          </div>
          <button onClick={fetchLivePrices} disabled={fetchingPrices} style={{
            padding: '5px 12px', borderRadius: 10, border: '1px solid rgba(59,126,246,0.3)',
            background: 'var(--accent-blue-dim)', color: 'var(--accent-blue-light)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            opacity: fetchingPrices ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {fetchingPrices ? '⏳' : '🔄'} {t('zakat_fetch_prices')}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          {t('zakat_auto_filled_hint')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: t('zakat_gold_price', { currency }), val: goldPrice, set: setGoldPrice, hint: t('zakat_gold_price_hint'), auto: false },
            { label: t('zakat_gold_gram'), val: goldGram, set: setGoldGram, hint: t('zakat_gold_gram_hint'), auto: false },
            { label: t('zakat_silver_price', { currency }), val: silverPrice, set: setSilverPrice, hint: '', auto: false },
            { label: t('zakat_silver_gram'), val: silverGram, set: setSilverGram, hint: '', auto: false },
            { label: t('zakat_cash_label', { currency }), val: cash, set: setCash, hint: t('zakat_cash_label_hint'), auto: true },
            { label: t('zakat_investments', { currency }), val: investments, set: setInvestments, hint: t('zakat_invest_hint'), auto: true },
            { label: t('zakat_debts_label', { currency }), val: debtsOwed, set: setDebtsOwed, hint: t('zakat_debts_label_hint'), auto: true },
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
          {saved ? t('zakat_saved') : saving ? t('zakat_saving') : t('zakat_save_btn')}
        </button>
      </div>

      {/* ── سجل الزكاة ── */}
      {history.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>
            📋 {t('zakat_history')}
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
                    {t('zakat_zakatable_label', { amount: fmt(record.total_zakatable ?? 0) })}
                  </div>
                </div>
                <button onClick={() => togglePaid(record.id, record.is_paid)} style={{
                  padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                  background: record.is_paid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: record.is_paid ? '#10B981' : '#F59E0B',
                }}>
                  {record.is_paid ? t('zakat_paid') : t('zakat_unpaid')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── تنبيه شرعي ── */}
      <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 800, marginBottom: 6 }}>{t('zakat_sharia_note_title')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {t('zakat_note')}
        </div>
      </div>
    </div>
  )
}
