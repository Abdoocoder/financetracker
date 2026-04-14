'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { QuickAdd } from '@/components/ui/quick-add'
import { useI18n } from '@/lib/i18n'
import { clearUserCache } from '@/lib/cache'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'

export function GlobalFAB() {
  const [open, setOpen] = useState(false)
  const { lang, t } = useI18n()
  const { user } = useUser()
  const supabase = createClient()

  // Close on back gesture / escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleAdded = useCallback(async () => {
    if (user) clearUserCache(user.id)
    // Allow QuickAdd to show its success state, then close
    setTimeout(() => setOpen(false), 1400)
  }, [user])

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t('fab_add_tx')}
        className="global-fab"
        style={{
          position: 'fixed',
          bottom: 'max(82px, calc(72px + env(safe-area-inset-bottom)))',
          insetInlineEnd: 20,
          zIndex: 90,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--accent-blue)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(59,126,246,0.45), 0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          color: 'white',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(59,126,246,0.6), 0 2px 10px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,126,246,0.45), 0 2px 8px rgba(0,0,0,0.3)'
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            animation: 'fabFadeIn 0.2s ease',
          }}
        />
      )}

      {/* Bottom Sheet */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: 301,
            background: 'var(--bg-secondary)',
            borderRadius: '24px 24px 0 0',
            borderTop: '1px solid var(--border-light)',
            padding: '0 16px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            animation: 'fabSlideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            maxHeight: '90dvh',
            overflowY: 'auto',
          }}
        >
          {/* Handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.15)',
            margin: '14px auto 4px',
          }} />

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 4px 12px',
          }}>
            <span style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-black)', color: 'var(--text-primary)' }}>
              {t('fab_title')}
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <QuickAdd onAdded={handleAdded} />
        </div>
      )}

      <style>{`
        @keyframes fabFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fabSlideUp {
          from { opacity: 0.6; transform: translateY(32px); }
          to   { opacity: 1;   transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .global-fab { display: none !important; }
        }
      `}</style>
    </>
  )
}
