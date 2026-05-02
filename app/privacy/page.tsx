'use client'
import Link from "next/link"
import { useI18n } from "@/lib/i18n"
import { Globe } from "lucide-react"

export default function PrivacyPage() {
  const { t, lang, setLang } = useI18n()

  const handleLangToggle = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
  }

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", direction: lang === 'ar' ? 'rtl' : 'ltr', color: "var(--text-primary)", fontFamily: 'inherit' }}>
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
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>{t('priv_title')}</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>{t('priv_last_updated')}</p>

        <section style={{ marginBottom: 32, padding: '24px', borderRadius: 16, background: 'var(--accent-blue-dim)', border: '1px solid var(--accent-blue-border)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-green)", marginBottom: 12 }}>{t('priv_s_who_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>
            {t('priv_s_who_desc')}
          </p>
          <ul style={{ lineHeight: 2, color: "var(--text-secondary)", paddingRight: lang === 'ar' ? 20 : 0, paddingLeft: lang === 'en' ? 20 : 0, marginTop: 12 }}>
            <li>{t('priv_s_who_l1')}</li>
            <li>{t('priv_s_who_l2')}</li>
            <li>{t('priv_s_who_l3')}</li>
            <li>{t('priv_s_who_l4')}</li>
            <li>{t('priv_s_who_l5')}</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s1_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s1_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s2_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s2_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s3_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s3_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s4_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s4_desc')}</p>
          <ul style={{ lineHeight: 2, color: "var(--text-secondary)", paddingRight: lang === 'ar' ? 20 : 0, paddingLeft: lang === 'en' ? 20 : 0, marginTop: 12 }}>
            <li>🔹 <strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> — {t('priv_s4_l1')}</li>
            <li>🔹 <strong style={{ color: 'var(--text-primary)' }}>Firebase (Google)</strong> — {t('priv_s4_l2')}</li>
            <li>🔹 <strong style={{ color: 'var(--text-primary)' }}>Vercel</strong> — {t('priv_s4_l3')}</li>
            <li>🔹 <strong style={{ color: 'var(--text-primary)' }}>CoinGecko</strong> — {t('priv_s4_l4')}</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s5_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s5_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s6_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s6_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s7_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>{t('priv_s7_desc')}</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-blue)", marginBottom: 12 }}>{t('priv_s8_title')}</h3>
          <p style={{ lineHeight: 1.8, color: "var(--text-muted)" }}>
            {t('priv_s8_desc')}: <a href="mailto:support@fajrak.com" style={{ color: "var(--accent-blue)" }}>support@fajrak.com</a>
          </p>
        </section>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, color: "var(--text-secondary)", fontSize: 13 }}>
          <Link href="/" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>{t('priv_back')}</Link>
        </div>
      </div>
    </div>
  )
}