'use client'
import { useState } from 'react'
import { CARD_CONFIGS, type CardId } from '@/hooks/useDashboardLayout'
import { useI18n } from '@/lib/i18n'

interface Props {
  visibility: Record<CardId, boolean>
  onToggle: (id: CardId) => void
  onReset: () => void
  lang: string
}

export function DashboardCustomizer({ visibility, onToggle, onReset, lang }: Props) {
  const [open, setOpen] = useState(false)
  const { t, lang: currentLang } = useI18n()
  const isAr = currentLang === 'ar'

  const visibleCount = CARD_CONFIGS.filter(c => !c.required && visibility[c.id]).length
  const totalOptional = CARD_CONFIGS.filter(c => !c.required).length

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t('dash_customize_title')}
        title={t('dash_customize_title')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          borderRadius: 10,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          color: '#818CF8',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ⚙️ {t('dash_customize')}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border)',
              padding: 24,
              width: '100%',
              maxWidth: 420,
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>
                  {t('dash_customize_title')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('dash_customize_count', { n: visibleCount, total: totalOptional })}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Card list */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CARD_CONFIGS.map(card => {
                const on = visibility[card.id]
                const label = isAr ? card.labelAr : card.labelEn
                return (
                  <div
                    key={card.id}
                    onClick={() => !card.required && onToggle(card.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: on ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
                      border: `1px solid ${on ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
                      cursor: card.required ? 'default' : 'pointer',
                      transition: 'background 0.15s',
                      opacity: card.required ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: on ? '#818CF8' : 'var(--text-muted)',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {label}
                      </span>
                      {card.required && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                          ({t('dash_required')})
                        </span>
                      )}
                    </div>

                    {/* Toggle switch */}
                    {!card.required && (
                      <div
                        role="switch"
                        aria-checked={on}
                        aria-label={label}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: on ? '#818CF8' : 'var(--border)',
                          position: 'relative',
                          flexShrink: 0,
                          transition: 'background 0.2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 3,
                          [isAr ? 'right' : 'left']: on ? (isAr ? 3 : 19) : (isAr ? 19 : 3),
                          width: 14, height: 14, borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s, right 0.2s',
                        }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
<button
                 onClick={onReset}
                 aria-label={t('dash_reset')}
                 style={{
                  flex: 1, padding: '9px 0', borderRadius: 10,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t('dash_reset')}
              </button>
<button
                 onClick={() => setOpen(false)}
                 aria-label={t('dash_done')}
                 style={{
                  flex: 2, padding: '9px 0', borderRadius: 10,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818CF8',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}
              >
                {isAr ? `✓ ${t('dash_done')}` : `✓ ${t('dash_done')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
