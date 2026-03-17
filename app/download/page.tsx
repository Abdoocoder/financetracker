'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function DownloadPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', direction: 'rtl', fontFamily: 'inherit' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.85)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 16 }}>ف</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)' }}>فجرك</span>
          </Link>
          <Link href="/register" style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--accent-blue)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>ابدأ مجاناً ←</Link>
        </div>
      </nav>

      <section style={{ maxWidth: 600, margin: '0 auto', padding: 'clamp(60px, 10vw, 100px) 24px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>📱</div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, background: 'rgba(59,126,246,0.08)', border: '1px solid rgba(59,126,246,0.2)', marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue-light)' }}>قريباً — Coming Soon</span>
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
          فجرك على
          <br />
          <span style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-blue-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Android</span>
        </h1>

        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 40 }}>
          نعمل على تطبيق Android native لتجربة أفضل مع إشعارات حقيقية تصلك حتى لو التطبيق مغلق.
        </p>

        {!submitted ? (
          <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto 40px' }}>
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', textAlign: 'right' }}
            />
            <button
              onClick={() => { if (email) setSubmitted(true) }}
              style={{ padding: '12px 20px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              أبلغني 🔔
            </button>
          </div>
        ) : (
          <div style={{ padding: '16px 24px', borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 40, color: '#10B981', fontWeight: 700 }}>
            ✅ سنبلغك فور إطلاق التطبيق!
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 40 }}>
          {[
            { icon: '🔔', label: 'إشعارات Native' },
            { icon: '⚡', label: 'أداء أسرع' },
            { icon: '📴', label: 'يعمل offline' },
          ].map((f, i) => (
            <div key={i} style={{ padding: '16px 12px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{f.label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>في الوقت الحالي يمكنك استخدام النسخة الكاملة على المتصفح</p>
        <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          ابدأ على الويب ←
        </Link>
      </section>
    </div>
  )
}
