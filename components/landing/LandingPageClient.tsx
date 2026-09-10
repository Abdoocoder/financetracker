'use client'

import { useI18n } from '@/lib/i18n'
import LandingClient from '@/components/layout/LandingClient'
import Navbar from '@/components/landing/navbar/Navbar'
import HeroSection from '@/components/landing/hero/HeroSection'
import DashboardPreview from '@/components/landing/dashboard/DashboardPreview'
import ProblemSection from '@/components/landing/problem/ProblemSection'
import JourneyRoadmap from '@/components/landing/journey/JourneyRoadmap'
import FeaturesGrid from '@/components/landing/features/FeaturesGrid'
import PricingSection from '@/components/landing/pricing/PricingSection'
import Footer from '@/components/landing/footer/Footer'
import styles from './LandingPageClient.module.css'

interface Testimonial {
  name: string
  country: string
  role: string
  text: string
  stars: number
}

interface LandingPageClientProps {
  testimonialsList: Testimonial[]
}

export default function LandingPageClient({ testimonialsList }: LandingPageClientProps) {
  const { t, lang } = useI18n()

  return (
    <div className={styles.container} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Navbar />

      <HeroSection />

      <DashboardPreview />

      <ProblemSection />

      <JourneyRoadmap />

      <FeaturesGrid />

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className={styles.testimonialsHeader}>
          <h2 className={styles.testimonialsTitle}>{t('land_testimonials_title')}</h2>
          <p className={styles.testimonialsSubtitle}>{t('land_testimonials_subtitle')}</p>
        </div>
        <div className={styles.testimonialsGrid}>
          {testimonialsList.map((item, i) => (
            <div key={i} className={styles.testimonialCard}>
              <div className={styles.starsRow}>
                {Array(item.stars).fill(0).map((_, s) => (
                  <span key={s} className={styles.star}>★</span>
                ))}
              </div>
              <p className={styles.testimonialText}>{item.text}</p>
              <div className={styles.userRow}>
                <div className={styles.userAvatar}>{item.name[0]}</div>
                <div className={styles.userNameRow}>
                  <div className={styles.userName}>{item.name} {item.country}</div>
                  <div className={styles.userRole}>{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PricingSection />

      <Footer />

      <LandingClient />
    </div>
  )
}
