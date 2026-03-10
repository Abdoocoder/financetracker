'use client'
import { useState, useCallback, useEffect, useRef } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: string; type: ToastType; message: string }

// Global event system — لا يحتاج Provider
const listeners: Set<(t: ToastItem) => void> = new Set()

export function toast(message: string, type: ToastType = 'info') {
  const item: ToastItem = { id: Math.random().toString(36).slice(2), type, message }
  listeners.forEach(fn => fn(item))
}
toast.success = (m: string) => toast(m, 'success')
toast.error   = (m: string) => toast(m, 'error')
toast.warning = (m: string) => toast(m, 'warning')
toast.info    = (m: string) => toast(m, 'info')

// Hook للاستخدام في الصفحات
export function useToast() {
  return {
    toast,
    success: toast.success,
    error:   toast.error,
    warning: toast.warning,
    info:    toast.info,
  }
}

// Provider — فقط لعرض الـ toasts، لا علاقة له بالـ context
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  useEffect(() => {
    const handler = (item: ToastItem) => {
      setToasts(prev => [...prev.slice(-3), item])
      const timer = setTimeout(() => remove(item.id), 3500)
      timers.current.set(item.id, timer)
    }
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [remove])

  const styles: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', color: '#34d399' },
    error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',  color: '#f87171' },
    warning: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', color: '#fbbf24' },
    info:    { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)', color: '#60a5fa' },
  }
  const icons: Record<ToastType, string> = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
  }

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: '8px',
          width: 'min(92vw, 360px)', pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div key={t.id} onClick={() => remove(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '14px',
              background: styles[t.type].bg,
              border: `1px solid ${styles[t.type].border}`,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              pointerEvents: 'auto', cursor: 'pointer',
              animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
              fontFamily: 'var(--font-cairo), sans-serif',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{icons[t.type]}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: styles[t.type].color, flex: 1, lineHeight: 1.4 }}>
                {t.message}
              </span>
              <span style={{ fontSize: '14px', color: styles[t.type].color, opacity: 0.5 }}>✕</span>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
