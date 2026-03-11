'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { PushToggle } from '@/components/ui/push-toggle'

export default function SettingsPage() {
  const [form, setForm] = useState({ full_name: '', monthly_income: '', currency: 'JOD', salary_day: '1' })
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const { t, lang, setLang } = useI18n()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm({ full_name: data.full_name ?? '', monthly_income: data.monthly_income?.toString() ?? '', currency: data.currency ?? 'JOD', salary_day: data.salary_day?.toString() ?? '1' })
    }
    load()
  }, [supabase])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: form.full_name, monthly_income: parseFloat(form.monthly_income) || 0, currency: form.currency, salary_day: parseInt(form.salary_day) || 1, updated_at: new Date().toISOString() })
    if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
    toast.success(t('toast_saved'))
    setSaving(false)
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = form.full_name ? form.full_name.slice(0, 2) : userEmail.slice(0, 2).toUpperCase()

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={t('settings_title')} subtitle="بيانات حسابك الشخصي" />

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: 'white', boxShadow: '0 4px 16px var(--accent-blue-glow)' }}>{initials}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{form.full_name || t('settings_title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{userEmail}</div>
          </div>
        </div>

        <FormField label="الاسم الكامل">
          <Input placeholder="الاسم الكامل" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </FormField>
        <FormField label="الراتب الشهري (JOD)">
          <Input type="number" placeholder="0" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} />
        </FormField>
        <FormField label="يوم استلام الراتب (1-28)">
          <Input type="number" placeholder="1" min="1" max="28" value={form.salary_day} onChange={e => setForm(f => ({ ...f, salary_day: e.target.value }))} />
        </FormField>
        <FormField label="العملة">
          <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            <option value="JOD">دينار أردني (JOD)</option>
            <option value="USD">دولار (USD)</option>
            <option value="EUR">يورو (EUR)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
          </Select>
        </FormField>
        <FormField label="اللغة">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['ar', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '11px', borderRadius: 10, background: lang === l ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)', border: `1px solid ${lang === l ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`, color: lang === l ? 'var(--accent-blue-light)' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {l === 'ar' ? '🇯🇴 العربية' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </FormField>
        <SaveButton label="حفظ التغييرات" loading={saving} onClick={handleSave} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>الحساب</div>
        <PushToggle />
        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
        <button onClick={handleLogout} disabled={loggingOut} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: loggingOut ? 0.5 : 1 }}>
          {loggingOut ? '⏳ ...' : `$"تسجيل الخروج" ←`}
        </button>
      </div>
    </div>
  )
}
