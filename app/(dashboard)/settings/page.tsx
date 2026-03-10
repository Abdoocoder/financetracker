'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/lib/toast-context'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', monthly_income: '', currency: 'JOD' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { showToast } = useToast()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) { 
      setProfile(data)
      setForm({ 
        full_name: data.full_name ?? '', 
        monthly_income: data.monthly_income?.toString() ?? '', 
        currency: data.currency ?? 'JOD' 
      })
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showToast('يرجى تسجيل الدخول أولاً', 'error')
      setSaving(false)
      return
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: form.full_name, 
          monthly_income: parseFloat(form.monthly_income) || 0, 
          currency: form.currency 
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      showToast('تم حفظ التغييرات بنجاح', 'success')
    } catch (err: any) {
      showToast('حدث خطأ أثناء الحفظ: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      showToast('تم تسجيل الخروج', 'info')
      router.push('/login')
    } catch (err: any) {
      showToast('حدث خطأ: ' + err.message, 'error')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>الإعدادات</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>بيانات حسابك الشخصي</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-blue flex items-center justify-center text-white font-black text-2xl glow-blue">
            {form.full_name?.charAt(0) || 'م'}
          </div>
          <div>
            <div className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{form.full_name || 'اسمك'}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'الاسم الكامل', key: 'full_name', type: 'text', placeholder: 'عبدالله ابوصغيرة' },
            { label: 'الراتب الشهري (JOD)', key: 'monthly_income', type: 'number', placeholder: '495' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
              <input 
                type={f.type} 
                value={(form as any)[f.key]} 
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                placeholder={f.placeholder} 
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>العملة</label>
            <select 
              value={form.currency} 
              onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
            >
              <option value="JOD">دينار أردني (JOD)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
            </select>
          </div>

          <button 
            onClick={saveProfile} 
            disabled={saving}
            className="w-full py-3.5 rounded-xl gradient-blue text-white font-black text-sm disabled:opacity-50 transition-all"
            style={{ fontFamily: 'inherit' }}
          >
            {saving ? '⏳ جاري...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>الحساب</h3>
        <button 
          onClick={handleLogout}
          className="w-full py-3.5 rounded-xl font-black text-sm transition-all hover:opacity-90"
          style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--accent-red-light)', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'inherit' }}
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
