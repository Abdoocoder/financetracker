'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'

export default function HelpPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')

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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title={t('help_title')}
        subtitle={t('help_subtitle')}
      />

      {/* بحث */}
      <input
        type="text"
        placeholder={t('help_search')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', fontSize: 14, outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* الأسئلة */}
      {filtered.map((section, i) => (
        <div key={i}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.05em' }}>
            {section.section}
          </div>
          {section.items.map((item: any, j: number) => (
            <FAQItem key={j} q={item.q} a={item.a} />
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

      {/* تواصل */}
      <div style={{ padding: '20px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)', textAlign: 'center' }}>
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
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '14px 16px', background: open ? 'var(--bg-elevated)' : 'var(--bg-card)',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right', flex: 1 }}>{q}</span>
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
