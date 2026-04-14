'use client'
import Link from "next/link"
import { useI18n } from "@/lib/i18n"
import { Globe } from "lucide-react"

export default function TermsPage() {
  const { t, lang, setLang } = useI18n()

  const handleLangToggle = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
  }

  return (
    <div style={{ background: "#070B14", minHeight: "100vh", direction: lang === 'ar' ? 'rtl' : 'ltr', color: "#e2e8f0", fontFamily: 'inherit' }}>
       <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.85)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 16 }}>{t('app_name')[0]}</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)' }}>{t('app_name')}</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>{t('terms_title')}</h1>
        <p style={{ color: "#64748b", marginBottom: 32 }}>{t('terms_last_updated')}</p>

        <section style={{ marginBottom: 32, padding: '24px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.2)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>⚖️ {t('terms_s_nature_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
            {t('terms_s_nature_desc')}
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>1. {t('terms_s1_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>{t('terms_s1_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>2. {t('terms_s2_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>{t('terms_s2_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>3. {t('terms_s3_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>{t('terms_s3_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>4. {t('terms_s4_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>{t('terms_s4_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#10B981", marginBottom: 12 }}>5. {t('terms_s5_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>{t('terms_s5_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#3B7EF6", marginBottom: 12 }}>6. {t('terms_s6_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "#cbd5e1" }}>
            {t('terms_s6_desc')}: <a href="mailto:legal@fajrak.com" style={{ color: "#3B7EF6" }}>legal@fajrak.com</a>
          </p>
        </section>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 24, color: "#475569", fontSize: 13 }}>
          <Link href="/" style={{ color: "#3B7EF6", textDecoration: "none" }}>{t('terms_back')}</Link>
        </div>
      </div>
    </div>
  )
}
