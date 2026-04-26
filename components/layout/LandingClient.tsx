'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

import styles from './LandingClient.module.css'

export default function LandingClient() {
  const [showSticky, setShowSticky] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > window.innerHeight * 0.8)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`${styles.stickyBar} ${showSticky ? styles.stickyVisible : ''}`}>
      <div>
        <div className={styles.ctaTitle}>{t('land_cta_title')}</div>
        <div className={styles.ctaSubtitle}>{t('land_cta_subtitle')}</div>
      </div>
      <Link 
        href="/register" 
        className={styles.ctaButton}
      >
        {t('land_cta_btn')}
      </Link>
    </div>
  )
}
