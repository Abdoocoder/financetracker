'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > window.innerHeight * 0.8)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', direction: 'rtl', fontFamily: 'inherit', overflowX: 'hidden' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,126,246,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)' }} />
      </div>

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.8)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 16 }}>ف</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>FinanceTracker</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ padding: '8px 18px', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>تسجيل الدخول</Link>
            <Link href="/register" style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent-blue)', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>ابدأ ←</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: 'clamp(60px, 10vw, 100px) 20px clamp(40px, 8vw, 80px)', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(59,126,246,0.08)', border: '1px solid rgba(59,126,246,0.2)', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue-light)' }}>متاح لجميع دول العالم</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 64px)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
          وين راح<br />
          <span style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>راتبك هذا الشهر؟</span>
        </h1>
        <p style={{ fontSize: 'clamp(14px, 4vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 28px' }}>
          تتبع دخلك ومصاريفك وديونك واستثماراتك في مكان واحد — بدل ما تنقّل بين تطبيقات وأوراق.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: 400, margin: '0 auto' }}>
          <Link href="/register" style={{ flex: 1, minWidth: 160, padding: '13px 20px', borderRadius: 14, background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)', color: 'white', fontSize: 15, fontWeight: 900, textDecoration: 'none', textAlign: 'center' as const, boxShadow: '0 0 30px rgba(59,126,246,0.35)' }}>ابدأ مجاناً ←</Link>
          <Link href="/login" style={{ flex: 1, minWidth: 120, padding: '13px 20px', borderRadius: 14, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' as const }}>لدي حساب</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {['✓ مجاني للأبد', '✓ بدون بطاقة ائتمانية', '✓ تسجيل في 30 ثانية'].map((t, i) => (
            <span key={i} style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>🇯🇴🇸🇦🇦🇪🇪🇬🇲🇦 مستخدمون من أكثر من 10 دول</div>

        {/* زر تنزيل Android — يوجّه لصفحة منفصلة */}
        <div style={{ marginTop: 28 }}>
          <Link href="/download" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 12,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#10B981', fontSize: 13, fontWeight: 700,
            textDecoration: 'none',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C3.4925 10.4609 2 13.0197 2 16h20c0-2.9803-1.4925-5.5391-4.1185-6.6786"/>
            </svg>
            تطبيق Android متاح — تنزيل
          </Link>
        </div>
      </section>

      {/* باقي الصفحة كما هي — Dashboard Preview, Problems, Features, Pricing, FAQ, CTA, Footer */}

      {/* Sticky CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(10,12,18,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(59,126,246,0.2)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, transform: showSticky ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.4s ease' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>جاهز تتحكم في أموالك؟</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>مجاني تماماً · بدون بطاقة ائتمانية</div>
        </div>
        <Link href="/register" style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--accent-blue)', color: 'white', fontSize: 15, fontWeight: 900, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(59,126,246,0.4)' }}>ابدأ الآن ←</Link>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
