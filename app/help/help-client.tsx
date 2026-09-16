'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function HelpClient() {
  const { t, lang, setLang } = useI18n()
  const [search, setSearch] = useState('')

  const handleLangToggle = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
  }

  const faqData = t('faqs') as any[] || []

  const filtered = faqData.map(section => ({
    ...section,
    items: section.items.filter((item: any) => {
      const q = item.q || ''
      const a = item.a || ''
      return q.includes(search) || a.includes(search)
    })
  })).filter(s => s.items.length > 0)

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", direction: lang === 'ar' ? 'rtl' : 'ltr', color: "var(--text-primary)", fontFamily: 'inherit' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.85)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 16 }}>{t('app_name')[0]}</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)' }}>{t('app_name')}</span>
          </Link>
          <button
            onClick={handleLangToggle}
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
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>{t('help_title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>{t('help_subtitle')}</p>

        <input
          type="text"
          placeholder={t('help_search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 14,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 14, outline: 'none',
            boxSizing: 'border-box', marginBottom: 24,
          }}
        />

        {filtered.map((section, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.05em' }}>
              {section.section}
            </div>
            {section.items.map((item: any, j: number) => (
              <FAQItem key={j} q={item.q} a={item.a} lang={lang} />
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {t('help_no_results')}
            </div>
          </div>
        )}

        <div style={{ padding: '20px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)', textAlign: 'center', marginTop: 24 }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>🤝</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            {t('help_contact')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            {t('help_contact_sub')}
          </div>
          <a href="mailto:support@fajrak.com" style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 12,
            background: 'var(--accent-blue)', color: 'white',
            fontSize: 13, fontWeight: 800, textDecoration: 'none',
          }}>
            📧 {t('help_contact_btn')}
          </a>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
          <Link href="/" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{t('priv_back')}</Link>
        </div>
      </div>
    </div>
  )
}

function FAQItem({ q, a, lang }: { q: string; a: string; lang: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '14px 16px', background: open ? 'var(--bg-elevated)' : 'var(--bg-card)',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textAlign: lang === 'ar' ? 'right' : 'left', flex: 1 }}>{q}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px 14px', background: 'var(--bg-primary)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  )
}