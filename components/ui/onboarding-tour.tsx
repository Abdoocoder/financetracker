'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { usePathname } from 'next/navigation'

const TOUR_KEYS: Record<string, string> = {
  '/dashboard':              'tour_dashboard',
  '/dashboard/transactions': 'tour_transactions',
  '/dashboard/debts':        'tour_debts',
  '/dashboard/budgets':      'tour_budgets',
  '/dashboard/goals':        'tour_goals',
  '/dashboard/investments':  'tour_investments',
  '/dashboard/learn':        'tour_learn',
  '/dashboard/alerts':       'tour_alerts',
}

// Map path to translation keys
const TOUR_STEPS: Record<string, { titleKey: string; descKey: string }[]> = {
  '/dashboard': [
    { titleKey: 'tour_dash_t1', descKey: 'tour_dash_d1' },
    { titleKey: 'tour_dash_t2', descKey: 'tour_dash_d2' },
    { titleKey: 'tour_dash_t3', descKey: 'tour_dash_d3' },
    { titleKey: 'tour_dash_t4', descKey: 'tour_dash_d4' },
  ],
  '/dashboard/transactions': [
    { titleKey: 'tour_trans_t1', descKey: 'tour_trans_d1' },
    { titleKey: 'tour_trans_t2', descKey: 'tour_trans_d2' },
    { titleKey: 'tour_trans_t3', descKey: 'tour_trans_d3' },
  ],
  '/dashboard/debts': [
    { titleKey: 'tour_debts_t1', descKey: 'tour_debts_d1' },
    { titleKey: 'tour_debts_t2', descKey: 'tour_debts_d2' },
    { titleKey: 'tour_debts_t3', descKey: 'tour_debts_d3' },
    { titleKey: 'tour_debts_t4', descKey: 'tour_debts_d4' },
  ],
  '/dashboard/budgets': [
    { titleKey: 'tour_budgets_t1', descKey: 'tour_budgets_d1' },
    { titleKey: 'tour_budgets_t2', descKey: 'tour_budgets_d2' },
  ],
  '/dashboard/goals': [
    { titleKey: 'tour_goals_t1', descKey: 'tour_goals_d1' },
    { titleKey: 'tour_goals_t2', descKey: 'tour_goals_d2' },
  ],
  '/dashboard/investments': [
    { titleKey: 'tour_invest_t1', descKey: 'tour_invest_d1' },
    { titleKey: 'tour_invest_t2', descKey: 'tour_invest_d2' },
  ],
  '/dashboard/learn': [
    { titleKey: 'tour_learn_t1', descKey: 'tour_learn_d1' },
    { titleKey: 'tour_learn_t2', descKey: 'tour_learn_d2' },
    { titleKey: 'tour_learn_t3', descKey: 'tour_learn_d3' },
  ],
  '/dashboard/alerts': [
    { titleKey: 'tour_alerts_t1', descKey: 'tour_alerts_d1' },
    { titleKey: 'tour_alerts_t2', descKey: 'tour_alerts_d2' },
  ],
}

export function OnboardingTour() {
  const { lang, t } = useI18n()
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const key = TOUR_KEYS[pathname]
    if (!key) return
    const done = localStorage.getItem(key)
    if (!done) setTimeout(() => { setStep(0); setShow(true) }, 1500)
  }, [pathname])

  const steps = TOUR_STEPS[pathname] ?? []

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1)
    else complete()
  }

  function complete() {
    const key = TOUR_KEYS[pathname]
    if (key) localStorage.setItem(key, 'true')
    setShow(false)
  }

  if (!show || steps.length === 0) return null

  const current = steps[step]
  const isAr = lang === 'ar'

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9998, backdropFilter: 'blur(2px)' }} onClick={complete} />
      <div style={{
        position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 32px))',
        background: 'var(--bg-card)', border: '1px solid rgba(59,126,246,0.3)',
        borderRadius: 20, padding: '20px', zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s ease',
        direction: isAr ? 'rtl' : 'ltr',
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

        <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>{t(current.titleKey)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{t(current.descKey)}</div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={complete} style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {t('tour_skip')}
          </button>
          <button onClick={next} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            {step < steps.length - 1
              ? `${t('tour_next')} ${isAr ? '←' : '→'} (${step + 1}/${steps.length})`
              : t('tour_got_it')}
          </button>
        </div>
      </div>
    </>
  )
}
