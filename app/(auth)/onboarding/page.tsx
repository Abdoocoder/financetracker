'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
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
    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))', borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function StepDots({ current }: { current: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
      {([1, 2, 3] as Step[]).map(s => (
        <div key={s} style={{ height: 6, width: current === s ? 24 : 6, borderRadius: 3, background: current === s ? 'var(--accent-blue)' : current > s ? 'var(--accent-green)' : 'var(--border)', transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)' }} />
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s', ...props.style }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  )
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer', ...props.style }} />
  )
}

function BudgetPreview({ income, t }: { income: number; t: any }) {
  const { lang } = useI18n()
  const ar = lang === 'ar'
  if (income <= 0) return null
  const needs = Math.round(income * 0.5)
  const wants = Math.round(income * 0.3)
  const savings = Math.round(income * 0.2)
  return (
    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', animation: 'fadeSlideIn 0.3s ease' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>
        {t('onboard_suggested_budget')}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: 6, background: 'var(--accent-blue-dim)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>{needs}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>{t('onboard_needs')}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: 6, background: 'var(--accent-purple-dim)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-purple-light)', fontFamily: 'monospace' }}>{wants}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>{t('onboard_wants')}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: 6, background: 'var(--accent-green-dim)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-green-light)', fontFamily: 'monospace' }}>{savings}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>{t('onboard_savings')}</div>
        </div>
      </div>
    </div>
  )
}

// ── Step 1: الملف الشخصي ─────────────────────────────
function Step1({ profile, setProfile, onNext, loading, t, detectedInfo }: {
  profile: Profile
  setProfile: React.Dispatch<React.SetStateAction<Profile>>
  onNext: () => void
  loading: boolean
  t: any
  detectedInfo: DetectionResult | null
}) {
  const { lang } = useI18n()
  const ar = lang === 'ar'
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[80, 56, 56, 56].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />)}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--accent-blue-dim)', border: '1px solid rgba(59,126,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>👋</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
          {t('onboarding_welcome_title')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
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
        onClick={onNext}
        disabled={profile.fullName.trim().length === 0}
        style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'var(--accent-blue)', color: 'white', fontSize: 15, fontWeight: 700, cursor: profile.fullName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginTop: 8, opacity: profile.fullName.trim() ? 1 : 0.5, transition: 'opacity 0.15s' }}
      >
        {t('onboard_next_arrow')}
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
  const { lang } = useI18n()
  const ar = lang === 'ar'
  const categories = tx.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: tx.type === 'income' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)', border: `1px solid ${tx.type === 'income' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', transition: 'all 0.3s' }}>
          {tx.type === 'income' ? '💰' : '💸'}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
          {t('onboard_first_tx_title')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          {t('onboard_first_tx_subtitle')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 4, borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {(['income', 'expense'] as const).map(type => (
          <button key={type} onClick={() => setTx(t => ({ ...t, type, category: '' }))} style={{ flex: 1, padding: '10px', borderRadius: 11, border: 'none', background: tx.type === type ? (type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)') : 'transparent', color: tx.type === type ? 'white' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
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

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onBack} style={{ padding: '14px 20px', borderRadius: 14, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('onboard_back_arrow')}
        </button>
        <button onClick={onNext} disabled={saving || !tx.amount || !tx.category} style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: tx.type === 'income' ? 'var(--accent-green)' : 'var(--accent-blue)', color: 'white', fontSize: 15, fontWeight: 700, cursor: saving || !tx.amount || !tx.category ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving || !tx.amount || !tx.category ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {saving ? '⏳' : t('onboard_save_continue')}
        </button>
      </div>
      <button onClick={onNext} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', textAlign: 'center', padding: '4px' }}>
        {t('onboard_skip_now')}
      </button>
    </div>
  )
}

// ── Step 3: الترحيب ──────────────────────────────────
function Step3({ onGo, t, name }: { onGo: () => void; t: any; name: string }) {
  const firstName = name.split(' ')[0] || (t('onboard_income_label').includes('income') ? 'you' : 'بك')

  const journey = [
    { icon: '🌱', level: t('onboard_journey_beginner'),      desc: t('onboard_journey_beginner_desc'),             active: true },
    { icon: '💪', level: t('onboard_journey_saver'),           desc: t('onboard_journey_saver_desc'),       active: false },
    { icon: '📈', level: t('onboard_journey_investor'),      desc: t('onboard_journey_investor_desc'),            active: false },
    { icon: '👑', level: t('onboard_journey_free'),        desc: t('onboard_journey_free_desc'), active: false },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: 'pop 0.5s ease' }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
          {t('onboard_welcome_named').replace('{}', firstName)}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.6 }}>
          {t('onboard_ready_desc')}
        </p>
      </div>

      {/* رحلة الثروة */}
      <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.06), rgba(16,185,129,0.04))', border: '1px solid rgba(59,126,246,0.15)', borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          {t('onboard_journey_title')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          {journey.map((j, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4, opacity: j.active ? 1 : 0.35 }}>{j.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: j.active ? 'var(--accent-blue-light)' : 'var(--text-muted)' }}>{j.level}</div>
              {i < journey.length - 1 && (
                <div style={{ position: 'absolute' }} />
              )}
            </div>
          ))}
        </div>
        {/* شريط التقدم */}
        <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '5%', background: 'var(--accent-blue)', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
          {t('onboard_journey_tip')}
        </div>
      </div>

      {/* طلب الإشعارات */}
      <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 24 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            {t('onboard_notifications_title')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('onboard_notifications_desc')}
          </div>
        </div>
        <button onClick={async () => {
          try { if ('Notification' in window) await Notification.requestPermission() } catch {}
        }} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          {t('onboard_allow')}
        </button>
      </div>

      {/* زر الدخول */}
      <button
        onClick={onGo}
        style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.15s', marginTop: 4 }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {t('onboard_start_journey')}
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { lang, t, tCategory, hydrated } = useI18n()
  const supabase = createClient()
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
      // اكتشاف العملة تلقائياً للمستخدمين الجدد فقط
      const detected = detectCurrency()
      const savedCurrency = data?.currency
      setDetectedInfo(detected)
      setProfile({
        fullName: data?.full_name ?? meta?.full_name ?? '',
        monthlyIncome: data?.monthly_income?.toString() ?? meta?.monthly_income?.toString() ?? '',
        currency: savedCurrency ?? detected.currency,
      })
      setLoadingProfile(false)
    }
    load()
  }, [supabase])

  async function handleStep1() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr) { alert('Auth error: ' + authErr.message); return }
    if (!user) { alert('No user found!'); return }
    const { error: upsertErr } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      full_name: profile.fullName, 
      monthly_income: profile.monthlyIncome ? parseFloat(profile.monthlyIncome) : null, 
      currency: profile.currency, 
      onboarding_done: false 
    })
    if (upsertErr) { alert('خطأ في حفظ البيانات: ' + upsertErr.message); return }
    // إضافة الراتب كمعاملة دخل تلقائياً
    if (profile.monthlyIncome && parseFloat(profile.monthlyIncome) > 0) {
      // حذف الراتب القديم لهذا المستخدم لمنع التكرار في حال دخل الصفحة مرتين
      await supabase.from('transactions')
        .delete()
        .eq('user_id', user.id)
        .eq('category', 'راتب')

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'income',
        amount: parseFloat(profile.monthlyIncome),
        category: 'راتب',
        description: profile.fullName ? `راتب ${profile.fullName}` : 'الراتب الشهري',
        transaction_date: new Date().toISOString().split('T')[0]
      })
    }
    setStep(2)
  }

  async function handleStep2() {

// تحقق من تكرار الراتب
    if (tx.category === 'راتب' && tx.type === 'income' && profile.monthlyIncome && parseFloat(tx.amount) === parseFloat(profile.monthlyIncome)) {
      const confirmed = window.confirm(`أضفنا راتبك ${profile.monthlyIncome} بالفعل. هل تريد إضافة راتب آخر؟`)
      if (!confirmed) { setStep(3); return }
    }


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
      // تهيئة الـ gamification
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', direction: ar ? 'rtl' : 'ltr' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,126,246,0.08) 0%, transparent 70%)', zIndex: 0 }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 18, margin: '0 auto 8px' }}>ف</div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {t('onboard_step_count').replace('{}', step.toString())}
          </span>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: '28px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
          <ProgressBar step={step} />
          <StepDots current={step} />
          {step === 1 && <Step1 profile={profile} setProfile={setProfile} onNext={handleStep1} loading={loadingProfile} t={t} detectedInfo={detectedInfo} />}
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
