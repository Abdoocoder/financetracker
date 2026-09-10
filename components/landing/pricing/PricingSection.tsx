'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Check } from 'lucide-react'
import styles from './PricingSection.module.css'

const spring = { type: 'spring' as const, stiffness: 350, damping: 26, mass: 0.8 }

const card = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...spring, delay: i * 0.1 },
  }),
}

export default function PricingSection() {
  const { t } = useI18n()

  const freeFeatures = [
    t('land_plan_free_f1'),
    t('land_plan_free_f2'),
    t('land_plan_free_f3'),
    t('land_plan_free_f4'),
  ]

  const proFeatures = [
    t('land_plan_pro_f1'),
    t('land_plan_pro_f2'),
    t('land_plan_pro_f3'),
    t('land_plan_pro_f4'),
  ]

  return (
    <section className={styles.pricing}>
      <div className={styles.pricingGrid}>
        <motion.div
          className={styles.planCard}
          custom={0}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={card}
        >
          <div className={styles.planName}>{t('land_plan_free')}</div>
          <div className={styles.planPrice}>FREE</div>
          <div className={styles.planPriceSub}>{t('land_plan_free_sub')}</div>
          <ul className={styles.planFeatures}>
            {freeFeatures.map((f, i) => (
              <li key={i} className={styles.planFeature}>
                <Check size={16} className={styles.planFeatureCheck} />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/register" className={`${styles.planCta} ${styles.planCtaPrimary}`}>
            {t('land_plan_free_cta')}
          </Link>
        </motion.div>

        <motion.div
          className={`${styles.planCard} ${styles.planFeatured}`}
          custom={1}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={card}
        >
          <div className={styles.planBadge}>{t('land_plan_pro_badge')}</div>
          <div className={styles.planName}>{t('land_plan_pro')}</div>
          <div className={styles.planPrice}>{t('land_plan_pro_price')}</div>
          <div className={styles.planPriceSub}>{t('land_plan_pro_sub')}</div>
          <ul className={styles.planFeatures}>
            {proFeatures.map((f, i) => (
              <li key={i} className={styles.planFeature}>
                <Check size={16} className={styles.planFeatureCheck} />
                {f}
              </li>
            ))}
          </ul>
          <button className={`${styles.planCta} ${styles.planCtaSecondary}`} disabled>
            {t('land_plan_pro_cta')}
          </button>
        </motion.div>
      </div>
    </section>
  )
}
