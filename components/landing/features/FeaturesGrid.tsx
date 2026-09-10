'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import {
  TrophyIcon,
  CardIcon,
  HandshakeIcon,
  TargetIcon,
  TrendingUpIcon,
  CoinsIcon,
  FileTextIcon,
  CalculatorIcon,
  MosqueIcon,
  BotIcon,
  BellIcon,
  GamepadIcon,
  BookIcon,
  MapIcon,
  ShieldIcon,
  SmartphoneIcon,
} from '@/components/landing/shared/Icons'
import styles from './FeaturesGrid.module.css'

interface Feature {
  icon: React.ComponentType<{ size?: number }>
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
      { icon: TrophyIcon, titleKey: 'land_f_health', descKey: 'land_f_health_desc' },
      { icon: CardIcon, titleKey: 'land_f_transactions', descKey: 'land_f_transactions_desc' },
      { icon: HandshakeIcon, titleKey: 'land_f_debts', descKey: 'land_f_debts_desc' },
      { icon: TargetIcon, titleKey: 'land_f_budgets', descKey: 'land_f_budgets_desc' },
      { icon: TrendingUpIcon, titleKey: 'land_f_investments', descKey: 'land_f_investments_desc' },
      { icon: CoinsIcon, titleKey: 'land_f_networth', descKey: 'land_f_networth_desc' },
      { icon: FileTextIcon, titleKey: 'land_f_reports', descKey: 'land_f_reports_desc' },
    ],
  },
  {
    titleKey: 'land_cat2',
    features: [
      { icon: CalculatorIcon, titleKey: 'land_f_fire', descKey: 'land_f_fire_desc' },
      { icon: MosqueIcon, titleKey: 'land_f_zakat', descKey: 'land_f_zakat_desc' },
      { icon: BotIcon, titleKey: 'land_f_ai', descKey: 'land_f_ai_desc' },
      { icon: BellIcon, titleKey: 'land_f_notifications', descKey: 'land_f_notifications_desc' },
    ],
  },
  {
    titleKey: 'land_cat3',
    features: [
      { icon: GamepadIcon, titleKey: 'land_f_gamification', descKey: 'land_f_gamification_desc' },
      { icon: BookIcon, titleKey: 'land_f_lessons', descKey: 'land_f_lessons_desc' },
      { icon: MapIcon, titleKey: 'land_f_journey', descKey: 'land_f_journey_desc' },
    ],
  },
  {
    titleKey: 'land_cat4',
    features: [
      { icon: ShieldIcon, titleKey: 'land_f_security', descKey: 'land_f_security_desc' },
      { icon: SmartphoneIcon, titleKey: 'land_f_pwa', descKey: 'land_f_pwa_desc' },
    ],
  },
]

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 },
  },
}

const categoryVariant = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

export default function FeaturesGrid() {
  const { t } = useI18n()

  return (
    <section id="features" className={styles.features}>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
      >
        {categories.map((cat, ci) => (
          <motion.div key={ci} className={styles.category} variants={categoryVariant}>
            <h3 className={styles.categoryTitle}>{t(cat.titleKey)}</h3>
            <div className={styles.grid}>
              {cat.features.map((f, fi) => {
                const Icon = f.icon
                return (
                  <motion.div key={fi} className={styles.featureCard} variants={item}>
                    <div className={styles.featureIcon}>
                      <Icon size={24} />
                    </div>
                    <h4 className={styles.featureTitle}>{t(f.titleKey)}</h4>
                    <p className={styles.featureDesc}>{t(f.descKey)}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
