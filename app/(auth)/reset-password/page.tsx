'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError(t('reset_mismatch')); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(t('reset_error')); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">ف</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('reset_title')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('reset_subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 rounded-2xl border space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {success && <div className="p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{t('reset_success')}</div>}
          {error && <div className="p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}>{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('reset_new')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('reset_confirm')}</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--accent-blue)', opacity: loading ? 0.7 : 1 }}>
            {loading ? t('reset_saving') : t('reset_btn')}
          </button>
        </form>
      </div>
    </div>
  )
}
