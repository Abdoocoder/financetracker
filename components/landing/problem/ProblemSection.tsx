'use client'

import { useI18n } from '@/lib/i18n'
import { ArrowRight } from 'lucide-react'
import styles from './ProblemSection.module.css'

const problems = [
  { iconKey: '💸', titleKey: 'land_p1_title', descKey: 'land_p1_desc' },
  { iconKey: '📊', titleKey: 'land_p2_title', descKey: 'land_p2_desc' },
  { iconKey: '📈', titleKey: 'land_p3_title', descKey: 'land_p3_desc' },
]

const solutions = [
  { iconKey: '🏆', titleKey: 'land_s1_title', descKey: 'land_s1_desc' },
  { iconKey: '🧠', titleKey: 'land_s2_title', descKey: 'land_s2_desc' },
  { iconKey: '🕌', titleKey: 'land_s3_title', descKey: 'land_s3_desc' },
]

export default function ProblemSection() {
  const { t } = useI18n()

  return (
    <section className={styles.problem}>
      <div className={styles.grid}>
        <div className={styles.problemSide}>
          {problems.map((p, i) => (
            <div key={i} className={`${styles.card} ${styles.cardProblem}`}>
              <div className={`${styles.cardIcon} ${styles.iconProblem}`}>{p.iconKey}</div>
              <h3 className={styles.cardTitle}>{t(p.titleKey)}</h3>
              <p className={styles.cardDesc}>{t(p.descKey)}</p>
            </div>
          ))}
        </div>

        <div className={styles.solutionSide}>
          <div className={styles.arrow}>
            <ArrowRight size={24} />
          </div>
          {solutions.map((s, i) => (
            <div key={i} className={`${styles.card} ${styles.cardSolution}`}>
              <div className={`${styles.cardIcon} ${styles.iconSolution}`}>{s.iconKey}</div>
              <h3 className={styles.cardTitle}>{t(s.titleKey)}</h3>
              <p className={styles.cardDesc}>{t(s.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
