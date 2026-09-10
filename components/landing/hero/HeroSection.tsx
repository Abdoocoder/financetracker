'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { ArrowRight, Download, Check } from 'lucide-react'
import { ArabesquePattern } from '@/components/landing/shared/patterns'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  const { t, lang } = useI18n()

  return (
    <section className={styles.hero}>
      <div className={styles.heroBg}>
        <ArabesquePattern className={styles.heroBgLeft} opacity={0.04} />
        <ArabesquePattern className={styles.heroBgRight} opacity={0.03} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.heroBadge}>
          <span className={styles.heroDot} />
          <span>{t('land_badge')}</span>
        </div>

        <h1 className={styles.heroTitle}>
          <span className={styles.heroGradient}>
            {t('land_hero_title')}
          </span>
        </h1>

        <p className={styles.heroDesc}>
          <strong style={{ color: 'var(--accent-blue-light)' }}>{t('app_name')}</strong>{' '}
          {t('land_hero_answer')}
        </p>

        <div className={styles.heroCtaRow}>
          <Link href="/register" className={styles.ctaPrimary}>
            {lang === 'ar' ? 'ابدأ مجاناً' : 'Start Free'}
            <ArrowRight size={16} style={{ marginLeft: 8 }} />
          </Link>
          <Link href="#features" className={styles.ctaSecondary}>
            {t('land_cta_how')}
          </Link>
        </div>

        <div className={styles.heroTags}>
          {[t('land_feature_free'), t('land_feature_no_card'), t('land_feature_halal')].map((text, i) => (
            <span key={i} className={styles.heroTag}>
              <Check size={14} className={styles.heroTagIcon} />
              {text}
            </span>
          ))}
        </div>

        <Link href="/download" className={styles.heroDownload}>
          <Download size={16} />
          {t('land_download_android')}
        </Link>
      </div>
    </section>
  )
}
