'use client'
// app/(auth)/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
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
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">ف</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>مرحباً بعودتك</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>سجل دخولك لمتابعة وضعك المالي</p>
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
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>كلمة المرور</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-blue text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            ليس لديك حساب؟{' '}
            <Link href="/register" style={{ color: 'var(--accent-blue)' }} className="hover:underline font-medium">
              سجل مجاناً
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
