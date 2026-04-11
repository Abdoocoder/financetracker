'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

interface CalculatorDisclaimerProps {
  storageKey: string
}

export function CalculatorDisclaimer({ storageKey }: CalculatorDisclaimerProps) {
  const { currentLang } = useI18n()
  const isAr = currentLang === 'ar'
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const hidden = localStorage.getItem(storageKey)
    setDismissed(!!hidden)
  }, [storageKey])

  function dismiss(permanent: boolean) {
    setDismissed(true)
    if (permanent) localStorage.setItem(storageKey, 'true')
  }

  if (!mounted || dismissed) return null

  return (
    <div style={{
      background: 'rgba(251,191,36,0.08)',
      border: '1px solid rgba(251,191,36,0.3)',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 20,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      direction: isAr ? 'rtl' : 'ltr',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {isAr
            ? 'النتائج تقديرية للتوعية المالية فقط وليست نصيحة مالية أو قانونية أو شرعية. استشر متخصصاً قبل اتخاذ أي قرار مالي.'
            : 'Results are estimates for financial awareness only and do not constitute financial, legal, or religious advice. Consult a qualified professional before making any financial decision.'}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => dismiss(true)}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {isAr ? 'لا تظهر مجدداً' : "Don't show again"}
          </button>
          <button
            onClick={() => dismiss(false)}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {isAr ? '✕ إخفاء' : '✕ Dismiss'}
          </button>
        </div>
      </div>
    </div>
  )
}
