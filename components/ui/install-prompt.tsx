'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

const INSTALL_KEY = 'fajrak_install_dismissed'

export function InstallPrompt() {
  const { lang } = useI18n()
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const dismissed = localStorage.getItem(INSTALL_KEY)
    if (dismissed) return

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = (navigator as any).standalone
    setIsIOS(ios)

    // iOS — يظهر تعليمات يدوية
    if (ios && !standalone) {
      setTimeout(() => setShow(true), 3000)
      return
    }

    // Android/Desktop — يستخدم beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(INSTALL_KEY, 'true')
      }
      setDeferredPrompt(null)
    }
    setShow(false)
  }

  function handleDismiss() {
    localStorage.setItem(INSTALL_KEY, 'dismissed')
    setShow(false)
  }

  if (!mounted || !show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 9990,
      background: 'var(--bg-card)',
      border: '1px solid rgba(59,126,246,0.3)',
      borderRadius: 20, padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.3s ease',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* أيقونة */}
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: 'var(--accent-blue)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 900, color: 'white',
        boxShadow: '0 4px 16px rgba(59,126,246,0.4)',
      }}>ف</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 3 }}>
          {lang === 'ar' ? '📱 أضف فجرك لهاتفك' : '📱 Add Fajrak to your phone'}
        </div>
        {isIOS ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {lang === 'ar'
              ? 'اضغط على زر المشاركة ⬆️ ثم "إضافة إلى الشاشة الرئيسية"'
              : 'Tap the share button ⬆️ then "Add to Home Screen"'}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {lang === 'ar'
              ? 'تجربة أفضل وأسرع — مثل التطبيقات العادية'
              : 'Better and faster experience — like native apps'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {!isIOS && (
          <button onClick={handleInstall} style={{
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent-blue)', border: 'none',
            color: 'white', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'ar' ? 'تثبيت' : 'Install'}
          </button>
        )}
        <button onClick={handleDismiss} style={{
          padding: '8px 14px', borderRadius: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {lang === 'ar' ? 'لاحقاً' : 'Later'}
        </button>
      </div>
    </div>
  )
}
