'use client'
import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

const COUNTRIES = ['🇯🇴', '🇸🇦', '🇦🇪', '🇰🇼', '🇧🇭', '🇪🇬', '🇲🇦', '🇮🇶', '🇱🇧', '🇴🇲']

export function TestimonialSection({ userId }: { userId: string }) {
  const { lang } = useI18n()
  const [form, setForm] = useState({ name: '', country: '🇯🇴', role: '', stars: 5, text: '' })
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existing, setExisting] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/testimonials?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          setForm({
            name: data.name ?? '',
            country: data.country ?? '🇯🇴',
            role: data.role ?? '',
            stars: data.stars ?? 5,
            text: data.text ?? '',
          })
          setExisting(true)
        }
      })
  }, [userId])

  const handleSubmit = async () => {
    if (!form.name || form.text.length < 20) return
    setSaving(true)
    const res = await fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...form }),
    })
    if (res.ok) { setSubmitted(true); setExisting(true) }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 20, padding: '20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
        ⭐ {lang === 'en' ? 'Share Your Experience' : 'شارك تجربتك'}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.7 }}>
        {lang === 'en'
          ? 'Your review will appear on our landing page after approval.'
          : 'رأيك سيظهر في صفحتنا الرئيسية بعد المراجعة.'}
      </p>

      {submitted ? (
        <div style={{ textAlign: 'center', padding: '20px', background: 'var(--accent-green-dim)', borderRadius: 14, border: '1px solid var(--accent-green-glow)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-green-light)' }}>
            {lang === 'en' ? 'Thank you! Under review.' : 'شكراً! تحت المراجعة.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* النجوم */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700 }}>
              {lang === 'en' ? 'Rating' : 'التقييم'}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, stars: s }))} style={{
                  fontSize: 26, background: 'none', border: 'none', cursor: 'pointer',
                  color: s <= form.stars ? '#F59E0B' : 'var(--border)',
                  transition: 'color 0.15s', padding: 0,
                }}>★</button>
              ))}
            </div>
          </div>

          {/* الاسم والدولة */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
                {lang === 'en' ? 'Name' : 'الاسم'}
              </div>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={lang === 'en' ? 'Your name' : 'اسمك'}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
                {lang === 'en' ? 'Country' : 'الدولة'}
              </div>
              <select
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                style={{ padding: '10px 8px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 20, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* الوظيفة */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
              {lang === 'en' ? 'Job Title (optional)' : 'الوظيفة (اختياري)'}
            </div>
            <input
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder={lang === 'en' ? 'e.g. Software Engineer' : 'مثال: مهندس برمجيات'}
              style={inputStyle}
            />
          </div>

          {/* النص */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>{lang === 'en' ? 'Your Review' : 'رأيك بالتطبيق'}</span>
              <span style={{ color: form.text.length < 20 ? 'var(--accent-red-light)' : 'var(--accent-green-light)' }}>
                {form.text.length}/20+
              </span>
            </div>
            <textarea
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              placeholder={lang === 'en' ? 'What do you like most about FinanceTracker?' : 'ما الذي أعجبك في التطبيق؟'}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || form.text.length < 20}
            style={{
              width: '100%', padding: '13px', borderRadius: 12,
              background: (!form.name || form.text.length < 20) ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none', color: 'white', fontSize: 14, fontWeight: 800,
              cursor: (!form.name || form.text.length < 20) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? '⏳ ...' : existing
              ? (lang === 'en' ? 'Update Review ⭐' : 'تحديث التقييم ⭐')
              : (lang === 'en' ? 'Submit Review ⭐' : 'إرسال التقييم ⭐')}
          </button>

          {existing && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--accent-amber)', fontWeight: 700 }}>
              {lang === 'en' ? '✓ You have a pending/approved review' : '✓ لديك تقييم قيد المراجعة أو موافق عليه'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
