'use client'
import { AlertTriangle } from 'lucide-react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({ title, message, confirmLabel = 'حذف', cancelLabel = 'إلغاء', onConfirm, onCancel, danger = true }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />

      {/* Dialog */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        background: 'var(--bg-secondary)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid var(--border)',
        padding: '24px 20px',
        paddingBottom: 'max(44px, env(safe-area-inset-bottom, 44px))',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />

        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: danger ? 'rgba(239,68,68,0.12)' : 'var(--accent-blue-dim)',
            border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(59,126,246,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={26} color={danger ? '#F87171' : 'var(--accent-blue-light)'} />
          </div>
        </div>

        {/* Text */}
        <h3 style={{ textAlign: 'center', fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>{message}</p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onConfirm} style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: danger ? 'rgba(239,68,68,0.15)' : 'var(--accent-blue-dim)',
            border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(59,126,246,0.3)'}`,
            color: danger ? '#F87171' : 'var(--accent-blue-light)',
            fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>{confirmLabel}</button>
          <button onClick={onCancel} style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{cancelLabel}</button>
        </div>
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  )
}
