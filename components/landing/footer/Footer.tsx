'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import styles from './Footer.module.css'

export default function Footer() {
  const { t, lang } = useI18n()

  return (
    <footer className={styles.footer}>
      <div className={styles.ctaBlock}>
        <h2 className={styles.ctaTitle}>{t('land_final_title')}</h2>
        <p className={styles.ctaDesc}>{t('land_final_desc')}</p>
        <div className={styles.ctaActions}>
          <Link href="/register" className={styles.ctaPrimary}>
            {lang === 'ar' ? 'ابدأ مجاناً' : 'Start Free'}
          </Link>
          <Link href="/download" className={styles.ctaSecondary}>
            {t('land_download_android')}
          </Link>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}>🏠</span>
          <span className={styles.footerAppName}>Fajrak</span>
        </div>

        <div className={styles.footerLinks}>
          <Link href="/help" className={styles.footerLink}>{t('land_footer_help')}</Link>
          <Link href="/login" className={styles.footerLink}>{t('land_footer_login')}</Link>
          <Link href="/download" className={styles.footerLink}>{t('land_footer_download')}</Link>
        </div>

        <div className={styles.footerTagline}>{t('land_footer_tagline')}</div>
      </div>

      <div className={styles.footerCopy}>
        {t('land_footer_copy')}
      </div>
    </footer>
  )
}
