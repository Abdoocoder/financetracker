'use client'
import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

// ✅ default context آمن — لا يرمي error
const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-3), { id, type, message }])
    setTimeout(() => remove(id), 3500)
  }, [remove])

  const success = useCallback((m: string) => toast(m, 'success'), [toast])
  const error   = useCallback((m: string) => toast(m, 'error'),   [toast])
  const warning = useCallback((m: string) => toast(m, 'warning'), [toast])
  const info    = useCallback((m: string) => toast(m, 'info'),    [toast])

  const icons: Record<ToastType, string> = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
  }

  const styles: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', color: '#34d399' },
    error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',  color: '#f87171' },
    warning: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', color: '#fbbf24' },
    info:    { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)', color: '#60a5fa' },
  }

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
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
            background: styles[t.type].bg, border: `1px solid ${styles[t.type].border}`,
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            pointerEvents: 'auto', cursor: 'pointer',
            animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
            fontFamily: 'var(--font-cairo), sans-serif',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{icons[t.type]}</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: styles[t.type].color, flex: 1, lineHeight: 1.4 }}>
              {t.message}
            </span>
            <span style={{ fontSize: '14px', color: styles[t.type].color, opacity: 0.5, flexShrink: 0 }}>✕</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
