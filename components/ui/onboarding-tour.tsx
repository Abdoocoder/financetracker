'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'

const TOUR_KEY = 'fajrak_tour_completed'

const steps = [
  {
    target: 'nav-home',
    ar: { title: '🏠 لوحة التحكم', desc: 'ملخص كامل لوضعك المالي — دخلك، مصاريفك، ديونك، واستثماراتك في مكان واحد.' },
    en: { title: '🏠 Dashboard', desc: 'Complete overview of your finances — income, expenses, debts, and investments in one place.' },
  },
  {
    target: 'nav-transactions',
    ar: { title: '💸 المعاملات', desc: 'سجّل كل دخل ومصروف. التتبع اليومي هو أقوى أداة للوعي المالي.' },
    en: { title: '💸 Transactions', desc: 'Log every income and expense. Daily tracking is the most powerful financial awareness tool.' },
  },
  {
    target: 'nav-debts',
    ar: { title: '💳 الديون', desc: 'تتبع ديونك مع خطة سداد واضحة وشريط تقدم مرئي.' },
    en: { title: '💳 Debts', desc: 'Track your debts with a clear repayment plan and visual progress bar.' },
  },
  {
    target: 'nav-budgets',
    ar: { title: '📊 الميزانية', desc: 'خطط إنفاقك الشهري واحصل على تحليل ذكي وتوصيات فورية.' },
    en: { title: '📊 Budget', desc: 'Plan your monthly spending and get smart analysis and instant recommendations.' },
  },
  {
    target: 'nav-goals',
    ar: { title: '🎯 الأهداف', desc: 'حدد أهداف ادخار واتبع تقدمك. كل هدف مكتوب يرفع احتمال تحقيقه 42%.' },
    en: { title: '🎯 Goals', desc: 'Set savings goals and track your progress. Written goals are 42% more likely to be achieved.' },
  },
  {
    target: 'nav-investments',
    ar: { title: '📈 الاستثمار', desc: 'تتبع محفظتك الاستثمارية مع أسعار حية وحساب الربح والخسارة.' },
    en: { title: '📈 Investments', desc: 'Track your portfolio with live prices and profit/loss calculations.' },
  },
  {
    target: 'nav-learn',
    ar: { title: '📚 تعلّم', desc: 'درس مالي يومي مخصص لمرحلتك — مبني على أبحاث علم السلوك المالي وتعاليم الإسلام.' },
    en: { title: '📚 Learn', desc: 'Daily financial lesson tailored to your stage — based on behavioral finance research and Islamic teachings.' },
  },
  {
    target: 'nav-alerts',
    ar: { title: '🔔 التنبيهات', desc: 'تنبيهات ذكية تصلك يومياً — تحذيرات، إنجازات، ونصائح مالية مخصصة لك.' },
    en: { title: '🔔 Alerts', desc: 'Smart daily alerts — warnings, achievements, and personalized financial tips.' },
  },
]

export function OnboardingTour() {
  const { lang } = useI18n()
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (pathname === '/dashboard') {
      const done = localStorage.getItem(TOUR_KEY)
      if (!done) setTimeout(() => setShow(true), 1000)
    }
  }, [pathname])

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1)
    else complete()
  }

  function complete() {
    localStorage.setItem(TOUR_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  const current = steps[step]
  const info = current[lang as 'ar' | 'en']

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, backdropFilter: 'blur(2px)' }} onClick={complete} />

      {/* Tooltip Card */}
      <div style={{
        position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 32px))',
        background: 'var(--bg-card)', border: '1px solid rgba(59,126,246,0.3)',
        borderRadius: 20, padding: '20px', zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--accent-blue)' : 'var(--border)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
          {info.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          {info.desc}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={complete} style={{
            padding: '9px 16px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            {lang === 'ar' ? 'تخطي' : 'Skip'}
          </button>
          <button onClick={next} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            background: 'var(--accent-blue)', border: 'none',
            color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>
            {step < steps.length - 1
              ? (lang === 'ar' ? `التالي ← (${step + 1}/${steps.length})` : `Next → (${step + 1}/${steps.length})`)
              : (lang === 'ar' ? '🎉 ابدأ رحلتك!' : '🎉 Start your journey!')}
          </button>
        </div>
      </div>
    </>
  )
}
