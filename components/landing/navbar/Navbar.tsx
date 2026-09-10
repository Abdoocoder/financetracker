'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Globe } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { t, lang, setLang } = useI18n()

  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.logoBox} aria-label={t('land_app_name')}>
          <img src="/icon-512.png" className={styles.logoImg} alt="" />
          <span className={styles.logoText}>{t('land_app_name')}</span>
        </Link>

        <div className={styles.navActions}>
          <button
            onClick={() => {
              const newLang = lang === 'ar' ? 'en' : 'ar'
              setLang(newLang)
              document.cookie = `lang=${newLang}; path=/; max-age=31536000`
            }}
            className={styles.langBtn}
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Globe size={16} />
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
          <Link href="/login" className={styles.loginLink}>{t('land_login')}</Link>
          <Link href="/register" className={styles.startBtn}>{t('land_start_btn')}</Link>
        </div>
      </div>
    </nav>
  )
}
