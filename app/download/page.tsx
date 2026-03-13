'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => setDownloading(false), 3000)
    window.location.href = 'https://github.com/Abdoocoder/financetracker/raw/main/releases/FinanceTracker-v1.0.apk'
  }

  return (
    <div style={{
      background: 'var(--bg-primary)',
      minHeight: '100vh',
      direction: 'rtl',
      fontFamily: 'inherit',
      overflowX: 'hidden',
    }}>

      {/* خلفية */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,126,246,0.06) 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.85)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 16 }}>ف</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>FinanceTracker</span>
          </Link>
          <Link href="/register" style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--accent-blue)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>ابدأ مجاناً ←</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', padding: 'clamp(50px, 8vw, 90px) 24px 40px', textAlign: 'center' }}>

        {/* أيقونة Android */}
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 40px rgba(16,185,129,0.15)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#10B981">
            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C3.4925 10.4609 2 13.0197 2 16h20c0-2.9803-1.4925-5.5391-4.1185-6.6786"/>
          </svg>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>الإصدار v1.0.0 — متاح الآن</span>
        </div>

        <h1 style={{ fontSize: 'clamp(26px, 5vw, 48px)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
          FinanceTracker
          <br />
          <span style={{ background: 'linear-gradient(135deg, #10B981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            لأجهزة Android
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(14px, 3vw, 17px)', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 36px' }}>
          نفس تجربة الويب الكاملة — في جيبك. تتبع مصاريفك، ديونك، وأهدافك أينما كنت.
        </p>

        {/* زر التنزيل الرئيسي */}
        <button
          onClick={handleDownload}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '16px 40px', borderRadius: 16,
            background: downloading
              ? 'linear-gradient(135deg, #059669, #047857)'
              : 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white', fontSize: 17, fontWeight: 900,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 0 40px rgba(16,185,129,0.4), 0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            transform: downloading ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {downloading ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              جاري التنزيل...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              تنزيل APK — مجاني
            </>
          )}
        </button>

        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          FinanceTracker-v1.0.apk · ~15 MB · Android 8.0+
        </div>
      </section>

      {/* خطوات التثبيت */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 32, letterSpacing: '-0.02em' }}>
          كيف تثبّت التطبيق؟
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { n: '1', title: 'نزّل ملف الـ APK', desc: 'اضغط على زر التنزيل أعلاه وانتظر اكتمال التحميل.' },
            { n: '2', title: 'فعّل "مصادر غير معروفة"', desc: 'اذهب لـ الإعدادات ← الأمان ← السماح بتثبيت تطبيقات من مصادر غير معروفة.' },
            { n: '3', title: 'افتح ملف الـ APK', desc: 'اذهب لمجلد التنزيلات، افتح الملف، واضغط "تثبيت".' },
            { n: '4', title: 'سجّل دخولك', desc: 'افتح التطبيق وسجّل دخولك بنفس حسابك على الويب — بياناتك محفوظة.' },
          ].map((step) => (
            <div key={step.n} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              padding: '18px 20px', borderRadius: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 900, color: '#10B981',
              }}>{step.n}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ميزات التطبيق */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 28, letterSpacing: '-0.02em' }}>
          ما الذي ستحصل عليه؟
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '📊', label: 'لوحة تحكم كاملة' },
            { icon: '💳', label: 'تتبع الديون' },
            { icon: '🗺️', label: 'خارطة الثراء' },
            { icon: '📈', label: 'تتبع الاستثمارات' },
            { icon: '🔔', label: 'تنبيهات ذكية' },
            { icon: '🎯', label: 'أهداف الادخار' },
            { icon: '🌐', label: 'عربي + English' },
            { icon: '🔒', label: 'بيانات آمنة 100%' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* تنبيه أمان */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          padding: '20px 24px', borderRadius: 14,
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🔐</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#F59E0B', marginBottom: 6 }}>ملاحظة أمان</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              هذا التطبيق يُوزَّع كـ APK مباشر خارج Google Play. الكود مفتوح المصدر بالكامل على{' '}
              <a href="https://github.com/Abdoocoder/financetracker" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue-light)', textDecoration: 'none', fontWeight: 700 }}>GitHub</a>
              {' '}— يمكنك مراجعته في أي وقت. لا نجمع بياناتك إلا ما تُدخله أنت.
            </div>
          </div>
        </div>
      </section>

      {/* CTA ثانوي */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          تفضّل متصفح الويب؟ جرّب النسخة الكاملة مجاناً
        </p>
        <Link href="/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 12,
          border: '1px solid var(--border)', color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}>
          ابدأ على الويب ←
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 13 }}>ف</div>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>FinanceTracker</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>© {new Date().getFullYear()} FinanceTracker — إدارة مالية ذكية للعالم العربي</p>
      </footer>
    </div>
  )
}
