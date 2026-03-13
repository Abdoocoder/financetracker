"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-context"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme-context"
import { PageHeader } from "@/components/ui/page-header"
import { FormField, Input, Select, SaveButton } from "@/components/ui/form-field"
import { PushToggle } from "@/components/ui/push-toggle"
import { TestimonialSection } from "@/components/ui/testimonial-section"

interface ProfileFormData {
  full_name: string
  monthly_income: string
  currency: string
  salary_day: string
  phone: string
  job_title: string
  birth_date: string
}

interface AssetsFormData {
  real_estate: string
  vehicles: string
  jewelry: string
  other_assets: string
}

const safeParseFloat = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
const safeParseInt = (v: string, def = 1) => { const n = parseInt(v, 10); return isNaN(n) ? def : Math.min(Math.max(n, 1), 28) }

// ── Stat Badge ──────────────────────────────────────
function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

// ── Section Card ─────────────────────────────────────
function SectionCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${accent ? `${accent}33` : 'var(--border)'}`,
      borderRadius: 20,
      padding: '20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      {children}
    </div>
  )
}

// ── Section Title ────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 900,
      color: 'var(--text-secondary)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PROFILE SECTION
// ══════════════════════════════════════════════════════
function ProfileSection({
  profileForm, setProfileForm, userEmail, initials, saving, onSave, memberSince,
}: {
  profileForm: ProfileFormData
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormData>>
  userEmail: string
  initials: string
  saving: boolean
  onSave: () => Promise<void>
  memberSince: string
}) {
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()

  const age = useMemo(() => {
    if (!profileForm.birth_date) return null
    const diff = Date.now() - new Date(profileForm.birth_date).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }, [profileForm.birth_date])

  return (
    <SectionCard>
      {/* Avatar Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,126,246,0.08) 0%, rgba(139,92,246,0.06) 100%)',
        border: '1px solid rgba(59,126,246,0.12)',
        borderRadius: 16,
        padding: '20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        {/* Avatar */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 900,
          color: 'white',
          boxShadow: '0 8px 24px var(--accent-blue-glow)',
          position: 'relative',
        }}>
          {initials}
          <div style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#10B981',
            border: '2px solid var(--bg-card)',
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 2 }}>
            {profileForm.full_name || (lang === 'en' ? 'Your Name' : 'اسمك')}
          </div>
          {profileForm.job_title && (
            <div style={{ fontSize: 12, color: 'var(--accent-blue-light)', fontWeight: 700, marginBottom: 2 }}>
              {profileForm.job_title}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{userEmail}</div>
        </div>

        {/* Member since */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {lang === 'en' ? 'MEMBER' : 'عضو'}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginTop: 2 }}>{memberSince}</div>
        </div>
      </div>

      {/* Stats Row */}
      {(age !== null || profileForm.phone || profileForm.job_title) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {age !== null && <StatBadge icon="🎂" label={lang === 'en' ? 'Age' : 'العمر'} value={`${age} ${lang === 'en' ? 'yr' : 'سنة'}`} />}
          {profileForm.phone && <StatBadge icon="📱" label={lang === 'en' ? 'Phone' : 'الهاتف'} value={profileForm.phone} />}
          {profileForm.job_title && <StatBadge icon="💼" label={lang === 'en' ? 'Job' : 'الوظيفة'} value={profileForm.job_title} />}
        </div>
      )}

      <SectionTitle>{lang === 'en' ? 'Personal Info' : 'المعلومات الشخصية'}</SectionTitle>

      <FormField label={lang === 'en' ? 'Full Name' : 'الاسم الكامل'}>
        <Input placeholder={lang === 'en' ? 'Full Name' : 'الاسم الكامل'} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
      </FormField>

      <FormField label={lang === 'en' ? 'Job Title' : 'المهنة / الوظيفة'}>
        <Input placeholder={lang === 'en' ? 'e.g. Software Engineer' : 'مثال: مهندس برمجيات'} value={profileForm.job_title} onChange={e => setProfileForm(f => ({ ...f, job_title: e.target.value }))} />
      </FormField>

      <FormField label={lang === 'en' ? 'Phone Number' : 'رقم الهاتف'}>
        <Input type="tel" placeholder="+962 7X XXX XXXX" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
      </FormField>

      <FormField label={lang === 'en' ? 'Date of Birth' : 'تاريخ الميلاد'}>
        <Input type="date" value={profileForm.birth_date} onChange={e => setProfileForm(f => ({ ...f, birth_date: e.target.value }))} />
      </FormField>

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <SectionTitle>{lang === 'en' ? 'Financial Settings' : 'الإعدادات المالية'}</SectionTitle>

      <FormField label={lang === 'en' ? 'Monthly Salary' : 'الراتب الشهري'}>
        <Input type="number" min="0" step="0.01" placeholder="0" value={profileForm.monthly_income} onChange={e => setProfileForm(f => ({ ...f, monthly_income: e.target.value }))} />
      </FormField>

      <FormField label={lang === 'en' ? 'Salary Day (1-28)' : 'يوم استلام الراتب (1-28)'}>
        <Input type="number" min="1" max="28" placeholder="1" value={profileForm.salary_day} onChange={e => setProfileForm(f => ({ ...f, salary_day: e.target.value }))} />
      </FormField>

      <FormField label={lang === 'en' ? 'Currency' : 'العملة'}>
        <Select value={profileForm.currency} onChange={e => setProfileForm(f => ({ ...f, currency: e.target.value }))}>
          <option value="JOD">{lang === 'en' ? 'Jordanian Dinar (JOD)' : 'دينار أردني (JOD)'}</option>
          <option value="USD">{lang === 'en' ? 'US Dollar (USD)' : 'دولار أمريكي (USD)'}</option>
          <option value="EUR">{lang === 'en' ? 'Euro (EUR)' : 'يورو (EUR)'}</option>
          <option value="SAR">{lang === 'en' ? 'Saudi Riyal (SAR)' : 'ريال سعودي (SAR)'}</option>
          <option value="AED">{lang === 'en' ? 'UAE Dirham (AED)' : 'درهم إماراتي (AED)'}</option>
          <option value="KWD">{lang === 'en' ? 'Kuwaiti Dinar (KWD)' : 'دينار كويتي (KWD)'}</option>
        </Select>
      </FormField>

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <SectionTitle>{lang === 'en' ? 'Preferences' : 'التفضيلات'}</SectionTitle>

      <FormField label={lang === 'en' ? 'Language' : 'اللغة'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['ar', 'en'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '11px',
              borderRadius: 10,
              background: lang === l ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)',
              border: `1px solid ${lang === l ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`,
              color: lang === l ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              {l === 'ar' ? '🇯🇴 العربية' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label={t('settings_theme')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['dark', 'light'] as const).map(opt => (
            <button key={opt} onClick={() => opt !== theme && toggleTheme()} style={{
              padding: '11px',
              borderRadius: 10,
              background: theme === opt ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)',
              border: `1px solid ${theme === opt ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`,
              color: theme === opt ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              {opt === 'dark' ? t('settings_dark') : t('settings_light')}
            </button>
          ))}
        </div>
      </FormField>

      <SaveButton label={lang === 'en' ? 'Save Changes' : 'حفظ التغييرات'} loading={saving} onClick={onSave} />
    </SectionCard>
  )
}

// ══════════════════════════════════════════════════════
// ASSETS SECTION
// ══════════════════════════════════════════════════════
function AssetsSection({
  assetsForm, setAssetsForm, totalAssets, assetsAge, currency, saving, onSave,
}: {
  assetsForm: AssetsFormData
  setAssetsForm: React.Dispatch<React.SetStateAction<AssetsFormData>>
  totalAssets: number
  assetsAge: number | null
  currency: string
  saving: boolean
  onSave: () => Promise<void>
}) {
  const { t, lang } = useI18n()

  return (
    <SectionCard accent="var(--accent-blue)">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <SectionTitle>{t('settings_assets_title')}</SectionTitle>
        {assetsAge !== null && (
          <div style={{
            fontSize: 11,
            color: assetsAge >= 3 ? 'var(--accent-amber)' : 'var(--accent-green)',
            fontWeight: 700,
            background: assetsAge >= 3 ? 'var(--accent-amber-dim)' : 'var(--accent-green-dim)',
            padding: '3px 10px',
            borderRadius: 100,
            border: `1px solid ${assetsAge >= 3 ? 'var(--accent-amber-glow)' : 'var(--accent-green-glow)'}`,
          }}>
            {assetsAge >= 3 ? '⚠️ ' : '✓ '}
            {lang === 'en' ? `${assetsAge}mo ago` : `منذ ${assetsAge} أشهر`}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.7 }}>
        {t('settings_assets_desc')}
      </p>

      {totalAssets > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))',
          border: '1px solid rgba(59,126,246,0.15)',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>💼 {t('settings_assets_total')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {lang === 'en' ? 'Used in net worth calculation' : 'يُستخدم في حساب صافي الثروة'}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-blue-light)', fontFamily: 'monospace' }}>
            {totalAssets.toLocaleString()} <span style={{ fontSize: 13 }}>{currency}</span>
          </div>
        </div>
      )}

      {[
        { key: 'real_estate' as const, icon: '🏠', label: t('settings_assets_realestate') },
        { key: 'vehicles' as const, icon: '🚗', label: t('settings_assets_vehicles') },
        { key: 'jewelry' as const, icon: '👑', label: t('settings_assets_jewelry') },
        { key: 'other_assets' as const, icon: '📦', label: t('settings_assets_other') },
      ].map(({ key, icon, label }) => (
        <FormField key={key} label={`${icon} ${label}`}>
          <Input
            type="number" min="0" step="0.01" placeholder="0"
            value={assetsForm[key]}
            onChange={e => setAssetsForm(a => ({ ...a, [key]: e.target.value }))}
          />
        </FormField>
      ))}

      <SaveButton label={lang === 'en' ? 'Save Assets' : 'حفظ الأصول'} loading={saving} onClick={onSave} />
    </SectionCard>
  )
}

// ══════════════════════════════════════════════════════
// ACCOUNT SECTION
// ══════════════════════════════════════════════════════
function AccountSection({ onLogout, loggingOut }: { onLogout: () => Promise<void>; loggingOut: boolean }) {
  const { lang } = useI18n()
  return (
    <SectionCard>
      <SectionTitle>{lang === 'en' ? 'Account' : 'الحساب'}</SectionTitle>
      <PushToggle />
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <button onClick={onLogout} disabled={loggingOut} style={{
        width: '100%', padding: '13px', borderRadius: 12,
        background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)',
        color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit', opacity: loggingOut ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}>
        {loggingOut ? '⏳ ...' : lang === 'en' ? 'Sign Out ←' : 'تسجيل الخروج ←'}
      </button>
    </SectionCard>
  )
}

// ══════════════════════════════════════════════════════
// EXPORT SECTION
// ══════════════════════════════════════════════════════
function ExportSection({ exporting, userId }: { exporting: boolean; userId: string }) {
  const { t, lang } = useI18n()
  const supabase = useRef(createClient()).current
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions').select('*').eq('user_id', userId)
      .order('transaction_date', { ascending: false })

    if (error || !data?.length) {
      toast.error(t('settings_no_export'))
      setLoading(false)
      return
    }

    const headers = lang === 'en'
      ? ['Date', 'Type', 'Amount', 'Category', 'Description']
      : ['التاريخ', 'النوع', 'المبلغ', 'الفئة', 'الوصف']
    const rows = data.map(tx => [
      tx.transaction_date,
      tx.type === 'income' ? (lang === 'en' ? 'Income' : 'دخل') : (lang === 'en' ? 'Expense' : 'مصروف'),
      tx.amount, tx.category ?? '', tx.description ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financetracker-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('settings_export_ok'))
    setLoading(false)
  }

  return (
    <SectionCard>
      <SectionTitle>{t('settings_data')}</SectionTitle>
      <button onClick={handleExport} disabled={loading || exporting} style={{
        width: '100%', padding: '13px', borderRadius: 12,
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'opacity 0.2s',
        opacity: loading ? 0.5 : 1,
      }}>
        {loading ? t('settings_exporting') : t('settings_export')}
      </button>
    </SectionCard>
  )
}

// ══════════════════════════════════════════════════════
// DANGER ZONE
// ══════════════════════════════════════════════════════
function DangerZone({
  showDeleteConfirm, setShowDeleteConfirm, deleteInput, setDeleteInput, onDelete, deleting,
}: {
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (v: boolean) => void
  deleteInput: string
  setDeleteInput: (v: string) => void
  onDelete: () => Promise<void>
  deleting: boolean
}) {
  const { t, lang } = useI18n()
  return (
    <SectionCard accent="var(--accent-red)">
      <SectionTitle>⚠️ {t('settings_danger')}</SectionTitle>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
        {lang === 'en' ? 'Permanently erase all your data. Cannot be undone.' : 'سيُمسح جميع بياناتك نهائياً ولا يمكن استرجاعها.'}
      </p>
      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)} style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          🗑️ {lang === 'en' ? 'Delete My Account' : 'حذف حسابي نهائياً'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--accent-red-light)', fontWeight: 700 }}>
            {lang === 'en' ? 'Type "delete my account" to confirm:' : 'اكتب "حذف حسابي" للتأكيد:'}
          </p>
          <input
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            placeholder={lang === 'en' ? 'delete my account' : 'حذف حسابي'}
            style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onDelete}
              disabled={deleteInput !== 'حذف حسابي' || deleting}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: '#EF4444', border: 'none', color: 'white',
                fontSize: 14, fontWeight: 800,
                cursor: deleteInput !== 'حذف حسابي' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: deleteInput !== 'حذف حسابي' ? 0.4 : 1,
              }}
            >
              {deleting ? '⏳ ...' : lang === 'en' ? 'Confirm Delete' : 'تأكيد الحذف'}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {lang === 'en' ? 'Cancel' : 'إلغاء'}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════
export default function SettingsPage() {
  const { user: currentUser } = useUser()
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const { t } = useI18n()

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '', monthly_income: '', currency: 'JOD',
    salary_day: '1', phone: '', job_title: '', birth_date: '',
  })
  const [assetsForm, setAssetsForm] = useState<AssetsFormData>({
    real_estate: '', vehicles: '', jewelry: '', other_assets: '',
  })
  const [assetsUpdatedAt, setAssetsUpdatedAt] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [memberSince, setMemberSince] = useState('')
  const [loadingStates, setLoadingStates] = useState({
    profile: false, assets: false, logout: false, export: false, delete: false,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')

  useEffect(() => {
    async function load() {
      const user = currentUser
      if (!user) return
      setUserEmail(user.email ?? '')
      const created = new Date(user.created_at ?? Date.now())
      setMemberSince(`${created.getMonth() + 1}/${created.getFullYear()}`)

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfileForm({
          full_name: data.full_name ?? '',
          monthly_income: data.monthly_income?.toString() ?? '',
          currency: data.currency ?? 'JOD',
          salary_day: data.salary_day?.toString() ?? '1',
          phone: data.phone ?? '',
          job_title: data.job_title ?? '',
          birth_date: data.birth_date ?? '',
        })
        setAssetsForm({
          real_estate: data.asset_real_estate?.toString() ?? '',
          vehicles: data.asset_vehicles?.toString() ?? '',
          jewelry: data.asset_jewelry?.toString() ?? '',
          other_assets: data.asset_other?.toString() ?? '',
        })
        setAssetsUpdatedAt(data.assets_updated_at ?? null)
      }
    }
    load()
  }, [currentUser, supabase])

  const totalAssets = useMemo(() => (
    safeParseFloat(assetsForm.real_estate) + safeParseFloat(assetsForm.vehicles) +
    safeParseFloat(assetsForm.jewelry) + safeParseFloat(assetsForm.other_assets)
  ), [assetsForm])

  const initials = useMemo(() => (
    profileForm.full_name ? profileForm.full_name.slice(0, 2).toUpperCase() : userEmail.slice(0, 2).toUpperCase()
  ), [profileForm.full_name, userEmail])

  const assetsAge = useMemo(() => (
    assetsUpdatedAt ? Math.floor((Date.now() - new Date(assetsUpdatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)) : null
  ), [assetsUpdatedAt])

  const setLoading = useCallback((key: keyof typeof loadingStates, v: boolean) => {
    setLoadingStates(p => ({ ...p, [key]: v }))
  }, [])

  const handleSaveProfile = async () => {
    const user = currentUser; if (!user) return
    setLoading('profile', true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: profileForm.full_name,
      monthly_income: safeParseFloat(profileForm.monthly_income),
      currency: profileForm.currency,
      salary_day: safeParseInt(profileForm.salary_day),
      phone: profileForm.phone || null,
      job_title: profileForm.job_title || null,
      birth_date: profileForm.birth_date || null,
      updated_at: new Date().toISOString(),
    })
    if (error) toast.error(t('toast_error_save'))
    else toast.success(t('toast_saved'))
    setLoading('profile', false)
  }

  const handleSaveAssets = async () => {
    const user = currentUser; if (!user) return
    setLoading('assets', true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      asset_real_estate: safeParseFloat(assetsForm.real_estate),
      asset_vehicles: safeParseFloat(assetsForm.vehicles),
      asset_jewelry: safeParseFloat(assetsForm.jewelry),
      asset_other: safeParseFloat(assetsForm.other_assets),
      assets_updated_at: now,
    })
    if (error) toast.error(t('toast_error_save'))
    else { setAssetsUpdatedAt(now); toast.success(t('toast_saved')) }
    setLoading('assets', false)
  }

  const handleDeleteAccount = async () => {
    const user = currentUser; if (!user || deleteInput !== 'حذف حسابي') return
    setLoading('delete', true)
    const { error } = await supabase.rpc('delete_user_account', { user_id: user.id })
    if (error) { toast.error(t('toast_error_save')); setLoading('delete', false); return }
    await supabase.auth.signOut()
    router.push('/register')
  }

  const handleLogout = async () => {
    setLoading('logout', true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title={t('settings_title')} subtitle={t('settings_subtitle')} />

      <ProfileSection
        profileForm={profileForm} setProfileForm={setProfileForm}
        userEmail={userEmail} initials={initials} memberSince={memberSince}
        saving={loadingStates.profile} onSave={handleSaveProfile}
      />

      <AssetsSection
        assetsForm={assetsForm} setAssetsForm={setAssetsForm}
        totalAssets={totalAssets} assetsAge={assetsAge}
        currency={profileForm.currency} saving={loadingStates.assets}
        onSave={handleSaveAssets}
      />

      <AccountSection onLogout={handleLogout} loggingOut={loadingStates.logout} />

      <ExportSection exporting={loadingStates.export} userId={currentUser?.id ?? ''} />

      <TestimonialSection userId={currentUser?.id ?? ''} />

      <DangerZone
        showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
        deleteInput={deleteInput} setDeleteInput={setDeleteInput}
        onDelete={handleDeleteAccount} deleting={loadingStates.delete}
      />
    </div>
  )
}
