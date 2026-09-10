'use client'

import { useI18n } from '@/lib/i18n'
import styles from './DashboardPreview.module.css'

export default function DashboardPreview() {
  const { t } = useI18n()

  const bars = [
    { h: '35%', cls: styles.previewBarBlue },
    { h: '55%', cls: styles.previewBarGreen },
    { h: '42%', cls: styles.previewBarBlue },
    { h: '68%', cls: styles.previewBarGreen },
    { h: '30%', cls: styles.previewBarAmber },
    { h: '75%', cls: styles.previewBarBlue },
    { h: '50%', cls: styles.previewBarGreen },
    { h: '85%', cls: styles.previewBarBlue },
    { h: '60%', cls: styles.previewBarGreen },
    { h: '45%', cls: styles.previewBarAmber },
    { h: '70%', cls: styles.previewBarBlue },
    { h: '90%', cls: styles.previewBarGreen },
  ]

  return (
    <section className={styles.preview}>
      <div className={styles.previewFrame}>
        <div className={styles.previewToolbar}>
          <span className={`${styles.previewDot} ${styles.previewDotRed}`} />
          <span className={`${styles.previewDot} ${styles.previewDotYellow}`} />
          <span className={`${styles.previewDot} ${styles.previewDotGreen}`} />
          <span className={styles.previewUrl}>fajrak.com</span>
        </div>
        <div className={styles.previewBody}>
          <div className={styles.previewCard}>
            <div className={styles.previewCardLabel}>{t('land_preview_net_worth')}</div>
            <div className={`${styles.previewCardValue} ${styles.previewCardValueGreen}`}>١٢,٤٥٠</div>
            <div className={styles.previewCardSub}>KWD</div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewCardLabel}>{t('land_preview_monthly')}</div>
            <div className={`${styles.previewCardValue} ${styles.previewCardValueBlue}`}>٨,٢٠٠</div>
            <div className={styles.previewCardSub}>{t('land_preview_expenses')}</div>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewCardLabel}>{t('land_preview_savings')}</div>
            <div className={`${styles.previewCardValue} ${styles.previewCardValueAmber}`}>٢٨%</div>
            <div className={styles.previewCardSub}>{t('land_preview_rate')}</div>
          </div>
          <div className={styles.previewChart}>
            {bars.map((bar, i) => (
              <div key={i} className={`${styles.previewBar} ${bar.cls}`} style={{ height: bar.h }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
