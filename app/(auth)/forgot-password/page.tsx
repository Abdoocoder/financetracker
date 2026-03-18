'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/confirm?next=/reset-password`,
    })
    if (error) setError('حدث خطأ — تأكد من البريد الإلكتروني')
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">ف</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>نسيت كلمة المرور؟</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>أدخل بريدك وسنرسل لك رابط الاسترجاع</p>
        </div>

        {sent ? (
          <div className="p-8 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-center">
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>تم الإرسال!</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                تحقق من بريدك الإلكتروني واضغط على الرابط لإعادة تعيين كلمة المرور.
              </div>
              <Link href="/login" style={{ color: 'var(--accent-blue-light)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                ← العودة لتسجيل الدخول
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 rounded-2xl border space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {error && (
              <div className="p-3 rounded-lg text-sm text-center" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white"
              style={{ background: 'var(--accent-blue)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاسترجاع'}
            </button>
            <div className="text-center">
              <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
                ← العودة لتسجيل الدخول
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
