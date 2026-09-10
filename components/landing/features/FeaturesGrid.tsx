'use client'

import { useI18n } from '@/lib/i18n'
import styles from './FeaturesGrid.module.css'

interface Feature {
  icon: string
  titleKey: string
  descKey: string
}

interface Category {
  titleKey: string
  features: Feature[]
}

const categories: Category[] = [
  {
    titleKey: 'land_cat1',
    features: [
      { icon: '🏆', titleKey: 'land_f_health', descKey: 'land_f_health_desc' },
      { icon: '💳', titleKey: 'land_f_transactions', descKey: 'land_f_transactions_desc' },
      { icon: '🤝', titleKey: 'land_f_debts', descKey: 'land_f_debts_desc' },
      { icon: '🎯', titleKey: 'land_f_budgets', descKey: 'land_f_budgets_desc' },
      { icon: '📈', titleKey: 'land_f_investments', descKey: 'land_f_investments_desc' },
      { icon: '💰', titleKey: 'land_f_networth', descKey: 'land_f_networth_desc' },
      { icon: '📄', titleKey: 'land_f_reports', descKey: 'land_f_reports_desc' },
    ],
  },
  {
    titleKey: 'land_cat2',
    features: [
      { icon: '🧮', titleKey: 'land_f_fire', descKey: 'land_f_fire_desc' },
      { icon: '🕌', titleKey: 'land_f_zakat', descKey: 'land_f_zakat_desc' },
      { icon: '🤖', titleKey: 'land_f_ai', descKey: 'land_f_ai_desc' },
      { icon: '🔔', titleKey: 'land_f_notifications', descKey: 'land_f_notifications_desc' },
    ],
  },
  {
    titleKey: 'land_cat3',
    features: [
      { icon: '🎮', titleKey: 'land_f_gamification', descKey: 'land_f_gamification_desc' },
      { icon: '📚', titleKey: 'land_f_lessons', descKey: 'land_f_lessons_desc' },
      { icon: '🗺️', titleKey: 'land_f_journey', descKey: 'land_f_journey_desc' },
    ],
  },
  {
    titleKey: 'land_cat4',
    features: [
      { icon: '🔐', titleKey: 'land_f_security', descKey: 'land_f_security_desc' },
      { icon: '📱', titleKey: 'land_f_pwa', descKey: 'land_f_pwa_desc' },
    ],
  },
]

export default function FeaturesGrid() {
  const { t } = useI18n()

  return (
    <section id="features" className={styles.features}>
      {categories.map((cat, ci) => (
        <div key={ci} className={styles.category}>
          <h3 className={styles.categoryTitle}>{t(cat.titleKey)}</h3>
          <div className={styles.grid}>
            {cat.features.map((f, fi) => (
              <div key={fi} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h4 className={styles.featureTitle}>{t(f.titleKey)}</h4>
                <p className={styles.featureDesc}>{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
