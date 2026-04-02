'use client'
import { useState, useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'

const INSTALL_KEY = 'fajrak_install_dismissed'
const INSTALL_DATE_KEY = 'fajrak_install_dismissed_date'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export function InstallPrompt() {
  const { lang, t } = useI18n()
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [mounted, setMounted] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
    const dismissed = localStorage.getItem(INSTALL_KEY)
    const dismissedDate = localStorage.getItem(INSTALL_DATE_KEY)
    
    // إذا ثبّت أو رفض مؤخراً — لا تظهر أبداً ولا تعترض الحدث
    if (dismissed === 'true') return
    if (dismissed === 'dismissed' && dismissedDate) {
      const daysPassed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24)
      if (daysPassed < 7) return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = (navigator as any).standalone
    setIsIOS(ios)

    // iOS — يظهر تعليمات يدوية (لا يحتاج beforeinstallprompt)
    if (ios && !standalone) {
      timerRef.current = setTimeout(() => setShow(true), 4000)
      return
    }

    // Android/Desktop — يستخدم beforeinstallprompt
    const handler = (e: any) => {
      // فقط إذا لم نكن بالفعل بوضع standalone
      if (window.matchMedia('(display-mode: standalone)').matches) return

      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      
      // تأخير الظهور قليلاً لضمان عدم إزعاج المستخدم فوراً
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setShow(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleInstall() {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt()
      const { outcome } = await deferredPrompt.current.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(INSTALL_KEY, 'true')
      }
      deferredPrompt.current = null
    }
    setShow(false)
  }

  function handleDismiss() {
    localStorage.setItem(INSTALL_KEY, 'dismissed')
    localStorage.setItem(INSTALL_DATE_KEY, Date.now().toString())
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
            {t('install_ios')}
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
            {t('install_btn')}
          </button>
        )}
        <button onClick={handleDismiss} style={{
          padding: '8px 14px', borderRadius: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {t('install_later')}
        </button>
      </div>
    </div>
  )
}
