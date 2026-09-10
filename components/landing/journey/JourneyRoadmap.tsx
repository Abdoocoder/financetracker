'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { PenIcon, SearchIcon, TargetIcon, BarChartIcon, RocketIcon } from '@/components/landing/shared/Icons'
import styles from './JourneyRoadmap.module.css'

interface Stage {
  icon: React.ComponentType<{ size?: number }>
  titleKey: string
  descKey: string
}

const stages: Stage[] = [
  { icon: PenIcon, titleKey: 'land_j1_title', descKey: 'land_j1_desc' },
  { icon: SearchIcon, titleKey: 'land_j2_title', descKey: 'land_j2_desc' },
  { icon: TargetIcon, titleKey: 'land_j3_title', descKey: 'land_j3_desc' },
  { icon: BarChartIcon, titleKey: 'land_j4_title', descKey: 'land_j4_desc' },
  { icon: RocketIcon, titleKey: 'land_j5_title', descKey: 'land_j5_desc' },
]

const step = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 26,
      mass: 0.8,
      delay: i * 0.08,
    },
  }),
}

export default function JourneyRoadmap() {
  const { t } = useI18n()

  return (
    <section className={styles.journey}>
      <div className={styles.track}>
        {stages.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={i}
              className={styles.step}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={step}
            >
              <div className={`${styles.stepNum} ${i < 3 ? styles.stepNumActive : styles.stepNumInactive}`}>
                {i + 1}
              </div>
              <div className={styles.stepIcon}>
                <Icon size={20} />
              </div>
              <h3 className={styles.stepTitle}>{t(s.titleKey)}</h3>
              <p className={styles.stepDesc}>{t(s.descKey)}</p>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
