'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'

const WELCOME_KEY = 'fajrak_welcome_shown'

export function WelcomeModal() {
  const { lang, t } = useI18n()
  const { user } = useUser()
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => { setMounted(true) }, [])
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

  if (!mounted || !show) return null

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
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 30, fontWeight: 900, color: 'white', boxShadow: '0 8px 32px rgba(59,126,246,0.4)' }}>{t('app_name')[0]}</div>

        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
          {name ? `${t('dash_greeting')} ${name} 👋` : `${t('onboard_welcome')}`}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
          {t('onboard_subtitle')}
        </div>

        {/* الخطوات */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, textAlign: lang === 'ar' ? 'right' : 'left' }}>
          {[
            { icon: '💸', key: 'welcome_step_1' },
            { icon: '🎯', key: 'welcome_step_2' },
            { icon: '📈', key: 'welcome_step_3' },
            { icon: '🕌', key: 'welcome_step_4' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--bg-elevated)' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{t(item.key)}</span>
            </div>
          ))}
        </div>

        <button onClick={handleStart} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          background: 'var(--accent-blue)', border: 'none',
          color: 'white', fontSize: 15, fontWeight: 900, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(59,126,246,0.4)',
        }}>
          {t('onboard_start')}
        </button>

        <button onClick={handleStart} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('onboard_skip_tour')}
        </button>
      </div>
    </div>
  )
}
