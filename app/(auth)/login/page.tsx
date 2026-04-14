'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(t('auth_error_login'))
      setLoading(false)
    } else {
      router.refresh()
      await new Promise(r => setTimeout(r, 100))
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            {t('app_name')[0]}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('auth_login_title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('auth_login_subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 rounded-2xl border space-y-5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {error && (
            <div className="p-3 rounded-lg text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('auth_email')}</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('auth_password')}</label>
              <a href="/forgot-password" style={{ fontSize: 12, color: 'var(--accent-blue-light)', textDecoration: 'none', fontWeight: 600 }}>{t('auth_forgot_link')}</a>
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-blue text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? t('auth_btn_verifying') : t('auth_btn_login')}
          </button>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('auth_no_account')}{' '}
            <Link href="/register" style={{ color: 'var(--accent-blue)' }} className="hover:underline font-medium">
              {t('auth_register_link')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
