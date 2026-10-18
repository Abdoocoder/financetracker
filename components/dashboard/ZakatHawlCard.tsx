'use client'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import styles from './ZakatHawlCard.module.css'

/** Total days in the Islamic (lunar) year — the haul period. */
const HAUL_DAYS = 354

export type HawlTone = 'safe' | 'soon' | 'urgent' | 'overdue' | 'below'

/** Color bands: green > 60, orange 7–60, red <= 7, muted when below Nisab. */
export function hawlTone(daysRemaining: number | null): HawlTone {
  if (daysRemaining === null) return 'below'
  if (daysRemaining <= 0) return 'overdue'
  if (daysRemaining <= 7) return 'urgent'
  if (daysRemaining <= 60) return 'soon'
  return 'safe'
}

const RING_R = 30
const RING_CIRC = 2 * Math.PI * RING_R
const TONE_RING_COLOR: Record<Exclude<HawlTone, 'below' | 'overdue'>, string> = {
  safe: 'var(--accent-green-light, #10b981)',
  soon: 'var(--accent-orange-light, #f59e0b)',
  urgent: 'var(--accent-red-light, #ef4444)',
}

interface Props {
  /** Days left until the current haul is due; null when below Nisab. */
  daysRemaining: number | null
  /** Estimated Zakat amount due this haul (local currency). */
  zakatDue: number
  currency: string
}

export function ZakatHawlCard({ daysRemaining, zakatDue, currency }: Props) {
  const { t } = useI18n()
  const tone = hawlTone(daysRemaining)
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 2 })

  return (
    <div
      className={`${styles.card} ${styles[`tone-${tone}`] ?? ''}`}
      data-testid="zakat-hawl-card"
      data-tone={tone}
    >
      <div className={styles.header}>
        <span className={styles.emoji} aria-hidden>🌙</span>
        <span className={styles.title}>{t('zakat_hawl_title')}</span>
      </div>

      {tone === 'below' && (
        <div className={styles.belowRow}>
          <div className={styles.belowText}>
            <p className={styles.belowTitle}>{t('zakat_hawl_below_nisab')}</p>
            <p className={styles.belowSub}>{t('zakat_below_nisab')}</p>
          </div>
          <Link href="/dashboard/zakat" className={styles.calcButton}>
            {t('zakat_hawl_calc_btn')}
          </Link>
        </div>
      )}

      {tone === 'overdue' && (
        <div className={styles.overdueRow}>
          <div className={styles.belowText}>
            <p className={styles.overdueText}>{t('zakat_hawl_overdue')}</p>
            <p className={styles.overdueDue}>
              {t('zakat_hawl_due', { amount: fmt(zakatDue), currency })}
            </p>
          </div>
        </div>
      )}

      {(tone === 'safe' || tone === 'soon' || tone === 'urgent') && (
        <div className={styles.countdownRow}>
          <div className={styles.ringWrap}>
            <svg width="72" height="72" viewBox="0 0 72 72" role="presentation">
              <circle
                cx="36" cy="36" r={RING_R}
                fill="none"
                stroke="var(--border-color, rgba(148, 163, 184, 0.25))"
                strokeWidth="6"
              />
              <circle
                cx="36" cy="36" r={RING_R}
                fill="none"
                stroke={TONE_RING_COLOR[tone]}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC * (1 - (daysRemaining ?? 0) / HAUL_DAYS)}
                transform="rotate(-90 36 36)"
              />
            </svg>
            <span className={styles.ringDays}>{daysRemaining}</span>
            <span className={styles.ringLabel}>{t('zakat_days')}</span>
          </div>
          <div className={styles.countdownText}>
            <p className={styles.daysRemaining}>
              {t('zakat_hawl_remaining', { days: daysRemaining ?? 0 })}
            </p>
            <p className={styles.due}>
              {t('zakat_hawl_due', { amount: fmt(zakatDue), currency })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
