'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

export function Section({ id, title, icon, defaultOpen = false, children }: {
  id: string
  title: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const STORAGE_KEY = `dash_section_${id}`
  const [open, setOpen] = useState(defaultOpen)
  const { t } = useI18n()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) setOpen(saved === 'true')
    } catch { }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { }
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`section-${id}`}
        aria-label={`${open ? t('section_collapse') : t('section_expand')} ${title}`}
        style={{
          width: '100%', padding: '12px 16px',
          background: open ? 'var(--bg-elevated)' : 'var(--bg-card)',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <span style={{
          fontSize: 12, color: 'var(--text-muted)', fontWeight: 700,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease', display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div id={`section-${id}`} style={{ padding: '0 0 4px 0', background: 'var(--bg-primary)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
