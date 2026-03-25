'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'

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
  const [history, setHistory] = useState<any[]>([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!user) return
    async function load() {
      const [invRes, profileRes, histRes] = await Promise.all([
        supabase.from('investments').select('shares,current_price').eq('user_id', user!.id),
        supabase.from('profiles').select('currency').eq('id', user!.id).single(),
        supabase.from('zakat_history').select('*').eq('user_id', user!.id).order('year', { ascending: false }),
      ])
      const invValue = (invRes.data ?? []).reduce((a: number, i: any) => a + Number(i.shares) * Number(i.current_price), 0)
      setInvestments(Math.round(invValue))
      setCurrency((profileRes as any).data?.currency ?? 'JOD')
      setHistory(histRes.data ?? [])
    }
    load()
  }, [user, supabase])

  // Nisab calculation
  const nisabGold = 85 * goldPrice
  const nisabSilver = 595 * silverPrice
  const nisab = Math.min(nisabGold, nisabSilver)

  const totalAssets = goldGram * goldPrice + silverGram * silverPrice + cash + investments
  const totalZakatable = Math.max(0, totalAssets - debtsOwed)
  const zakatDue = totalZakatable >= nisab ? totalZakatable * 0.025 : 0

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('zakat_history').upsert({
      user_id: user.id,
      year: currentYear,
      gold_gram: goldGram,
      silver_gram: silverGram,
      cash,
      investments,
      debts_owed: debtsOwed,
      total_zakatable: totalZakatable,
      zakat_due: zakatDue,
      is_paid: false,
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

  const eligible = totalZakatable >= nisab

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

      {/* Result Card */}
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

      {/* Input Fields */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          📊 {ar ? 'أدخل أصولك' : 'Enter Your Assets'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: ar ? `سعر غرام الذهب (${currency})` : `Gold Price/gram (${currency})`, val: goldPrice, set: setGoldPrice, hint: ar ? 'السعر الحالي في السوق' : 'Current market price' },
            { label: ar ? 'ذهب (غرام)' : 'Gold (grams)', val: goldGram, set: setGoldGram, hint: ar ? 'المصاغ والسبائك' : 'Jewelry and bars' },
            { label: ar ? `سعر غرام الفضة (${currency})` : `Silver Price/gram (${currency})`, val: silverPrice, set: setSilverPrice, hint: '' },
            { label: ar ? 'فضة (غرام)' : 'Silver (grams)', val: silverGram, set: setSilverGram, hint: '' },
            { label: ar ? `نقد وأرصدة بنكية (${currency})` : `Cash & Bank Balances (${currency})`, val: cash, set: setCash, hint: ar ? 'ما مكث عندك حول' : 'Held for 1 lunar year' },
            { label: ar ? `استثمارات (${currency})` : `Investments (${currency})`, val: investments, set: setInvestments, hint: ar ? 'محسوب من محفظتك تلقائياً' : 'Auto-fetched from your portfolio' },
            { label: ar ? `ديون عليك (${currency})` : `Debts You Owe (${currency})`, val: debtsOwed, set: setDebtsOwed, hint: ar ? 'تُطرح من المال الزكوي' : 'Deducted from zakatable amount' },
          ].map(({ label, val, set, hint }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span>
                {hint && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{hint}</span>}
              </div>
              <input
                type="number"
                value={val}
                onChange={e => set(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
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

      {/* History */}
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

      {/* Note */}
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
