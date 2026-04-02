'use client'

import { useState, useEffect, useRef } from 'react'
import { CURRENCIES_BY_GROUP, CURRENCY_MAP, type CurrencyGroup } from '@/lib/currencies'

interface CurrencyPickerProps {
  value: string
  onChange: (code: string) => void
  onClose: () => void
  lang?: string
}

const GROUP_LABELS: Record<CurrencyGroup, string> = {
  arabic:  'العملات العربية',
  islamic: 'العملات الإسلامية',
  global:  'العملات العالمية',
}
const GROUP_LABELS_EN: Record<CurrencyGroup, string> = {
  arabic:  'Arabic Currencies',
  islamic: 'Islamic Currencies',
  global:  'Global Currencies',
}

export function CurrencyPicker({ value, onChange, onClose, lang = 'ar' }: CurrencyPickerProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ar = lang === 'ar'

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()

  const groups: CurrencyGroup[] = ['arabic', 'islamic', 'global']

  const filtered = groups.map(group => ({
    group,
    items: CURRENCIES_BY_GROUP[group].filter(c =>
      !q ||
      c.labelAr.includes(q) ||
      c.labelEn.toLowerCase().includes(q) ||
      c.value.toLowerCase().includes(q)
    ),
  })).filter(g => g.items.length > 0)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        width: 'min(420px, 94vw)',
        maxHeight: '80vh',
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={ar ? 'ابحث عن عملة...' : 'Search currency...'}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              {ar ? 'لا توجد نتائج' : 'No results'}
            </div>
          )}
          {filtered.map(({ group, items }) => (
            <div key={group}>
              <div style={{
                padding: '10px 16px 6px',
                fontSize: 11, fontWeight: 800,
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {ar ? GROUP_LABELS[group] : GROUP_LABELS_EN[group]}
              </div>
              {items.map(c => (
                <button
                  key={c.value}
                  onClick={() => { onChange(c.value); onClose() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px', background: value === c.value ? 'var(--accent-blue-dim)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', textAlign: ar ? 'right' : 'left',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (value !== c.value) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseLeave={e => { if (value !== c.value) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Cairo, inherit' }}>
                      {ar ? c.labelAr : c.labelEn}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.value}</span>
                  </span>
                  {value === c.value && (
                    <span style={{ color: 'var(--accent-blue-light)', fontSize: 16, flexShrink: 0 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// مساعد: عرض العملة الحالية كزر يفتح الـ picker
interface CurrencyButtonProps {
  value: string
  onChange: (code: string) => void
  lang?: string
  detectedCountry?: string
}

export function CurrencyButton({ value, onChange, lang = 'ar', detectedCountry }: CurrencyButtonProps) {
  const [open, setOpen] = useState(false)
  const ar = lang === 'ar'
  const info = CURRENCY_MAP[value]

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 12,
            border: '1px solid var(--border)', background: 'var(--bg-secondary)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{info?.flag ?? '🌐'}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Cairo, inherit' }}>
                {ar ? (info?.labelAr ?? value) : (info?.labelEn ?? value)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{value}</span>
            </span>
          </span>
          <span style={{ color: 'var(--accent-blue-light)', fontSize: 13, fontWeight: 700 }}>
            {ar ? 'تغيير' : 'Change'}
          </span>
        </button>
        {detectedCountry && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingInlineStart: 4 }}>
            📍 {ar ? `اكتشفنا أنك في ${detectedCountry}` : `Detected location: ${detectedCountry}`}
          </div>
        )}
      </div>
      {open && (
        <CurrencyPicker
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
          lang={lang}
        />
      )}
    </>
  )
}
