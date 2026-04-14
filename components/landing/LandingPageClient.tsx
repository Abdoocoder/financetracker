'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import LandingClient from '@/components/layout/LandingClient'
import { Globe } from 'lucide-react'

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
  const { t, lang, setLang } = useI18n()

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: 'inherit', overflowX: 'hidden' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
      </div>

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.8)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon-512.png" style={{ width: 36, height: 36, borderRadius: 10 }} alt={t('land_app_name')} />
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t('land_app_name')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={() => {
                const newLang = lang === 'ar' ? 'en' : 'ar';
                setLang(newLang);
                // Set cookie for server-side detection on next reload
                document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
              }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, 
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              <Globe size={16} />
              {lang === 'ar' ? 'English' : 'العربية'}
            </button>
            <Link href="/login" style={{ padding: '8px 18px', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{t('land_login')}</Link>
            <Link href="/register" style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('land_start_btn')}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: 'clamp(60px, 10vw, 100px) 20px clamp(40px, 8vw, 80px)', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 36 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D' }}>{t('land_badge')}</span>
        </div>

        <div className="hero-line-1" style={{ fontSize: 'clamp(15px, 3vw, 19px)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.01em' }}>
          {t('land_hero_tease')}
        </div>

        <h1 className="hero-line-2" style={{ fontSize: 'clamp(36px, 8vw, 76px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 6px', letterSpacing: '-0.04em' }}>
          <span style={{ background: 'linear-gradient(135deg, #F59E0B 20%, #FBBF24 50%, #10B981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {t('land_hero_title')}
          </span>
        </h1>

        <div className="hero-line-3" style={{ fontSize: 'clamp(16px, 3.5vw, 22px)', color: 'var(--text-secondary)', fontWeight: 700, margin: '10px 0 28px', letterSpacing: '-0.01em' }}>
          <span style={{ color: '#10B981' }}>{t('app_name')}</span> {t('land_hero_answer')}
        </div>

        <p className="hero-line-4" style={{ fontSize: 'clamp(14px, 3.5vw, 17px)', color: 'var(--text-muted)', lineHeight: 1.8, maxWidth: 480, margin: '0 auto 32px' }}>
          {t('land_hero_desc')}
        </p>
        <div className="hero-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: 400, margin: '0 auto' }}>
          <Link href="/register" style={{ flex: 1, minWidth: 160, padding: '13px 20px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 15, fontWeight: 900, textDecoration: 'none', textAlign: 'center', boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}>{t('land_cta_start')}</Link>
          <a href="#features" style={{ flex: 1, minWidth: 120, padding: '13px 20px', borderRadius: 14, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>{t('land_cta_how')}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {[t('land_feature_free'), t('land_feature_no_card'), t('land_feature_halal')].map((text, i) => (
            <span key={i} style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{text}</span>
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>{t('land_designed_for')}</div>

        <div style={{ marginTop: 28 }}>
          <Link href="/download" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            {t('land_download_android')}
          </Link>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', background: 'var(--bg-card)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--bg-elevated)', maxWidth: 300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>fajrak.com/dashboard</span>
            </div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>{t('land_preview_title')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('land_preview_subtitle')}</div>
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 12, fontWeight: 700 }}>🔔 3</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: t('dash_income'), value: '+2,400', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { label: t('dash_expenses'), value: '1,250', color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
                { label: t('dash_net'), value: '+1,150', color: '#3B7EF6', bg: 'rgba(59,126,246,0.08)' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(16,185,129,0.05))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>{t('land_roadmap_title')}</div>
                <div style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{t('land_roadmap_stage2')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[t('stage1'), t('stage2'), t('stage3'), t('stage4')].map((stage, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= 1 ? (i === 1 ? '#F59E0B' : '#10B981') : 'var(--bg-elevated)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>72<span style={{ fontSize: 14 }}>/100</span></div>
                <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t('land_roadmap_next')}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{t('land_roadmap_next_step')}</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{t('land_chart_title')}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                {[{i:40,e:30},{i:55,e:45},{i:35,e:50},{i:70,e:40},{i:60,e:35},{i:80,e:55}].map((bar, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '45%', height: `${bar.i}%`, background: 'rgba(16,185,129,0.6)', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: '45%', height: `${bar.e}%`, background: 'rgba(239,68,68,0.5)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* المشكلة */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-blue-light)', textTransform: 'uppercase', marginBottom: 12 }}>{t('land_problem_tag')}</div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{t('land_problem_title')}</h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>{t('land_problem_desc')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {[
            { icon: '📱', title: t('land_prob1_title'), desc: t('land_prob1_desc') },
            { icon: '💸', title: t('land_prob2_title'), desc: t('land_prob2_desc') },
            { icon: '🌍', title: t('land_prob3_title'), desc: t('land_prob3_desc') },
            { icon: '🎯', title: t('land_prob4_title'), desc: t('land_prob4_desc') },
          ].map((p, i) => (
            <div key={i} style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 14, left: lang === 'ar' ? 14 : 'auto', right: lang === 'en' ? 14 : 'auto', fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 10px', borderRadius: 100 }}>{t('land_solved')}</div>
              <div style={{ fontSize: 24, marginBottom: 12, marginTop: 8 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* رحلة الحرية المالية */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#F59E0B', textTransform: 'uppercase', marginBottom: 12 }}>{t('land_journey_tag')}</div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            {t('land_journey_title')}<br />
            <span style={{ background: 'linear-gradient(135deg, #F59E0B, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{t('land_journey_subtitle')}</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
            {t('land_journey_desc')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { num: '01', icon: '🌱', stage: t('land_step1_title'), desc: t('land_step1_desc'), quote: t('land_step1_quote'), color: '#8B5CF6', active: false },
            { num: '02', icon: '💳', stage: t('land_step2_title'), desc: t('land_step2_desc'), quote: t('land_step2_quote'), color: '#EF4444', active: false },
            { num: '03', icon: '🛡️', stage: t('land_step3_title'), desc: t('land_step3_desc'), quote: t('land_step3_quote'), color: '#F59E0B', active: false },
            { num: '04', icon: '📈', stage: t('land_step4_title'), desc: t('land_step4_desc'), quote: t('land_step4_quote'), color: '#10B981', active: false },
            { num: '05', icon: '👑', stage: t('land_step5_title'), desc: t('land_step5_desc'), quote: t('land_step5_quote'), color: '#3B7EF6', active: true },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, padding: '20px 24px', borderRadius: 16,
              background: step.active ? 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))' : 'var(--bg-card)',
              border: `1px solid ${step.active ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`,
              alignItems: 'flex-start',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${step.color}15`, border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: step.color, background: `${step.color}15`, padding: '2px 8px', borderRadius: 100 }}>{step.num}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{step.stage}</span>
                  {step.active && <span style={{ fontSize: 10, fontWeight: 700, color: '#3B7EF6', background: 'rgba(59,126,246,0.1)', padding: '2px 8px', borderRadius: 100 }}>🎯 {lang === 'ar' ? 'الهدف النهائي' : 'Ultimate Goal'}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{step.desc}</div>
                <div style={{ fontSize: 11, color: step.color, fontStyle: 'italic', opacity: 0.8 }}>{step.quote}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 15, fontWeight: 900, textDecoration: 'none', boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }}>
            {t('land_start_journey')}
          </Link>
        </div>
      </section>

      {/* الميزات */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-blue-light)', textTransform: 'uppercase', marginBottom: 12 }}>{t('land_features_tag')}</div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{t('land_features_title')}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
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
            <div key={i} style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', position: 'relative' }}>
              {f.badge && (
                <div style={{ position: 'absolute', top: 14, left: lang === 'ar' ? 14 : 'auto', right: lang === 'en' ? 14 : 'auto', padding: '3px 10px', borderRadius: 100, background: `${f.badgeColor}22`, border: `1px solid ${f.badgeColor}44`, fontSize: 11, fontWeight: 700, color: f.badgeColor }}>{f.badge}</div>
              )}
              <div style={{ fontSize: 28, marginBottom: 14, marginTop: f.badge ? 8 : 0 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* خارطة الثراء */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ borderRadius: 24, background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(59,126,246,0.2)', padding: 'clamp(32px, 5vw, 56px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59,126,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🗺️</div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.25)', fontSize: 11, fontWeight: 700, color: 'var(--accent-blue-light)', marginBottom: 6 }}>{t('land_exclusive')}</div>
              <h3 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{t('land_roadmap_full_title')}</h3>
            </div>
          </div>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32, maxWidth: 600 }}>
            {t('land_roadmap_full_desc')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { icon: '🎯', title: t('land_roadmap_point1_title'), desc: t('land_roadmap_point1_desc') },
              { icon: '💯', title: t('land_roadmap_point2_title'), desc: t('land_roadmap_point2_desc') },
              { icon: '💪', title: t('land_roadmap_point3_title'), desc: t('land_roadmap_point3_desc') },
              { icon: '👣', title: t('land_roadmap_point4_title'), desc: t('land_roadmap_point4_desc') },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* شهادات المستخدمين */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{t('land_testimonials_title')}</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>{t('land_testimonials_subtitle')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {testimonialsList.map((t, i) => (
            <div key={i} style={{ padding: 24, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array(t.stars).fill(0).map((_, s) => (
                  <span key={s} style={{ color: '#F59E0B', fontSize: 14 }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, flex: 1 }}>{t.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: 'white' }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{t.name} {t.country}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* الأسعار */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>{t('land_pricing_title')}</h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>{t('land_pricing_subtitle')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ padding: 28, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('land_price_free')}</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{t('land_price_forever')}</div>
            {(t('land_pricing_features') as unknown as string[]).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
            <Link href="/register" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>{t('land_cta_start')}</Link>
          </div>
          <div style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, rgba(59,126,246,0.06), rgba(139,92,246,0.06))', border: '1px solid rgba(59,126,246,0.2)', position: 'relative', overflow: 'hidden', opacity: 0.85 }}>
            <div style={{ position: 'absolute', top: 16, left: lang === 'ar' ? 16 : 'auto', right: lang === 'en' ? 16 : 'auto', padding: '4px 10px', borderRadius: 100, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)', fontSize: 11, fontWeight: 800 }}>{lang === 'ar' ? 'قريباً' : 'Soon'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>{lang === 'ar' ? 'قريباً' : 'Soon'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>{lang === 'ar' ? 'نعمل عليها الآن' : 'In the works'}</div>
            {[
              '🤖 AI Advisor',
              '📸 OCR Scanning',
              '📊 Advanced Analytics',
              '🔔 Custom Push Alerts',
              '🔗 Bank Connections',
              '⭐ Priority Support',
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#A78BFA', fontSize: 14 }}>◇</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{f}</span>
              </div>
            ))}
            <div style={{ marginTop: 24, padding: '14px', borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#A78BFA', fontWeight: 900, marginBottom: 6 }}>🎁 Special Offer</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>50% discount for early adopters</div>
              <Link href="/register" style={{ display: 'block', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: 'white', fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
                {lang === 'ar' ? 'سجّل الآن واحجز مكانك ←' : 'Register & Reserve Your Spot →'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* الرؤية */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.06), rgba(16,185,129,0.04))', border: '1px solid rgba(59,126,246,0.15)', borderRadius: 24, padding: 'clamp(32px, 6vw, 56px)' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🌅</div>
          <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 20, letterSpacing: '-0.02em' }}>
            {t('land_vision_title')}
          </h2>
          <p style={{ fontSize: 'clamp(15px, 3vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 28, maxWidth: 600, margin: '0 auto 28px' }}>
            {t('land_vision_desc')}
          </p>
          <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
            {[
              { icon: '🕌', title: t('land_v1_title'), desc: t('land_v1_desc') },
              { icon: '🎓', title: t('land_v2_title'), desc: t('land_v2_desc') },
              { icon: '🔒', title: t('land_v3_title'), desc: t('land_v3_desc') },
              { icon: '🆓', title: t('land_v4_title'), desc: t('land_v4_desc') },
            ].map((v, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {lang === 'ar' ? '&quot;كل رحلة ثراء تبدأ بخطوة&quot; — بُني بـ ❤️ من الأردن للعالم العربي' : '&quot;Every wealth journey starts with a step&quot; — Built with ❤️ from Jordan for the Arab World'}
          </p>
        </div>
      </section>

      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '32px 24px 100px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <img src="/icon-512.png" style={{ width: 28, height: 28, borderRadius: 8 }} alt={t('app_name')} />
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{t('app_name')}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>© {new Date().getFullYear()} {t('land_footer_copy')}</p>
      </footer>

      <LandingClient />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-line-1 { animation: fadeUp 0.6s ease both; }
        .hero-line-2 { animation: fadeUp 0.6s ease 0.25s both; }
        .hero-line-3 { animation: fadeUp 0.6s ease 0.5s both; }
        .hero-line-4 { animation: fadeUp 0.6s ease 0.75s both; }
        .hero-cta    { animation: fadeUp 0.6s ease 1s both; }
      `}</style>
    </div>
  )
}
