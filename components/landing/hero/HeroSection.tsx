'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { ArrowRight, Download, Check } from 'lucide-react'
import { ArabesquePattern } from '@/components/landing/shared/patterns'
import styles from './HeroSection.module.css'

const spring = { type: 'spring' as const, stiffness: 300, damping: 24, mass: 0.8 }

const badge = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: 0.05 } },
}

const title = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: 0.12 } },
}

const desc = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ...spring, delay: 0.2 } },
}

const cta = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: 0.28 } },
}

const tags = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { ...spring, delay: 0.36 } },
}

const download = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { ...spring, delay: 0.42 } },
}

export default function HeroSection() {
  const { t, lang } = useI18n()

  return (
    <section className={styles.hero}>
      <div className={styles.heroBg}>
        <ArabesquePattern className={styles.heroBgLeft} opacity={0.04} />
        <ArabesquePattern className={styles.heroBgRight} opacity={0.03} />
      </div>

      <motion.div
        className={styles.heroContent}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
      >
        <motion.div className={styles.heroBadge} variants={badge}>
          <span className={styles.heroDot} />
          <span>{t('land_badge')}</span>
        </motion.div>

        <motion.h1 className={styles.heroTitle} variants={title}>
          <span className={styles.heroGradient}>
            {t('land_hero_title')}
          </span>
        </motion.h1>

        <motion.p className={styles.heroDesc} variants={desc}>
          <strong style={{ color: 'var(--accent-blue-light)' }}>{t('app_name')}</strong>{' '}
          {t('land_hero_answer')}
        </motion.p>

        <motion.div className={styles.heroCtaRow} variants={cta}>
          <Link href="/register" className={styles.ctaPrimary}>
            {lang === 'ar' ? 'ابدأ مجاناً' : 'Start Free'}
            <ArrowRight size={16} style={{ marginLeft: 8 }} />
          </Link>
          <Link href="#features" className={styles.ctaSecondary}>
            {t('land_cta_how')}
          </Link>
        </motion.div>

        <motion.div className={styles.heroTags} variants={tags}>
          {[t('land_feature_free'), t('land_feature_no_card'), t('land_feature_halal')].map((text, i) => (
            <span key={i} className={styles.heroTag}>
              <Check size={14} className={styles.heroTagIcon} />
              {text}
            </span>
          ))}
        </motion.div>

        <motion.div variants={download}>
          <Link href="/download" className={styles.heroDownload}>
            <Download size={16} />
            {t('land_download_android')}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
