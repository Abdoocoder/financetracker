'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { PushToggle } from '@/components/ui/push-toggle'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', monthly_income: '', currency: 'JOD' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { t, lang, setLang } = useI18n()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile({ ...data, email: user.email })
      setForm({ full_name: data.full_name ?? '', monthly_income: data.monthly_income?.toString() ?? '', currency: data.currency ?? 'JOD' })
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      monthly_income: parseFloat(form.monthly_income) || 0,
      currency: form.currency
    }).eq('id', user.id)
    setSaving(false)
    if (error) { toast.error(t('toast_error_save')); return }
    toast.success(t('toast_settings_saved'))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('settings_title')}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('settings_subtitle')}</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl gradient-blue flex items-center justify-center text-white font-black text-2xl glow-blue">
            {form.full_name?.charAt(0) || 'م'}
          </div>
          <div>
            <div className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{form.full_name || t('settings_name')}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile?.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>{t('settings_name')}</label>
            <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>{t('settings_income')} (JOD)</label>
            <input type="number" value={form.monthly_income} onChange={e => setForm(p => ({ ...p, monthly_income: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
              placeholder="495" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>{t('settings_currency')}</label>
            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              <option value="JOD">دينار أردني (JOD)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
            </select>
          </div>

          {/* تبديل اللغة */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>{t('settings_language')}</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {(['ar', 'en'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="flex-1 py-3 text-sm font-black transition-all"
                  style={{
                    background: lang === l ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: lang === l ? 'white' : 'var(--text-muted)',
                    fontFamily: 'inherit',
                  }}>
                  {l === 'ar' ? '🇯🇴 العربية' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="w-full py-3.5 rounded-xl gradient-blue text-white font-black text-sm disabled:opacity-50"
            style={{ fontFamily: 'inherit' }}>
            {saving ? t('settings_saving') : t('settings_save')}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-black mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>{t('settings_account')}</h3>
        <PushToggle />

        <button onClick={handleLogout}
          className="w-full py-3.5 rounded-xl font-black text-sm"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'inherit' }}>
          🚪 {t('settings_logout')}
        </button>
      </div>
    </div>
  )
}
// Push section added via script — see PushSection component
