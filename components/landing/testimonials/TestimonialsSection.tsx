'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { StarIcon } from '@/components/landing/shared/Icons'
import styles from './TestimonialsSection.module.css'

interface Testimonial {
  name: string
  country: string
  role: string
  text: string
  stars: number
}

const spring = { type: 'spring' as const, stiffness: 350, damping: 26, mass: 0.8 }

const card = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...spring, delay: i * 0.08 },
  }),
}

const header = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
}

export default function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const { t } = useI18n()

  return (
    <section className={styles.section}>
      <motion.div
        className={styles.header}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        variants={header}
      >
        <h2 className={styles.title}>{t('land_testimonials_title')}</h2>
        <p className={styles.subtitle}>{t('land_testimonials_subtitle')}</p>
      </motion.div>

      <div className={styles.grid}>
        {testimonials.map((item, i) => (
          <motion.div
            key={i}
            className={styles.card}
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            variants={card}
          >
            <div className={styles.starsRow}>
              {Array(item.stars)
                .fill(0)
                .map((_, s) => (
                  <StarIcon key={s} size={14} className={styles.star} />
                ))}
            </div>
            <p className={styles.text}>{item.text}</p>
            <div className={styles.userRow}>
              <div className={styles.avatar}>{item.name[0]}</div>
              <div className={styles.userMeta}>
                <div className={styles.userName}>
                  {item.name} {item.country}
                </div>
                <div className={styles.userRole}>{item.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
