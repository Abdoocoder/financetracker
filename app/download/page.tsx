'use client'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Globe } from 'lucide-react'
import styles from './download.module.css'

export default function DownloadPage() {
  const { t, lang, setLang } = useI18n()

  const handleLangToggle = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
  }

  return (
    <div className={`${styles.page} ${lang === 'ar' ? styles.rtl : styles.ltr}`}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>
            <div className={styles.logoIcon}>{t('app_name')[0]}</div>
            <span className={styles.logoText}>{t('app_name')}</span>
          </Link>
          <div className={styles.navActions}>
            <button onClick={handleLangToggle} className={styles.langBtn}>
              <Globe size={16} />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            <Link href="/register" className={styles.navCta}>{t('land_start_btn')}</Link>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.appIcon}>📱</div>

        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>{t('down_status')}</span>
        </div>

        <h1 className={styles.title}>
          {t('down_title_part1')}
          <br />
          <span className={styles.titleGradient}>Android</span>
        </h1>

        <p className={styles.desc}>{t('down_desc')}</p>

        <div className={styles.ctaWrap}>
          <a
            href="https://play.google.com/store/apps/details?id=com.fajrak.app"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaBtn}
          >
            {t('down_btn')}
          </a>
          <div className={styles.badges}>
            {[
              { icon: '🛡️', label: t('down_safe') },
              { icon: '✨', label: t('down_version') }
            ].map((b, i) => (
              <span key={i} className={styles.badge}>
                <span>{b.icon}</span> {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.features}>
          {[
            { icon: '🔔', label: t('down_f1') },
            { icon: '⚡', label: t('down_f2') },
            { icon: '📴', label: t('down_f3') },
          ].map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <div className={styles.featureLabel}>{f.label}</div>
            </div>
          ))}
        </div>

        <p className={styles.webHint}>{t('down_web_hint')}</p>
        <Link href="/register" className={styles.webBtn}>
          {t('down_web_btn')}
        </Link>
      </section>
    </div>
  )
}
