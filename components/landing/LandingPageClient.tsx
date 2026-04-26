'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import LandingClient from '@/components/layout/LandingClient'
import { Globe } from 'lucide-react'
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

const BADGE_CLASS: Record<string, string> = {
  '#3B7EF6': 'featureBadgeBlue',
  '#8B5CF6': 'featureBadgePurple',
  '#10B981': 'featureBadgeGreen',
  '#F59E0B': 'featureBadgeYellow',
  '#EF4444': 'featureBadgeRed',
}

export default function LandingPageClient({ testimonialsList }: LandingPageClientProps) {
  const { t, lang, setLang } = useI18n()

  return (
    <div className={styles.container} dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      <div className={styles.glowContainer}>
        <div className={styles.glowTopRight} />
        <div className={styles.glowBottomLeft} />
      </div>

      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.logoBox}>
            <img src="/icon-512.png" className={styles.logoImg} alt={t('land_app_name')} />
            <span className={styles.logoText}>{t('land_app_name')}</span>
          </div>
          <div className={styles.navActions}>
            <button 
              onClick={() => {
                const newLang = lang === 'ar' ? 'en' : 'ar';
                setLang(newLang);
                document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
              }}
              className={styles.langBtn}
            >
              <Globe size={16} />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            <Link href="/login" className={styles.loginLink}>{t('land_login')}</Link>
            <Link href="/register" className={styles.startBtn}>{t('land_start_btn')}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroBadge}>
          <span className={styles.heroDot} />
          <span className={styles.heroBadgeText}>{t('land_badge')}</span>
        </div>

        <div className={styles.heroTease}>
          {t('land_hero_tease')}
        </div>

        <h1 className={styles.heroTitle}>
          <span className={styles.heroTitleGradient}>
            {t('land_hero_title')}
          </span>
        </h1>

        <div className={styles.heroAnswer}>
          <span className={styles.heroAppName}>{t('app_name')}</span> {t('land_hero_answer')}
        </div>

        <p className={styles.heroDesc}>
          {t('land_hero_desc')}
        </p>
        <div className={styles.heroCtaRow}>
          <Link href="/register" className={styles.heroCtaPrimary}>{t('land_cta_start')}</Link>
          <a href="#features" className={styles.heroCtaSecondary}>{t('land_cta_how')}</a>
        </div>
        <div className={styles.heroFeatureRow}>
          {[t('land_feature_free'), t('land_feature_no_card'), t('land_feature_halal')].map((text, i) => (
            <span key={i} className={styles.heroFeatureItem}>{text}</span>
          ))}
        </div>
        <div className={styles.heroDesignedFor}>{t('land_designed_for')}</div>

        <Link href="/download" className={styles.heroDownloadBtn}>
          {t('land_download_android')}
        </Link>
      </section>

      {/* Dashboard Preview */}
      <section className={styles.previewSection}>
        <div className={styles.browserWindow}>
          <div className={styles.browserHeader}>
            <div className={styles.browserDotRed} />
            <div className={styles.browserDotYellow} />
            <div className={styles.browserDotGreen} />
            <div className={styles.browserUrlBar}>
              <span className={styles.browserUrl}>fajrak.com/dashboard</span>
            </div>
          </div>
          <div className={styles.browserContent}>
            <div className={styles.previewTopRow}>
              <div>
                <div className={styles.previewTitle}>{t('land_preview_title')}</div>
                <div className={styles.previewSubtitle}>{t('land_preview_subtitle')}</div>
              </div>
              <div className={styles.previewAlert}>🔔 3</div>
            </div>
            <div className={styles.previewStatsGrid}>
              {[
                { label: t('dash_income'), value: '+2,400', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { label: t('dash_expenses'), value: '1,250', color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
                { label: t('dash_net'), value: '+1,150', color: '#3B7EF6', bg: 'rgba(59,126,246,0.08)' },
              ].map((s, i) => (
                <div key={i} className={`${styles.previewStatBox} ${styles[`previewStatBox${i}`]}`}>
                  <div className={`${styles.previewStatValue} ${styles[`previewStatValue${i}`]}`}>{s.value}</div>
                  <div className={styles.previewStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.previewRoadmap}>
              <div className={styles.previewRoadmapHeader}>
                <div className={styles.previewRoadmapTitle}>{t('land_roadmap_title')}</div>
                <div className={styles.previewRoadmapBadge}>{t('land_roadmap_stage2')}</div>
              </div>
              <div className={styles.previewRoadmapBarContainer}>
                {[t('stage1'), t('stage2'), t('stage3'), t('stage4')].map((stage, i) => (
                  <div key={i} className={`${styles.previewRoadmapBar} ${i === 0 ? styles.previewRoadmapBarFilled : i === 1 ? styles.previewRoadmapBarCurrent : ''}`} />
                ))}
              </div>
              <div className={styles.previewRoadmapFooter}>
                <div className={styles.previewRoadmapProgress}>72<span className={styles.roadmapDenominator}>/100</span></div>
                <div className={`${styles.previewRoadmapNextRow} ${lang === 'ar' ? styles.previewRoadmapNextRowRtl : ''}`}>
                  <div className={styles.previewRoadmapNextLabel}>{t('land_roadmap_next')}</div>
                  <div className={styles.previewRoadmapNextStep}>{t('land_roadmap_next_step')}</div>
                </div>
              </div>
            </div>

            <div className={styles.previewChart}>
              <div className={styles.previewChartTitle}>{t('land_chart_title')}</div>
              <div className={styles.previewChartBars}>
                {[{i:40,e:30},{i:55,e:45},{i:35,e:50},{i:70,e:40},{i:60,e:35},{i:80,e:55}].map((bar, idx) => (
                  <div key={idx} className={styles.previewChartBarItem}>
                    <div className={styles.previewChartBarIncome} style={{ height: `${bar.i}%` }} />
                    <div className={styles.previewChartBarExpense} style={{ height: `${bar.e}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* المشكلة */}
      <section className={styles.problemSection}>
        <div className={styles.problemHeader}>
          <div className={styles.problemTag}>{t('land_problem_tag')}</div>
          <h2 className={styles.problemTitle}>{t('land_problem_title')}</h2>
          <p className={styles.problemDesc}>{t('land_problem_desc')}</p>
        </div>
        <div className={styles.problemGrid}>
          {[
            { icon: '📱', title: t('land_prob1_title'), desc: t('land_prob1_desc') },
            { icon: '💸', title: t('land_prob2_title'), desc: t('land_prob2_desc') },
            { icon: '🌍', title: t('land_prob3_title'), desc: t('land_prob3_desc') },
            { icon: '🎯', title: t('land_prob4_title'), desc: t('land_prob4_desc') },
          ].map((p, i) => (
            <div key={i} className={styles.problemCard}>
              <div className={`${styles.problemSolvedBadge} ${lang === 'en' ? styles.badgeLtr : styles.badgeRtl}`}>{t('land_solved')}</div>
              <div className={styles.problemIcon}>{p.icon}</div>
              <div className={styles.problemCardTitle}>{p.title}</div>
              <div className={styles.problemCardDesc}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* رحلة الحرية المالية */}
      <section className={styles.journeySection}>
        <div className={styles.journeyHeader}>
          <div className={styles.journeyTag}>{t('land_journey_tag')}</div>
          <h2 className={styles.journeyTitle}>
            {t('land_journey_title')}<br />
            <span className={styles.journeySubtitle}>{t('land_journey_subtitle')}</span>
          </h2>
          <p className={styles.journeyDesc}>{t('land_journey_desc')}</p>
        </div>

        <div className={styles.journeyList}>
          {[
            { num: '01', icon: '🌱', stage: t('land_step1_title'), desc: t('land_step1_desc'), quote: t('land_step1_quote'), color: '#8B5CF6', active: false },
            { num: '02', icon: '💳', stage: t('land_step2_title'), desc: t('land_step2_desc'), quote: t('land_step2_quote'), color: '#EF4444', active: false },
            { num: '03', icon: '🛡️', stage: t('land_step3_title'), desc: t('land_step3_desc'), quote: t('land_step3_quote'), color: '#F59E0B', active: false },
            { num: '04', icon: '📈', stage: t('land_step4_title'), desc: t('land_step4_desc'), quote: t('land_step4_quote'), color: '#10B981', active: false },
            { num: '05', icon: '👑', stage: t('land_step5_title'), desc: t('land_step5_desc'), quote: t('land_step5_quote'), color: '#3B7EF6', active: true },
          ].map((step, i) => (
            <div key={i} className={`${styles.journeyCard} ${step.active ? styles.journeyCardActive : ''}`}>
              <div className={`${styles.journeyIconBox} ${styles[`journeyIconBox${i}`]}`}>
                {step.icon}
              </div>
              <div className={styles.journeyInfo}>
                <div className={styles.journeyTopRow}>
                  <span className={`${styles.journeyNum} ${styles[`journeyNum${i}`]}`}>{step.num}</span>
                  <span className={styles.journeyStage}>{step.stage}</span>
                  {step.active && <span className={styles.journeyFinalGoal}>🎯 {lang === 'ar' ? 'الهدف النهائي' : 'Ultimate Goal'}</span>}
                </div>
                <div className={styles.journeyCardDesc}>{step.desc}</div>
                <div className={`${styles.journeyQuote} ${styles[`journeyQuote${i}`]}`}>{step.quote}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.journeyCta}>
          <Link href="/register" className={styles.journeyCtaBtn}>
            {t('land_start_journey')}
          </Link>
        </div>
      </section>

      {/* الميزات */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresHeader}>
          <div className={styles.featuresTag}>{t('land_features_tag')}</div>
          <h2 className={styles.featuresTitle}>{t('land_features_title')}</h2>
        </div>
        <div className={styles.featuresGrid}>
          {[
            { icon: '🗺️', title: t('land_f_roadmap_title'), desc: t('land_f_roadmap_desc'), badge: lang === 'ar' ? 'أساسي' : 'Core', badgeColor: '#3B7EF6' },
            { icon: '🎮', title: t('land_f_journey_title'), desc: t('land_f_journey_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#8B5CF6' },
            { icon: '📊', title: t('land_f_advisor_title'), desc: t('land_f_advisor_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#10B981' },
            { icon: '💡', title: t('land_f_nudge_title'), desc: t('land_f_nudge_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#F59E0B' },
            { icon: '💳', title: t('land_f_debts_title'), desc: t('land_f_debts_desc') },
            { icon: '📈', title: t('land_f_invest_title'), desc: t('land_f_invest_desc') },
            { icon: '💎', title: t('land_f_assets_title'), desc: t('land_f_assets_desc') },
            { icon: '🏆', title: t('land_f_challenges_title'), desc: t('land_f_challenges_desc') },
            { icon: '🎓', title: t('land_f_lessons_title'), desc: t('land_f_lessons_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#8B5CF6' },
            { icon: '🔔', title: t('land_f_alerts_title'), desc: t('land_f_alerts_desc') },
            { icon: '🌐', title: t('land_f_lang_title'), desc: t('land_f_lang_desc') },
            { icon: '🔥', title: t('land_f_fire_title'), desc: t('land_f_fire_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#EF4444' },
            { icon: '🌙', title: t('land_f_zakat_title'), desc: t('land_f_zakat_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#10B981' },
            { icon: '📊', title: t('land_f_history_title'), desc: t('land_f_history_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#8B5CF6' },
            { icon: '📄', title: t('land_f_pdf_title'), desc: t('land_f_pdf_desc'), badge: lang === 'ar' ? 'جديد' : 'New', badgeColor: '#F59E0B' },
          ].map((f, i) => (
            <div key={i} className={styles.featureCard}>
              {f.badge && (
                <div className={`${styles.featureBadge} ${BADGE_CLASS[f.badgeColor ?? ''] ?? ''}`}>{f.badge}</div>
              )}
              <div className={`${styles.featureIcon} ${f.badge ? styles.featureIconWithBadge : ''}`}>{f.icon}</div>
              <div className={styles.featureTitle}>{f.title}</div>
              <div className={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* خارطة الثراء */}
      <section className={styles.roadmapSection}>
        <div className={styles.roadmapContainer}>
          <div className={styles.roadmapHeader}>
            <div className={styles.roadmapIcon}>🗺️</div>
            <div className={styles.roadmapTitleRow}>
              <div className={styles.roadmapExclusiveBadge}>{t('land_exclusive')}</div>
              <h3 className={styles.roadmapTitle}>{t('land_roadmap_full_title')}</h3>
            </div>
          </div>
          <p className={styles.roadmapText}>
            {t('land_roadmap_full_desc')}
          </p>
          <div className={styles.roadmapPointsGrid}>
            {[
              { icon: '🎯', title: t('land_roadmap_point1_title'), desc: t('land_roadmap_point1_desc') },
              { icon: '💯', title: t('land_roadmap_point2_title'), desc: t('land_roadmap_point2_desc') },
              { icon: '💪', title: t('land_roadmap_point3_title'), desc: t('land_roadmap_point3_desc') },
              { icon: '👣', title: t('land_roadmap_point4_title'), desc: t('land_roadmap_point4_desc') },
            ].map((item, i) => (
              <div key={i} className={styles.roadmapPointCard}>
                <div className={styles.roadmapPointIcon}>{item.icon}</div>
                <div className={styles.roadmapPointInfo}>
                  <div className={styles.roadmapPointTitle}>{item.title}</div>
                  <div className={styles.roadmapPointDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* شهادات المستخدمين */}
      <section className={styles.testimonialsSection}>
        <div className={styles.testimonialsHeader}>
          <h2 className={styles.testimonialsTitle}>{t('land_testimonials_title')}</h2>
          <p className={styles.testimonialsSubtitle}>{t('land_testimonials_subtitle')}</p>
        </div>
        <div className={styles.testimonialsGrid}>
          {testimonialsList.map((t, i) => (
            <div key={i} className={styles.testimonialCard}>
              <div className={styles.starsRow}>
                {Array(t.stars).fill(0).map((_, s) => (
                  <span key={s} className={styles.star}>★</span>
                ))}
              </div>
              <p className={styles.testimonialText}>{t.text}</p>
              <div className={styles.userRow}>
                <div className={styles.userAvatar}>{t.name[0]}</div>
                <div className={styles.userNameRow}>
                  <div className={styles.userName}>{t.name} {t.country}</div>
                  <div className={styles.userRole}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* الأسعار */}
      <section className={styles.pricingSection}>
        <div className={styles.pricingHeader}>
          <h2 className={styles.pricingTitle}>{t('land_pricing_title')}</h2>
          <p className={styles.pricingSubtitle}>{t('land_pricing_subtitle')}</p>
        </div>
        <div className={styles.pricingGrid}>
          <div className={styles.pricingCard}>
            <div className={styles.priceTag}>{t('land_price_free')}</div>
            <div className={styles.priceAmount}>$0</div>
            <div className={styles.priceSub}>{t('land_price_forever')}</div>
            {(t('land_pricing_features') as unknown as string[]).map((f, i) => (
              <div key={i} className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span className={styles.featureText}>{f}</span>
              </div>
            ))}
            <Link href="/register" className={styles.pricingCta}>{t('land_cta_start')}</Link>
          </div>
          <div className={styles.pricingCardPro}>
            <div className={`${styles.soonBadge} ${lang === 'en' ? styles.soonBadgeLtr : styles.soonBadgeRtl}`}>{lang === 'ar' ? 'قريباً' : 'Soon'}</div>
            <div className={styles.proNote}>Pro</div>
            <div className={styles.priceAmount}>{lang === 'ar' ? 'قريباً' : 'Soon'}</div>
            <div className={styles.priceSub}>{lang === 'ar' ? 'نعمل عليها الآن' : 'In the works'}</div>
            {[
              '🤖 AI Advisor',
              '📸 OCR Scanning',
              '📊 Advanced Analytics',
              '🔔 Custom Push Alerts',
              '🔗 Bank Connections',
              '⭐ Priority Support',
            ].map((f, i) => (
              <div key={i} className={styles.featureItem}>
                <span className={styles.proCheckIcon}>◇</span>
                <span className={styles.proFeatureText}>{f}</span>
              </div>
            ))}
            <div className={styles.proOffer}>
              <div className={styles.offerTitle}>🎁 Special Offer</div>
              <div className={styles.offerDesc}>50% discount for early adopters</div>
              <Link href="/register" className={styles.proCta}>
                {lang === 'ar' ? 'سجّل الآن واحجز مكانك ←' : 'Register & Reserve Your Spot →'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* الرؤية */}
      <section className={styles.visionSection}>
        <div className={styles.visionContainer}>
          <div className={styles.visionEmoji}>🌅</div>
          <h2 className={styles.visionTitle}>
            {t('land_vision_title')}
          </h2>
          <p className={styles.visionDesc}>
            {t('land_vision_desc')}
          </p>
          <div className={styles.visionDivider} />
          <div className={styles.visionGrid}>
            {[
              { icon: '🕌', title: t('land_v1_title'), desc: t('land_v1_desc') },
              { icon: '🎓', title: t('land_v2_title'), desc: t('land_v2_desc') },
              { icon: '🔒', title: t('land_v3_title'), desc: t('land_v3_desc') },
              { icon: '🆓', title: t('land_v4_title'), desc: t('land_v4_desc') },
            ].map((v, i) => (
              <div key={i} className={styles.visionItem}>
                <div className={styles.visionIcon}>{v.icon}</div>
                <div className={styles.visionItemTitle}>{v.title}</div>
                <div className={styles.visionItemDesc}>{v.desc}</div>
              </div>
            ))}
          </div>
          <div className={styles.visionDivider} />
          <p className={styles.visionFooterText}>
            {lang === 'ar' ? '"كل رحلة ثراء تبدأ بخطوة" — بُني بـ ❤️ من الأردن للعالم العربي' : '"Every wealth journey starts with a step" — Built with ❤️ from Jordan for the Arab World'}
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLogoRow}>
          <img src="/icon-512.png" className={styles.footerLogoImg} alt={t('app_name')} />
          <span className={styles.footerLogoText}>{t('app_name')}</span>
        </div>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} {t('land_footer_copy')}</p>
      </footer>

      <LandingClient />
    </div>
  )
}
