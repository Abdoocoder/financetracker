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
import TestimonialsSection from '@/components/landing/testimonials/TestimonialsSection'
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

      <TestimonialsSection testimonials={testimonialsList} />

      <PricingSection />

      <Footer />

      <LandingClient />
    </div>
  )
}
