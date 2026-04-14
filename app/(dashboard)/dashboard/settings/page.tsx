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
import { CURRENCIES_BY_GROUP } from "@/lib/currencies"
import { PushToggle } from "@/components/ui/push-toggle"
import { TestimonialSection } from "@/components/ui/testimonial-section"

interface ProfileFormData {
  full_name: string
  monthly_income: string
  opening_balance: string
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
  const { theme, setTheme } = useTheme()

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
            {profileForm.full_name || t('settings_your_name')}
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
            {t('settings_member')}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginTop: 2 }}>{memberSince}</div>
        </div>
      </div>

      {/* Stats Row */}
      {(age !== null || profileForm.phone || profileForm.job_title) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {age !== null && <StatBadge icon="🎂" label={t('settings_age')} value={t('settings_age_value', { n: age })} />}
          {profileForm.phone && <StatBadge icon="📱" label={t('settings_phone')} value={profileForm.phone} />}
          {profileForm.job_title && <StatBadge icon="💼" label={t('settings_job_title')} value={profileForm.job_title} />}
        </div>
      )}

      <SectionTitle>{t('settings_profile_info')}</SectionTitle>

      <FormField label={t('settings_name')}>
        <Input placeholder={t('settings_name')} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
      </FormField>

      <FormField label={t('settings_job_title')}>
        <Input placeholder={t('settings_job_hint')} value={profileForm.job_title} onChange={e => setProfileForm(f => ({ ...f, job_title: e.target.value }))} />
      </FormField>

      <FormField label={t('settings_phone')}>
        <Input type="tel" placeholder="+962 7X XXX XXXX" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
      </FormField>

      <FormField label={t('settings_birth_date')}>
        <Input type="date" value={profileForm.birth_date} onChange={e => setProfileForm(f => ({ ...f, birth_date: e.target.value }))} />
      </FormField>

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <SectionTitle>{t('settings_financial')}</SectionTitle>

      <FormField label={t('settings_income')}>
        <Input type="number" min="0" step="0.01" placeholder="0" value={profileForm.monthly_income} onChange={e => setProfileForm(f => ({ ...f, monthly_income: e.target.value }))} />
      </FormField>

      <FormField label={t('settings_opening_balance_desc')}>
        <Input type="number" min="0" step="0.01" placeholder="0" value={profileForm.opening_balance} onChange={e => setProfileForm(f => ({ ...f, opening_balance: e.target.value }))} />
      </FormField>

      <FormField label={t('settings_salary_day_desc')}>
        <Input type="number" min="1" max="28" placeholder="1" value={profileForm.salary_day} onChange={e => setProfileForm(f => ({ ...f, salary_day: e.target.value }))} />
      </FormField>

      <FormField label={t('settings_currency')}>
        <Select value={profileForm.currency} onChange={e => setProfileForm(f => ({ ...f, currency: e.target.value }))}>
          {(['arabic', 'islamic', 'global'] as const).map(g => (
            <optgroup key={g} label={t(`currency_group_${g}`)}>
              {CURRENCIES_BY_GROUP[g].map(c => (
                <option key={c.value} value={c.value}>{c.flag} {lang === 'en' ? c.labelEn : c.labelAr} ({c.value})</option>
              ))}
            </optgroup>
          ))}
        </Select>
      </FormField>

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <SectionTitle>{t('settings_preferences')}</SectionTitle>

      <FormField label={t('settings_language')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(['system', 'ar', 'en'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '11px',
              borderRadius: 12,
              background: lang === l ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)',
              border: `1px solid ${lang === l ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`,
              color: lang === l ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              {l === 'system' ? t('settings_lang_system') : l === 'ar' ? '🇯🇴 AR' : '🇬🇧 EN'}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label={t('settings_theme')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(['system', 'dark', 'light'] as const).map(opt => (
            <button key={opt} onClick={() => setTheme(opt)} style={{
              padding: '11px',
              borderRadius: 12,
              background: theme === opt ? 'var(--accent-blue-dim)' : 'var(--bg-secondary)',
              border: `1px solid ${theme === opt ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`,
              color: theme === opt ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              {opt === 'system' ? t('settings_theme_system') : opt === 'dark' ? t('settings_theme_dark') : t('settings_theme_light')}
            </button>
          ))}
        </div>
      </FormField>

      <SaveButton label={t('settings_save')} loading={saving} onClick={onSave} />
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
            {t('settings_months_ago', { n: assetsAge })}
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
              {t('settings_net_worth_desc')}
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

      <SaveButton label={t('settings_assets_save')} loading={saving} onClick={onSave} />
    </SectionCard>
  )
}

// ══════════════════════════════════════════════════════
// ACCOUNT SECTION
// ══════════════════════════════════════════════════════
function AccountSection({ onLogout, loggingOut }: { onLogout: () => Promise<void>; loggingOut: boolean }) {
  const { lang, t } = useI18n()
  return (
    <SectionCard>
      <SectionTitle>{t('settings_account')}</SectionTitle>
      <PushToggle />
      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
      <button onClick={onLogout} disabled={loggingOut} style={{
        width: '100%', padding: '13px', borderRadius: 12,
        background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)',
        color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit', opacity: loggingOut ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}>
        {loggingOut ? '⏳ ...' : t('settings_logout')}
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

    const headers = t('csv_header').split(',')
    const rows = data.map(tx => [
      tx.transaction_date,
      tx.type === 'income' ? t('trans_income') : t('trans_expense'),
      tx.amount, tx.category ?? '', tx.description ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fajrak-${new Date().toISOString().split('T')[0]}.csv`
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
        {t('settings_delete_account_warning')}
      </p>
      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)} style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--accent-red-light)', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          🗑️ {t('settings_account_danger_zone')}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--accent-red-light)', fontWeight: 700 }}>
            {t('delete_account_confirmation_text')}
          </p>
          <input
            value={deleteInput}
            onChange={e => setDeleteInput(e.target.value)}
            placeholder={t('settings_delete_confirm_text')}
            style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onDelete}
              disabled={deleteInput !== t('settings_delete_confirm_text') || deleting}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: '#EF4444', border: 'none', color: 'white',
                fontSize: 14, fontWeight: 800,
                cursor: deleteInput !== t('settings_delete_confirm_text') ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: deleteInput !== t('settings_delete_confirm_text') ? 0.4 : 1,
              }}
            >
              {deleting ? '⏳ ...' : t('confirm_delete')}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t('goals_cancel')}
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

// ══════════════════════════════════════════════════════
// ACCORDION CARD
// ══════════════════════════════════════════════════════
function AccordionCard({
  title, icon, defaultOpen = false, badge, children
}: {
  title: string
  icon: string
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 0.2s',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: open ? 'rgba(59,126,246,0.04)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--accent-blue-light)',
              background: 'var(--accent-blue-dim)',
              border: '1px solid rgba(59,126,246,0.2)',
              padding: '2px 8px', borderRadius: 100,
            }}>{badge}</span>
          )}
        </div>
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease',
          display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { user: currentUser } = useUser()
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const { t } = useI18n()

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '', monthly_income: '', opening_balance: '', currency: 'JOD',
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
          opening_balance: data.opening_balance?.toString() ?? '',
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

  // صافي الثروة الكامل
  const [netWorthData, setNetWorthData] = useState<{
    cashBalance: number
    savings: number
    investments: number
    totalDebt: number
  }>({ cashBalance: 0, savings: 0, investments: 0, totalDebt: 0 })

  useEffect(() => {
    if (!currentUser) return
    async function loadNetWorth() {
      const [txRes, goalsRes, invRes, debtsRes] = await Promise.all([
        supabase.from('transactions').select('type, amount').eq('user_id', currentUser!.id),
        supabase.from('savings_goals').select('current_amount').eq('user_id', currentUser!.id),
        supabase.from('investments').select('shares, current_price').eq('user_id', currentUser!.id),
        supabase.from('debts').select('remaining_amount').eq('user_id', currentUser!.id).eq('is_paid', false),
      ])
      const txs = txRes.data ?? []
      const income = txs.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      const { data: profileData } = await supabase.from('profiles').select('opening_balance').eq('id', currentUser!.id).single()
      const cashBalance = Number(profileData?.opening_balance ?? 0) + income - expenses
      const savings = (goalsRes.data ?? []).reduce((a, g) => a + Number(g.current_amount), 0)
      const investments = (invRes.data ?? []).reduce((a, i) => a + Number(i.shares) * Number(i.current_price), 0)
      const totalDebt = (debtsRes.data ?? []).reduce((a, d) => a + Number(d.remaining_amount), 0)
      setNetWorthData({ cashBalance, savings, investments, totalDebt })
    }
    loadNetWorth()
  }, [currentUser, supabase])

  const netWorth = useMemo(() => (
    netWorthData.cashBalance + netWorthData.savings + netWorthData.investments + totalAssets - netWorthData.totalDebt
  ), [netWorthData, totalAssets])

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
      opening_balance: safeParseFloat(profileForm.opening_balance),
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
    const user = currentUser; if (!user || deleteInput !== t('settings_delete_confirm_text')) return
    setLoading('delete', true)
    const { error } = await supabase.rpc('delete_user_account', { user_id: user.id })
    if (error) { toast.error(t('toast_error_save')); setLoading('delete', false); return }
    await supabase.auth.signOut()
    router.push('/register')
  }

  const handleLogout = async () => {
    setLoading('logout', true)
    try {
      // حذف اشتراك الإشعارات عند تسجيل الخروج
      const reg = await navigator.serviceWorker?.ready
      const sub = await reg?.pushManager?.getSubscription()
      if (sub) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await fetch('/api/push-subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
            body: JSON.stringify({ endpoint: sub.endpoint })
          })
        }
        await sub.unsubscribe()
      }
    } catch {}
    await supabase.auth.signOut()
    router.push('/login')
  }

  const { lang } = useI18n()

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PageHeader title={t('settings_title')} subtitle={t('settings_subtitle')} />

      <AccordionCard icon="👤" title={t('settings_profile_info')} defaultOpen={true}>
        <ProfileSection
          profileForm={profileForm} setProfileForm={setProfileForm}
          userEmail={userEmail} initials={initials} memberSince={memberSince}
          saving={loadingStates.profile} onSave={handleSaveProfile}
        />
      </AccordionCard>

      <AccordionCard icon="💎" title={t('settings_assets_title')} badge={t('settings_net_worth')}>
        <AssetsSection
          assetsForm={assetsForm} setAssetsForm={setAssetsForm}
          totalAssets={totalAssets} assetsAge={assetsAge}
          currency={profileForm.currency} saving={loadingStates.assets}
          onSave={handleSaveAssets}
        />
      </AccordionCard>

      <AccordionCard icon="🔔" title={t('settings_account_notifs')}>
        <AccountSection onLogout={handleLogout} loggingOut={loadingStates.logout} />
      </AccordionCard>

      <AccordionCard icon="📥" title={t('settings_data')}>
        <ExportSection exporting={loadingStates.export} userId={currentUser?.id ?? ''} />
      </AccordionCard>


      <AccordionCard icon="🔗" title={t('settings_share_msg').split('\n')[0].replace('?', '')}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌅</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            {t('share_subtitle')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            {t('share_body')}
          </div>
          <button
            onClick={() => {
              const text = lang === 'ar'
                ? 'جربت فجرك؟ تطبيق مالي عربي مجاني يساعدك تتحكم في مصاريفك وتبني ثروتك 🌅\n\nhttps://fajrak.com'
                : 'Tried Fajrak? A free Arabic financial app to control your expenses and build wealth 🌅\n\nhttps://fajrak.com'
              if (navigator.share) {
                navigator.share({ title: 'فجرك', text })
              } else {
                navigator.clipboard.writeText('https://fajrak.com')
                alert(t('share_copied'))
              }
            }}
            style={{
              padding: '14px 32px', borderRadius: 14,
              background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
              border: 'none', color: 'white', fontSize: 15, fontWeight: 900,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 20px rgba(59,126,246,0.3)',
            }}
          >
            {t('share_btn')}
          </button>
        </div>
      </AccordionCard>

      <AccordionCard icon="⭐" title={lang === 'en' ? 'Share Your Experience' : 'شارك تجربتك'} badge={lang === 'en' ? 'New' : 'جديد'}>
        <TestimonialSection userId={currentUser?.id ?? ''} />
      </AccordionCard>

      <AccordionCard icon="⚠️" title={lang === 'en' ? 'Danger Zone' : 'منطقة الخطر'}>
        <DangerZone
          showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
          deleteInput={deleteInput} setDeleteInput={setDeleteInput}
          onDelete={handleDeleteAccount} deleting={loadingStates.delete}
        />
      </AccordionCard>
    </div>
  )
}
