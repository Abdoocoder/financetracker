'use client'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function NotFound() {
  const { lang } = useI18n()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Cairo, sans-serif',
      direction: lang === 'ar' ? 'rtl' : 'ltr',
    }}>
      {/* أيقونة */}
      <div style={{
        width: 120, height: 120, borderRadius: 32,
        background: 'var(--accent-blue-dim)',
        border: '1px solid rgba(59,126,246,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 52, marginBottom: 32,
        boxShadow: '0 0 40px rgba(59,126,246,0.15)',
      }}>🧭</div>

      {/* رقم الخطأ */}
      <div style={{
        fontSize: 96, fontWeight: 900, lineHeight: 1,
        background: 'linear-gradient(135deg, var(--accent-blue-light), var(--accent-green-light))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 16,
        letterSpacing: '-0.04em',
      }}>404</div>

      {/* العنوان */}
      <h1 style={{
        fontSize: 22, fontWeight: 900,
        color: 'var(--text-primary)',
        margin: '0 0 10px',
        textAlign: 'center',
      }}>
        {lang === 'en' ? 'Page Not Found' : 'الصفحة غير موجودة'}
      </h1>

      {/* الوصف */}
      <p style={{
        fontSize: 14, color: 'var(--text-muted)',
        textAlign: 'center', maxWidth: 280,
        lineHeight: 1.7, margin: '0 0 36px',
      }}>
        {lang === 'en'
          ? 'The page you are looking for does not exist or has been moved.'
          : 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'}
      </p>

      {/* أزرار */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '13px 28px', borderRadius: 14,
            background: 'var(--accent-blue)',
            border: 'none', color: 'white',
            fontSize: 14, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 20px rgba(59,126,246,0.3)',
          }}>
            {lang === 'en' ? '🏠 Go Home' : '🏠 الرئيسية'}
          </button>
        </Link>
        <button onClick={() => window.history.back()} style={{
          padding: '13px 28px', borderRadius: 14,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {lang === 'en' ? '← Go Back' : '→ رجوع'}
        </button>
      </div>

      {/* زخرفة */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', overflow: 'hidden', zIndex: -1,
      }}>
        {[
          { top: '10%', left: '5%', size: 300, opacity: 0.04 },
          { top: '60%', right: '5%', size: 200, opacity: 0.03 },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: s.top, left: s.left, right: (s as any).right,
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            opacity: s.opacity,
            filter: 'blur(60px)',
          }} />
        ))}
      </div>
    </div>
  )
}
