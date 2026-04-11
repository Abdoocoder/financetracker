'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { CalculatorDisclaimer } from '@/components/ui/calculator-disclaimer'

function yearsToFIRE(target: number, current: number, monthlyContrib: number, annualReturn: number): number | null {
  if (monthlyContrib <= 0 && current >= target) return 0
  if (monthlyContrib <= 0) return null
  const r = annualReturn / 100 / 12
  let balance = current
  for (let month = 1; month <= 600; month++) {
    balance = balance * (1 + r) + monthlyContrib
    if (balance >= target) return Math.round((month / 12) * 10) / 10
  }
  return null
}

export default function FIREPage() {
  const { t, currentLang } = useI18n()
  const ar = currentLang === 'ar'
  const { user } = useUser()
  const supabase = useMemo(() => createClient(), [])

  const [monthlyExpenses, setMonthlyExpenses] = useState(500)
  const [withdrawalRate, setWithdrawalRate] = useState(4)
  const [annualReturn, setAnnualReturn] = useState(7)
  const [monthlyContrib, setMonthlyContrib] = useState(200)
  const [currentNetWorth, setCurrentNetWorth] = useState(0)
  const [currency, setCurrency] = useState('JOD')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [invRes, goalRes, debtRes, profileRes] = await Promise.all([
        supabase.from('investments').select('shares,current_price').eq('user_id', user!.id),
        supabase.from('savings_goals').select('current_amount').eq('user_id', user!.id),
        supabase.from('debts').select('remaining_amount').eq('user_id', user!.id).eq('is_paid', false),
        supabase.from('profiles').select('currency,monthly_income').eq('id', user!.id).single(),
      ])
      const invValue = (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0)
      const goalsSaved = (goalRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0)
      const totalDebt = (debtRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0)
      const profileData = profileRes.data as { monthly_income: number; currency: string } | null
      const income = Number(profileData?.monthly_income ?? 0)
      setCurrentNetWorth(Math.max(0, invValue + goalsSaved - totalDebt))
      setCurrency(profileData?.currency ?? 'JOD')
      if (income > 0) setMonthlyExpenses(Math.round(income * 0.7))
      setLoading(false)
    }
    load()
  }, [user, supabase])

  const annualExpenses = monthlyExpenses * 12
  const fireNumber = annualExpenses / (withdrawalRate / 100)
  const progress = Math.min(100, (currentNetWorth / fireNumber) * 100)
  const years = yearsToFIRE(fireNumber, currentNetWorth, monthlyContrib, annualReturn)
  const remaining = Math.max(0, fireNumber - currentNetWorth)

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  const color = progress >= 75 ? '#10B981' : progress >= 40 ? '#F59E0B' : '#3B7EF6'

  const modes = [
    { key: 'lean', label: ar ? 'FIRE بسيط' : 'Lean FIRE', mult: 0.7 },
    { key: 'full', label: ar ? 'FIRE كامل' : 'Full FIRE', mult: 1 },
    { key: 'fat', label: ar ? 'FIRE مريح' : 'Fat FIRE', mult: 1.5 },
  ]
  const [mode, setMode] = useState('full')
  const modeMultiplier = modes.find(m => m.key === mode)?.mult ?? 1
  const adjustedFireNumber = fireNumber * modeMultiplier
  const adjustedYears = yearsToFIRE(adjustedFireNumber, currentNetWorth, monthlyContrib, annualReturn)
  const adjustedProgress = Math.min(100, (currentNetWorth / adjustedFireNumber) * 100)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[180, 120, 140, 100].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 20 }} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
          🎯 {ar ? 'حاسبة FIRE' : 'FIRE Calculator'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {ar ? 'Financial Independence, Retire Early — اعرف متى تصل للحرية المالية' : 'Financial Independence, Retire Early'}
        </p>
      </div>

      <CalculatorDisclaimer storageKey="disclaimer_fire" />

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        {modes.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 12,
            background: mode === m.key ? 'var(--accent-blue-dim)' : 'var(--bg-card)',
            color: mode === m.key ? 'var(--accent-blue-light)' : 'var(--text-muted)',
            outline: mode === m.key ? '1px solid rgba(59,126,246,0.3)' : '1px solid var(--border)',
            transition: 'all 0.2s',
          }}>{m.label}</button>
        ))}
      </div>

      {/* FIRE Number Card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
          🏁 {ar ? 'رقم FIRE المستهدف' : 'Your FIRE Number'}
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, color: color, fontFamily: 'monospace', marginBottom: 4 }}>
          {fmt(adjustedFireNumber)} {currency}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {ar ? `= ${fmt(annualExpenses * modeMultiplier)} ${currency} سنوياً ÷ ${withdrawalRate}% معدل سحب` : `= ${fmt(annualExpenses * modeMultiplier)} ${currency}/year ÷ ${withdrawalRate}% withdrawal rate`}
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
              {ar ? 'تقدمك الحالي' : 'Current Progress'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color }}>{adjustedProgress.toFixed(1)}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{ width: `${adjustedProgress}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 1s ease', boxShadow: `0 0 10px ${color}60` }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{ar ? 'ثروتك الحالية' : 'Current Net Worth'}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>{fmt(currentNetWorth)}</div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{ar ? 'المتبقي' : 'Remaining'}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#EF4444', fontFamily: 'monospace' }}>{fmt(Math.max(0, adjustedFireNumber - currentNetWorth))}</div>
          </div>
        </div>

        {adjustedYears !== null ? (
          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 14, background: adjustedYears <= 10 ? 'rgba(16,185,129,0.08)' : 'rgba(59,126,246,0.06)', border: `1px solid ${adjustedYears <= 10 ? 'rgba(16,185,129,0.2)' : 'rgba(59,126,246,0.15)'}`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>⏳ {ar ? 'متى تصل للحرية المالية؟' : 'Time to Financial Independence'}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: adjustedYears <= 10 ? '#10B981' : 'var(--accent-blue-light)', fontFamily: 'monospace' }}>
              {adjustedYears === 0 ? (ar ? 'وصلت بالفعل! 🎉' : 'Already there! 🎉') : `${adjustedYears} ${ar ? 'سنة' : 'years'}`}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center', fontSize: 13, color: '#F87171', fontWeight: 700 }}>
            {ar ? 'زِد مساهمتك الشهرية للوصول للهدف' : 'Increase monthly contribution to reach the goal'}
          </div>
        )}
      </div>

      {/* Inputs */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          ⚙️ {ar ? 'الإعدادات' : 'Settings'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: ar ? `مصاريفك الشهرية (${currency})` : `Monthly Expenses (${currency})`, val: monthlyExpenses, set: setMonthlyExpenses, min: 100, max: 10000, step: 50 },
            { label: ar ? 'معدل الادخار / الاستثمار الشهري' : `Monthly Contribution (${currency})`, val: monthlyContrib, set: setMonthlyContrib, min: 0, max: 5000, step: 50 },
            { label: ar ? 'معدل العائد السنوي (%)' : 'Expected Annual Return (%)', val: annualReturn, set: setAnnualReturn, min: 1, max: 20, step: 0.5 },
            { label: ar ? 'معدل السحب السنوي (%)' : 'Withdrawal Rate (%)', val: withdrawalRate, set: setWithdrawalRate, min: 2, max: 8, step: 0.5 },
          ].map(({ label, val, set, min, max, step }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{val}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={val}
                onChange={e => set(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div style={{ background: 'rgba(59,126,246,0.04)', border: '1px solid rgba(59,126,246,0.12)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-blue-light)', marginBottom: 8 }}>
          💡 {ar ? 'كيف يُحسب؟' : 'How is it calculated?'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          {ar
            ? `رقم FIRE = مصاريف سنوية ÷ معدل السحب. قاعدة الـ 4% تعني أن محفظتك يجب أن تكون 25× مصاريفك السنوية. مثلاً: إذا مصاريفك 500 د.أ شهرياً = 6,000 سنوياً، فرقم FIRE هو 150,000 د.أ.`
            : `FIRE Number = Annual Expenses ÷ Withdrawal Rate. The 4% rule means your portfolio should be 25× your annual expenses. E.g., $500/month = $6,000/year → FIRE number = $150,000.`}
        </div>
      </div>
    </div>
  )
}
