'use client'

import { useI18n } from '@/lib/i18n'
import styles from './JourneyRoadmap.module.css'

const stages = [
  { icon: '📝', titleKey: 'land_j1_title', descKey: 'land_j1_desc' },
  { icon: '🔍', titleKey: 'land_j2_title', descKey: 'land_j2_desc' },
  { icon: '🎯', titleKey: 'land_j3_title', descKey: 'land_j3_desc' },
  { icon: '📊', titleKey: 'land_j4_title', descKey: 'land_j4_desc' },
  { icon: '🚀', titleKey: 'land_j5_title', descKey: 'land_j5_desc' },
]

export default function JourneyRoadmap() {
  const { t } = useI18n()

  return (
    <section className={styles.journey}>
      <div className={styles.track}>
        {stages.map((s, i) => (
          <div key={i} className={styles.step}>
            <div className={`${styles.stepNum} ${i < 3 ? styles.stepNumActive : styles.stepNumInactive}`}>
              {i + 1}
            </div>
            <div className={styles.stepIcon}>{s.icon}</div>
            <h3 className={styles.stepTitle}>{t(s.titleKey)}</h3>
            <p className={styles.stepDesc}>{t(s.descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
