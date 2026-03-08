'use client'
// app/(auth)/register/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Update profile with income
      if (monthlyIncome) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('profiles').update({ monthly_income: parseFloat(monthlyIncome) }).eq('id', user.id)
        }
      }
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-blue flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">ف</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ابدأ رحلتك المالية</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>حساب مجاني — لا بطاقة مطلوبة</p>
        </div>

        <form onSubmit={handleRegister} className="p-8 rounded-2xl border space-y-5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {error && (
            <div className="p-3 rounded-lg text-sm text-center"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>الاسم الكامل</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="عبدالله أبو صغيرة" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="6 أحرف على الأقل" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              الراتب الشهري <span style={{ color: 'var(--text-muted)' }}>(دينار — اختياري)</span>
            </label>
            <input type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="495" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl gradient-blue text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب مجاني'}
          </button>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            لديك حساب؟{' '}
            <Link href="/login" style={{ color: 'var(--accent-blue)' }} className="hover:underline font-medium">
              سجل الدخول
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
