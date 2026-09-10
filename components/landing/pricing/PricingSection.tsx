'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Check } from 'lucide-react'
import styles from './PricingSection.module.css'

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
        <div className={styles.planCard}>
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
        </div>

        <div className={`${styles.planCard} ${styles.planFeatured}`}>
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
        </div>
      </div>
    </section>
  )
}
