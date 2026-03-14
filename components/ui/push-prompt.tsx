'use client'
import { useState, useEffect } from 'react'
import { usePush } from '@/lib/use-push'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'

const PROMPT_KEY = 'push_prompt_shown'

export function PushPrompt() {
  const { supported, subscribed, loading, subscribe } = usePush()
  const [show, setShow] = useState(false)
  const { lang } = useI18n()

  useEffect(() => {
    // نعرضه فقط إذا:
    // 1. المتصفح يدعم الإشعارات
    // 2. لم يشترك بعد
    // 3. لم يرفض أو يقبل سابقاً
    if (!supported || subscribed) return
    try {
      const shown = localStorage.getItem(PROMPT_KEY)
      if (shown) return
    } catch {}
    // نأخر الظهور 3 ثوان عشان يتحمل الداشبورد أولاً
    const timer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(timer)
  }, [supported, subscribed])

  if (!show) return null

  async function handleAllow() {
    setShow(false)
    try { localStorage.setItem(PROMPT_KEY, 'true') } catch {}
    const result = await subscribe()
    if (result?.ok) toast.success(lang === 'en' ? '✅ Notifications enabled!' : '✅ تم تفعيل الإشعارات!')
    else if (result?.reason === 'permission_denied') {
      toast.error(lang === 'en' ? 'Allow notifications in settings' : 'فعّل الإشعارات من الإعدادات')
    }
  }

  function handleDismiss() {
    setShow(false)
    try { localStorage.setItem(PROMPT_KEY, 'dismissed') } catch {}
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 999,
      background: 'var(--bg-card)',
      border: '1px solid rgba(59,126,246,0.3)',
      borderRadius: 20,
      padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.3s ease',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* أيقونة */}
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: 'rgba(59,126,246,0.12)',
        border: '1px solid rgba(59,126,246,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>🔔</div>

      {/* النص */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 3 }}>
          {lang === 'en' ? 'Enable Notifications?' : 'تفعيل الإشعارات؟'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {lang === 'en' ? 'Get daily alerts — enable sound in app settings for best experience' : 'تنبيهات يومية — فعّل صوت الإشعارات من إعدادات التطبيق للحصول على أفضل تجربة'}
        </div>
      </div>

      {/* الأزرار */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleAllow}
          disabled={loading}
          style={{
            padding: '7px 14px', borderRadius: 10,
            background: 'var(--accent-blue)', border: 'none',
            color: 'white', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '...' : (lang === 'en' ? 'Allow' : 'السماح')}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '7px 14px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {lang === 'en' ? 'Later' : 'لاحقاً'}
        </button>
      </div>
    </div>
  )
}
