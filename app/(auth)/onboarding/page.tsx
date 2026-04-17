'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { detectCurrency, type DetectionResult } from '@/lib/detectCurrency'
import { CurrencyButton } from '@/components/ui/currency-picker'

type Step = 1 | 2 | 3
interface Profile { fullName: string; monthlyIncome: string; currency: string }
interface FirstTransaction { type: 'income'|'expense'; amount: string; category: string; description: string }

const CATEGORIES_EXPENSE = ['طعام','مواصلات','فواتير','صحة','تعليم','ترفيه','ملابس','أخرى']
const CATEGORIES_INCOME  = ['راتب','عمل حر','استثمار','هدية','أخرى']

function ProgressBar({ step }: { step: Step }) {
  const pct = ((step - 1) / 2) * 100
  return (
    <div className="h-[3px] bg-[var(--border)] rounded-sm mb-7 overflow-hidden">
      <style>{`.ob-prog{width:${pct}%}`}</style>
      <div className="ob-prog h-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-green)] rounded-sm transition-[width] duration-500 ease-in-out" />
    </div>
  )
}

function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-7">
      {([1, 2, 3] as Step[]).map(s => (
        <div
          key={s}
          className={`h-[6px] rounded-full transition-all duration-[350ms] cubic-bezier-bounce ${
            current === s ? 'w-6 bg-[var(--accent-blue)]' :
            current > s  ? 'w-[6px] bg-[var(--accent-green)]' :
                           'w-[6px] bg-[var(--border)]'
          }`}
        />
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[var(--text-secondary)]">{label}</label>
      {children}
    </div>
  )
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[15px] outline-none font-[inherit] box-border transition-[border-color] duration-150 focus:border-[var(--accent-blue)] ${props.className ?? ''}`}
    />
  )
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[15px] outline-none font-[inherit] box-border cursor-pointer ${props.className ?? ''}`}
    />
  )
}

function BudgetPreview({ income, t }: { income: number; t: any }) {
  if (income <= 0) return null
  const needs   = Math.round(income * 0.5)
  const wants   = Math.round(income * 0.3)
  const savings = Math.round(income * 0.2)
  return (
    <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] animate-[fadeSlideIn_0.3s_ease]">
      <div className="text-[11px] font-extrabold text-[var(--text-muted)] mb-2 text-center">
        {t('onboard_suggested_budget')}
      </div>
      <div className="flex gap-[6px]">
        <div className="flex-1 text-center p-[6px] bg-[var(--accent-blue-dim)] rounded-lg">
          <div className="text-[13px] font-black text-[var(--accent-blue-light)] font-mono">{needs}</div>
          <div className="text-[9px] text-[var(--text-muted)] font-bold">{t('onboard_needs')}</div>
        </div>
        <div className="flex-1 text-center p-[6px] bg-[var(--accent-purple-dim)] rounded-lg">
          <div className="text-[13px] font-black text-[var(--accent-purple-light)] font-mono">{wants}</div>
          <div className="text-[9px] text-[var(--text-muted)] font-bold">{t('onboard_wants')}</div>
        </div>
        <div className="flex-1 text-center p-[6px] bg-[var(--accent-green-dim)] rounded-lg">
          <div className="text-[13px] font-black text-[var(--accent-green-light)] font-mono">{savings}</div>
          <div className="text-[9px] text-[var(--text-muted)] font-bold">{t('onboard_savings')}</div>
        </div>
      </div>
    </div>
  )
}

// ── Step 1: الملف الشخصي ─────────────────────────────
function Step1({ profile, setProfile, onNext, loading, saving, t, detectedInfo }: {
  profile: Profile
  setProfile: React.Dispatch<React.SetStateAction<Profile>>
  onNext: () => void
  loading: boolean
  saving: boolean
  t: any
  detectedInfo: DetectionResult | null
}) {
  if (loading) return (
    <div className="flex flex-col gap-5">
      <div className="skeleton h-[80px] rounded-xl" />
      <div className="skeleton h-[56px] rounded-xl" />
      <div className="skeleton h-[56px] rounded-xl" />
      <div className="skeleton h-[56px] rounded-xl" />
    </div>
  )
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <div className="w-16 h-16 rounded-[20px] bg-[var(--accent-blue-dim)] border border-[rgba(59,126,246,0.25)] flex items-center justify-center text-[28px] mx-auto mb-4">👋</div>
        <h2 className="text-[22px] font-black text-[var(--text-primary)] m-0">
          {t('onboarding_welcome_title')}
        </h2>
        <p className="text-[14px] text-[var(--text-muted)] mt-[6px]">
          {t('onboarding_welcome_subtitle')}
        </p>
      </div>

      <Field label={t('onboard_full_name')}>
        <StyledInput
          type="text"
          value={profile.fullName}
          onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
          placeholder={t('onboard_full_name').replace(' *', '')}
        />
      </Field>

      <Field label={t('onboard_income_optional')}>
        <StyledInput
          type="number"
          value={profile.monthlyIncome}
          onChange={e => setProfile(p => ({ ...p, monthlyIncome: e.target.value }))}
          placeholder="0"
        />
        <BudgetPreview income={parseFloat(profile.monthlyIncome) || 0} t={t} />
      </Field>

      <Field label={t('onboard_currency')}>
        <CurrencyButton
          value={profile.currency}
          onChange={code => setProfile(p => ({ ...p, currency: code }))}
          lang={t('onboard_currency') === 'Currency' ? 'en' : 'ar'}
          detectedCountry={detectedInfo?.confidence === 'high' ? detectedInfo.countryName : undefined}
        />
      </Field>

      <button
        type="button"
        onClick={onNext}
        disabled={saving || profile.fullName.trim().length === 0}
        className={`w-full py-[14px] rounded-[14px] border-none bg-[var(--accent-blue)] text-white text-[15px] font-bold font-[inherit] mt-2 transition-opacity duration-150 ${saving || !profile.fullName.trim() ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
      >
        {saving ? '⏳ ...' : t('onboard_next_arrow')}
      </button>
    </div>
  )
}

// ── Step 2: أول معاملة ───────────────────────────────
function Step2({ tx, setTx, onNext, onBack, saving, t, tCategory }: {
  tx: FirstTransaction
  setTx: React.Dispatch<React.SetStateAction<FirstTransaction>>
  onNext: () => void
  onBack: () => void
  saving: boolean
  t: any
  tCategory: (c: string) => string
}) {
  const categories = tx.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE
  const isIncome = tx.type === 'income'
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center text-[28px] mx-auto mb-4 transition-all duration-300 border ${
          isIncome
            ? 'bg-[var(--accent-green-dim)] border-[rgba(16,185,129,0.25)]'
            : 'bg-[var(--accent-red-dim)]  border-[rgba(239,68,68,0.2)]'
        }`}>
          {isIncome ? '💰' : '💸'}
        </div>
        <h2 className="text-[22px] font-black text-[var(--text-primary)] m-0">
          {t('onboard_first_tx_title')}
        </h2>
        <p className="text-[14px] text-[var(--text-muted)] mt-[6px]">
          {t('onboard_first_tx_subtitle')}
        </p>
      </div>

      <div className="flex gap-2 p-1 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--border)]">
        {(['income', 'expense'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setTx(t => ({ ...t, type, category: '' }))}
            className={`flex-1 py-[10px] rounded-[11px] border-none text-[13px] font-bold cursor-pointer font-[inherit] transition-all duration-200 ${
              tx.type === type
                ? type === 'income' ? 'bg-[var(--accent-green)] text-white' : 'bg-[var(--accent-red)] text-white'
                : 'bg-transparent text-[var(--text-muted)]'
            }`}
          >
            {type === 'income' ? t('onboard_income_label') : t('onboard_expense_label')}
          </button>
        ))}
      </div>

      <Field label={t('onboard_amount')}>
        <StyledInput type="number" value={tx.amount} onChange={e => setTx(t => ({ ...t, amount: e.target.value }))} placeholder="0.00" />
      </Field>

      <Field label={t('onboard_category')}>
        <StyledSelect value={tx.category} onChange={e => setTx(t => ({ ...t, category: e.target.value }))}>
          <option value="">{t('onboard_select_cat')}</option>
          {categories.map(c => <option key={c} value={c}>{tCategory(c)}</option>)}
        </StyledSelect>
      </Field>

      <Field label={t('onboard_desc_optional')}>
        <StyledInput
          type="text"
          value={tx.description}
          onChange={e => setTx(t => ({ ...t, description: e.target.value }))}
          placeholder={tx.type === 'income'
            ? (t('onboard_income_label').includes('income') ? 'e.g. March salary' : 'مثال: راتب شهر مارس')
            : (t('onboard_expense_label').includes('expense') ? 'e.g. Electricity bill' : 'مثال: فاتورة الكهرباء')}
        />
      </Field>

      <div className="flex gap-[10px] mt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-[14px] rounded-[14px] border border-[var(--border)] bg-transparent text-[var(--text-secondary)] text-[14px] font-bold cursor-pointer font-[inherit]"
        >
          {t('onboard_back_arrow')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={saving || !tx.amount || !tx.category}
          className={`flex-1 py-[14px] rounded-[14px] border-none text-white text-[15px] font-bold font-[inherit] transition-opacity duration-150 ${
            isIncome ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-blue)]'
          } ${saving || !tx.amount || !tx.category ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
        >
          {saving ? '⏳' : t('onboard_save_continue')}
        </button>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="bg-transparent border-none text-[var(--text-muted)] text-[13px] cursor-pointer underline font-[inherit] text-center py-1"
      >
        {t('onboard_skip_now')}
      </button>
    </div>
  )
}

// ── Step 3: الترحيب ──────────────────────────────────
function Step3({ onGo, t, name }: { onGo: () => void; t: any; name: string }) {
  const firstName = name.split(' ')[0] || (t('onboard_income_label').includes('income') ? 'you' : 'بك')

  const journey = [
    { icon: '🌱', level: t('onboard_journey_beginner'), active: true },
    { icon: '💪', level: t('onboard_journey_saver'),    active: false },
    { icon: '📈', level: t('onboard_journey_investor'), active: false },
    { icon: '👑', level: t('onboard_journey_free'),     active: false },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="text-center mb-1">
        <div className="text-[48px] mb-3 animate-[pop_0.5s_ease]">🎉</div>
        <h2 className="text-[22px] font-black text-[var(--text-primary)] m-0">
          {t('onboard_welcome_named').replace('{}', firstName)}
        </h2>
        <p className="text-[14px] text-[var(--text-muted)] mt-[6px] leading-[1.6]">
          {t('onboard_ready_desc')}
        </p>
      </div>

      {/* رحلة الثروة */}
      <div className="bg-[linear-gradient(135deg,rgba(59,126,246,0.06),rgba(16,185,129,0.04))] border border-[rgba(59,126,246,0.15)] rounded-2xl px-4 py-[14px]">
        <div className="text-[11px] font-extrabold text-[var(--text-muted)] tracking-[0.08em] uppercase mb-3">
          {t('onboard_journey_title')}
        </div>
        <div className="flex items-center justify-between gap-1">
          {journey.map((j, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`text-[20px] mb-1 ${j.active ? 'opacity-100' : 'opacity-35'}`}>{j.icon}</div>
              <div className={`text-[10px] font-extrabold ${j.active ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-muted)]'}`}>{j.level}</div>
            </div>
          ))}
        </div>
        {/* شريط التقدم */}
        <div className="h-1 bg-[var(--bg-elevated)] rounded-full mt-[10px] overflow-hidden">
          <div className="h-full w-[5%] bg-[var(--accent-blue)] rounded-full" />
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-[6px] text-center">
          {t('onboard_journey_tip')}
        </div>
      </div>

      {/* طلب الإشعارات */}
      <div className="px-4 py-[14px] rounded-[14px] bg-[rgba(59,126,246,0.06)] border border-[rgba(59,126,246,0.15)] flex items-center gap-[14px]">
        <span className="text-[24px]">🔔</span>
        <div className="flex-1">
          <div className="text-[13px] font-extrabold text-[var(--text-primary)] mb-0.5">
            {t('onboard_notifications_title')}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] leading-[1.5]">
            {t('onboard_notifications_desc')}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            try { if ('Notification' in window) await Notification.requestPermission() } catch {}
          }}
          className="px-[14px] py-2 rounded-[10px] border-none bg-[var(--accent-blue)] text-white text-[12px] font-bold cursor-pointer font-[inherit] whitespace-nowrap"
        >
          {t('onboard_allow')}
        </button>
      </div>

      {/* زر الدخول */}
      <button
        type="button"
        onClick={onGo}
        className="w-full py-[15px] rounded-[14px] border-none bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-green)] text-white text-[16px] font-black cursor-pointer font-[inherit] transition-transform duration-150 mt-1 hover:scale-[1.02] active:scale-[1]"
      >
        {t('onboard_start_journey')}
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { lang, t, tCategory } = useI18n()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profile, setProfile] = useState<Profile>({ fullName: '', monthlyIncome: '', currency: 'JOD' })
  const [tx, setTx] = useState<FirstTransaction>({ type: 'expense', amount: '', category: '', description: '' })
  const [detectedInfo, setDetectedInfo] = useState<DetectionResult | null>(null)
  const ar = lang === 'ar'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingProfile(false); return }
      const meta = user.user_metadata
      const { data } = await supabase.from('profiles').select('full_name,monthly_income,currency').eq('id', user.id).single()
      const detected = detectCurrency()
      setDetectedInfo(detected)
      setProfile({
        fullName: data?.full_name ?? meta?.full_name ?? '',
        monthlyIncome: data?.monthly_income?.toString() ?? meta?.monthly_income?.toString() ?? '',
        currency: data?.currency ?? detected.currency,
      })
      setLoadingProfile(false)
    }
    load()
  }, [supabase])

  async function handleStep1() {
    if (saving) return
    setSaving(true)
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr) { alert('Auth error: ' + authErr.message); return }
      if (!user) { alert('No user found!'); return }
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.fullName,
        monthly_income: profile.monthlyIncome ? parseFloat(profile.monthlyIncome) : null,
        currency: profile.currency,
        onboarding_done: false,
      })
      if (upsertErr) { alert('خطأ في حفظ البيانات: ' + upsertErr.message); return }
      if (profile.monthlyIncome && parseFloat(profile.monthlyIncome) > 0) {
        await supabase.from('transactions').delete().eq('user_id', user.id).eq('category', 'راتب')
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'income',
          amount: parseFloat(profile.monthlyIncome),
          category: 'راتب',
          description: profile.fullName ? `راتب ${profile.fullName}` : 'الراتب الشهري',
          transaction_date: new Date().toISOString().split('T')[0],
        })
      }
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  async function handleStep2() {
    if (tx.amount && tx.category) {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('transactions').insert({ user_id: user.id, type: tx.type, amount: parseFloat(tx.amount), category: tx.category, description: tx.description || null, transaction_date: new Date().toISOString().split('T')[0] })
      }
      setSaving(false)
    }
    setStep(3)
  }

  async function handleDone() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch('/api/gamification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ user_id: user.id }),
          })
        }
      } catch {}
    }
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    } catch {}
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4 py-6 ${ar ? 'rtl' : 'ltr'}`}>
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,126,246,0.08)_0%,transparent_70%)] z-0" />
      <div className="w-full max-w-[420px] relative z-[1]">
        <div className="text-center mb-7">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue)] flex items-center justify-center text-white font-black text-[18px] mx-auto mb-2">ف</div>
          <span className="text-[13px] text-[var(--text-muted)] font-semibold">
            {t('onboard_step_count').replace('{}', step.toString())}
          </span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] px-6 py-7 shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
          <ProgressBar step={step} />
          <StepDots current={step} />
          {step === 1 && <Step1 profile={profile} setProfile={setProfile} onNext={handleStep1} loading={loadingProfile} saving={saving} t={t} detectedInfo={detectedInfo} />}
          {step === 2 && <Step2 tx={tx} setTx={setTx} onNext={handleStep2} onBack={() => setStep(1)} saving={saving} t={t} tCategory={tCategory} />}
          {step === 3 && <Step3 onGo={handleDone} t={t} name={profile.fullName} />}
        </div>
      </div>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}
