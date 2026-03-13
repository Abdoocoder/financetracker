'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme-context'
import { PageHeader } from '@/components/ui/page-header'
import { FormField, Input, Select, SaveButton } from '@/components/ui/form-field'
import { PushToggle } from '@/components/ui/push-toggle'

export default function SettingsPage() {
  const [form, setForm] = useState({ full_name: '', monthly_income: '', currency: 'JOD', salary_day: '1' })
  const [assets, setAssets] = useState({ real_estate: '', vehicles: '', jewelry: '', other_assets: '' })
  const [assetsUpdatedAt, setAssetsUpdatedAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingAssets, setSavingAssets] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const { user: currentUser } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    async function load() {
      const user = currentUser
      if (!user) return
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm({ full_name: data.full_name ?? '', monthly_income: data.monthly_income?.toString() ?? '', currency: data.currency ?? 'JOD', salary_day: data.salary_day?.toString() ?? '1' })
        setAssets({
          real_estate: data.asset_real_estate?.toString() ?? '',
          vehicles: data.asset_vehicles?.toString() ?? '',
          jewelry: data.asset_jewelry?.toString() ?? '',
          other_assets: data.asset_other?.toString() ?? '',
        })
        setAssetsUpdatedAt(data.assets_updated_at ?? null)
      }
    }
    load()
  }, [supabase])

  async function handleSave() {
    setSaving(true)
    const user = currentUser
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: form.full_name, monthly_income: parseFloat(form.monthly_income) || 0, currency: form.currency, salary_day: parseInt(form.salary_day) || 1, updated_at: new Date().toISOString() })
    if (error) { toast.error(t('toast_error_save')); setSaving(false); return }
    toast.success(t('toast_saved'))
    setSaving(false)
  }

  async function handleSaveAssets() {
    setSavingAssets(true)
    const user = currentUser
    if (!user) return
    const now = new Date().toISOString()
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      asset_real_estate: parseFloat(assets.real_estate) || 0,
      asset_vehicles: parseFloat(assets.vehicles) || 0,
      asset_jewelry: parseFloat(assets.jewelry) || 0,
      asset_other: parseFloat(assets.other_assets) || 0,
      assets_updated_at: now,
    })
    if (error) { toast.error(t('toast_error_save')); setSavingAssets(false); return }
    setAssetsUpdatedAt(now)
    toast.success(t('toast_saved'))
    setSavingAssets(false)
  }

  async function handleExportCSV() {
    setExportLoading(true)
    const user = currentUser
    if (!user) return
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false })
    if (!data?.length) { toast.error(t('settings_no_export')); setExportLoading(false); return }
    const headers = lang === 'en' ? ['Date','Type','Amount','Category','Description'] : ['التاريخ','النوع','المبلغ','الفئة','الوصف']
    const rows = data.map(t => [t.transaction_date, t.type === 'income' ? (lang === 'en' ? 'Income' : 'دخل') : (lang === 'en' ? 'Expense' : 'مصروف'), t.amount, t.category ?? '', t.description ?? ''])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `financetracker-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success(t('settings_export_ok'))
    setExportLoading(false)
  }

  async function handleDeleteAccount() {
    const user = currentUser
    if (!user || deleteInput !== 'حذف حسابي') return
    setDeletingAccount(true)
    await supabase.from('transactions').delete().eq('user_id', user.id)
    await supabase.from('debts').delete().eq('user_id', user.id)
    await supabase.from('investments').delete().eq('user_id', user.id)
    await supabase.from('savings_goals').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/register')
  }

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalAssets = (parseFloat(assets.real_estate) || 0) + (parseFloat(assets.vehicles) || 0) + (parseFloat(assets.jewelry) || 0) + (parseFloat(assets.other_assets) || 0)
  const initials = form.full_name ? form.full_name.slice(0, 2) : userEmail.slice(0, 2).toUpperCase()

  const assetsAge = assetsUpdatedAt ? Math.floor((Date.now() - new Date(assetsUpdatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) : null

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={t('settings_title')} subtitle={t('settings_subtitle')} />

      {/* الملف الشخصي */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: 'white', boxShadow: '0 4px 16px var(--accent-blue-glow)' }}>{initials}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{form.full_name || t('settings_title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{userEmail}</div>
          </div>
        </div>
        <FormField label={lang === "en" ? "Full Name" : "الاسم الكامل"}>
          <Input placeholder={lang === "en" ? "Full Name" : "الاسم الكامل"} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </FormField>
        <FormField label={lang === "en" ? "Monthly Salary (JOD)" : "الراتب الشهري (JOD)"}>
          <Input type="number" placeholder="0" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} />
        </FormField>
        <FormField label={lang === "en" ? "Salary Day (1-28)" : "يوم استلام الراتب (1-28)"}>
          <Input type="number" placeholder="1" min="1" max="28" value={form.salary_day} onChange={e => setForm(f => ({ ...f, salary_day: e.target.value }))} />
        </FormField>
        <FormField label={lang === "en" ? "Currency" : "العملة"}>
          <Select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            <option value="JOD">{lang === 'en' ? 'Jordanian Dinar (JOD)' : 'دينار أردني (JOD)'}</option>
            <option value="USD">{lang === 'en' ? 'US Dollar (USD)' : 'دولار (USD)'}</option>
            <option value="EUR">{lang === 'en' ? 'Euro (EUR)' : 'يورو (EUR)'}</option>
            <option value="SAR">{lang === 'en' ? 'Saudi Riyal (SAR)' : 'ريال سعودي (SAR)'}</option>
          </Select>
        </FormField>
        <FormField label={lang === "en" ? "Language" : "اللغة"}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['ar', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '11px', borderRadius: 10, background: lang === l ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)', border: `1px solid ${lang === l ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`, color: lang === l ? 'var(--accent-blue-light)' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {l === 'ar' ? '🇯🇴 العربية' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label={t('settings_theme')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['dark', 'light'] as const).map(themeOpt => (
              <button key={themeOpt} onClick={() => themeOpt !== theme && toggleTheme()} style={{ padding: '11px', borderRadius: 10, background: theme === themeOpt ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)', border: `1px solid ${theme === themeOpt ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`, color: theme === themeOpt ? 'var(--accent-blue-light)' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                {themeOpt === 'dark' ? t('settings_dark') : t('settings_light')}
              </button>
            ))}
          </div>
        </FormField>
        <SaveButton label={lang === "en" ? "Save Changes" : "حفظ التغييرات"} loading={saving} onClick={handleSave} />
      </div>

      {/* الأصول الشخصية */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(59,126,246,0.2)', borderRadius: 20, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('settings_assets_title')}
          </div>
          {assetsAge !== null && (
            <div style={{ fontSize: 11, color: assetsAge >= 3 ? '#F59E0B' : 'var(--text-muted)', fontWeight: 600 }}>
              {assetsAge >= 3 ? '⚠️ ' : '✓ '}{lang === 'en' ? `Updated ${assetsAge}mo ago` : `آخر تحديث منذ ${assetsAge} أشهر`}
            </div>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          {t('settings_assets_desc')}
        </p>

        {/* إجمالي الأصول */}
        {totalAssets > 0 && (
          <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(59,126,246,0.15)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>💼 {t('settings_assets_total')}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>{totalAssets.toLocaleString()} {form.currency}</span>
          </div>
        )}

        <FormField label={`🏠 ${t('settings_assets_realestate')}`}>
          <Input type="number" placeholder="0" value={assets.real_estate} onChange={e => setAssets(a => ({ ...a, real_estate: e.target.value }))} />
        </FormField>
        <FormField label={`🚗 ${t('settings_assets_vehicles')}`}>
          <Input type="number" placeholder="0" value={assets.vehicles} onChange={e => setAssets(a => ({ ...a, vehicles: e.target.value }))} />
        </FormField>
        <FormField label={`👑 ${t('settings_assets_jewelry')}`}>
          <Input type="number" placeholder="0" value={assets.jewelry} onChange={e => setAssets(a => ({ ...a, jewelry: e.target.value }))} />
        </FormField>
        <FormField label={`📦 ${t('settings_assets_other')}`}>
          <Input type="number" placeholder="0" value={assets.other_assets} onChange={e => setAssets(a => ({ ...a, other_assets: e.target.value }))} />
        </FormField>
        <SaveButton label={lang === "en" ? "Save Assets" : "حفظ الأصول"} loading={savingAssets} onClick={handleSaveAssets} />
      </div>

      {/* الحساب */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{lang === 'en' ? 'Account' : 'الحساب'}</div>
        <PushToggle />
        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
        <button onClick={handleLogout} disabled={loggingOut} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: loggingOut ? 0.5 : 1 }}>
          {loggingOut ? '⏳ ...' : (lang === 'en' ? 'Sign Out ←' : 'تسجيل الخروج ←')}
        </button>
      </div>

      {/* تصدير البيانات */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('settings_data')}</div>
        <button onClick={handleExportCSV} disabled={exportLoading} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {exportLoading ? t('settings_exporting') : t('settings_export')}
        </button>
      </div>

      {/* حذف الحساب */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-red-light)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('settings_danger')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>{lang === 'en' ? 'Deleting your account will permanently erase all your data and cannot be undone.' : 'حذف الحساب سيمسح جميع بياناتك نهائياً ولا يمكن استرجاعها.'}</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🗑️ حذف حسابي نهائياً
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--accent-red-light)', fontWeight: 700 }}>اكتب "حذف حسابي" للتأكيد:</p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={lang === 'en' ? 'delete my account' : 'حذف حسابي'}
              style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeleteAccount} disabled={deleteInput !== 'حذف حسابي' || deletingAccount} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#EF4444', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: deleteInput !== 'حذف حسابي' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleteInput !== 'حذف حسابي' ? 0.4 : 1 }}>
                {deletingAccount ? '⏳ ...' : (lang === 'en' ? 'Confirm Delete' : 'تأكيد الحذف')}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
