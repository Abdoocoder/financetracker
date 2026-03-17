'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'

const WELCOME_KEY = 'fajrak_welcome_shown'

export function WelcomeModal() {
  const { lang } = useI18n()
  const { user } = useUser()
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    if (!user) return
    const shown = localStorage.getItem(WELCOME_KEY)
    if (!shown) {
      const firstName = user.user_metadata?.full_name?.split(' ')[0] || ''
      setName(firstName)
      setTimeout(() => setShow(true), 500)
    }
  }, [user])

  function handleStart() {
    localStorage.setItem(WELCOME_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
      <div style={{
        width: 'min(400px, 100%)', background: 'var(--bg-card)',
        border: '1px solid rgba(59,126,246,0.2)', borderRadius: 24,
        padding: '32px 24px', textAlign: 'center',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 30, fontWeight: 900, color: 'white', boxShadow: '0 8px 32px rgba(59,126,246,0.4)' }}>ف</div>

        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
          {lang === 'ar' ? `مرحباً${name ? ` ${name}` : ''} 👋` : `Welcome${name ? ` ${name}` : ''} 👋`}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
          {lang === 'ar'
            ? 'فجرك رفيقك في رحلة الحرية المالية. سنشرح لك التطبيق خطوة بخطوة.'
            : 'Fajrak is your companion on the journey to financial freedom. We\'ll walk you through the app step by step.'}
        </div>

        {/* الخطوات */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: lang === 'ar' ? 'right' : 'left' }}>
          {[
            { icon: '💸', ar: 'سجّل دخلك ومصاريفك', en: 'Log your income and expenses' },
            { icon: '🎯', ar: 'حدد أهدافك المالية', en: 'Set your financial goals' },
            { icon: '📈', ar: 'تابع تقدمك يومياً', en: 'Track your progress daily' },
            { icon: '🕌', ar: 'تعلم من الدروس الإسلامية', en: 'Learn from Islamic teachings' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-elevated)' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{item[lang as 'ar' | 'en']}</span>
            </div>
          ))}
        </div>

        <button onClick={handleStart} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: 'var(--accent-blue)', border: 'none',
          color: 'white', fontSize: 15, fontWeight: 900, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(59,126,246,0.4)',
        }}>
          {lang === 'ar' ? '🚀 ابدأ الجولة التعريفية' : '🚀 Start the Tour'}
        </button>

        <button onClick={handleStart} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {lang === 'ar' ? 'تخطي — أنا أعرف كيف أستخدمه' : 'Skip — I know how to use it'}
        </button>
      </div>
    </div>
  )
}
