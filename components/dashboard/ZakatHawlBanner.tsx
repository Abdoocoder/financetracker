'use client'
import { useI18n } from '@/lib/i18n'
import { hawlTone, type HawlTone } from './ZakatHawlCard'

// Per-tone styling mirrors the haul rows on the Zakat page (inline styles are
// the convention there — no CSS module for this screen).
const TONE_STYLE: Record<HawlTone, { bg: string; border: string; color: string }> = {
  safe:    { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', color: '#10B981' },
  soon:    { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', color: '#F59E0B' },
  urgent:  { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.2)',  color: '#EF4444' },
  overdue: { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.2)',  color: '#EF4444' },
  below:   { bg: 'var(--bg-elevated)',    border: 'var(--border)',        color: 'var(--text-muted)' },
}

interface Props {
  /** Days left until the current haul is due; null when below Nisab (hidden). */
  daysRemaining: number | null
  /** Estimated Zakat amount due this haul (local currency). */
  zakatDue: number
  currency: string
}

/** Compact hawl banner shown at the top of the Zakat page. */
export function ZakatHawlBanner({ daysRemaining, zakatDue, currency }: Props) {
  const { t } = useI18n()

  // Below Nisab → no active haul clock → no banner.
  if (daysRemaining === null) return null

  const tone = hawlTone(daysRemaining)
  const s = TONE_STYLE[tone]
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const overdue = tone === 'overdue'
  const message = overdue
    ? `⏰ ${t('zakat_hawl_overdue')} (${t('zakat_hawl_due', { amount: fmt(zakatDue), currency })})`
    : t('zakat_hawl_banner', { days: daysRemaining, amount: fmt(zakatDue), currency })

  return (
    <div
      data-testid="zakat-hawl-banner"
      data-tone={tone}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 14,
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: 13,
        fontWeight: 700,
        color: s.color,
      }}
    >
      <span>{message}</span>
    </div>
  )
}
