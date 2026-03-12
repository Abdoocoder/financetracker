'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
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
  const [exportLoading, setExportLoading] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const { user: currentUser } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const { t, lang, setLang } = useI18n()

  useEffect(() => {
    async function load() {
      const user = currentUser
      if (!user) return
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm({ full_name: data.full_name ?? '', monthly_income: data.monthly_income?.toString() ?? '', currency: data.currency ?? 'JOD', salary_day: data.salary_day?.toString() ?? '1' })
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

  async function handleExportCSV() {
    setExportLoading(true)
    const user = currentUser
    if (!user) return
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false })
    if (!data?.length) { toast.error('لا توجد معاملات للتصدير'); setExportLoading(false); return }
    const headers = ['التاريخ', 'النوع', 'المبلغ', 'الفئة', 'الوصف']
    const rows = data.map(t => [t.transaction_date, t.type === 'income' ? 'دخل' : 'مصروف', t.amount, t.category ?? '', t.description ?? ''])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `financetracker-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('تم تصدير البيانات بنجاح ✅')
    setExportLoading(false)
  }

  async function handleDeleteAccount() {
    const user = currentUser
    if (!user || deleteInput !== 'حذف حسابي') return
    setDeletingAccount(true)
    // حذف كل البيانات
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
          {loggingOut ? '⏳ ...' : 'تسجيل الخروج ←'}
        </button>
      </div>

      {/* تصدير البيانات */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>البيانات</div>
        <button onClick={handleExportCSV} disabled={exportLoading} style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {exportLoading ? '⏳ جاري التصدير...' : '📥 تصدير المعاملات CSV'}
        </button>
      </div>

      {/* حذف الحساب */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-red-light)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>⚠️ منطقة الخطر</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>حذف الحساب سيمسح جميع بياناتك نهائياً ولا يمكن استرجاعها.</p>
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
              placeholder='حذف حسابي'
              style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDeleteAccount} disabled={deleteInput !== 'حذف حسابي' || deletingAccount} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#EF4444', border: 'none', color: 'white', fontSize: 14, fontWeight: 800, cursor: deleteInput !== 'حذف حسابي' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleteInput !== 'حذف حسابي' ? 0.4 : 1 }}>
                {deletingAccount ? '⏳ جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
