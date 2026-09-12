"use client"

import { useState, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme-context"
import { FormField, Input, Select, SaveButton } from "@/components/ui/form-field"
import { CURRENCIES_BY_GROUP } from "@/lib/currencies"
import { PushToggle } from "@/components/ui/push-toggle"
import { SectionTitle, SectionCard, StatBadge } from "./section-common"

export interface ProfileFormData {
  full_name: string
  monthly_income: string
  opening_balance: string
  currency: string
  salary_day: string
  phone: string
  job_title: string
  birth_date: string
}

export interface AssetsFormData {
  real_estate: string
  vehicles: string
  jewelry: string
  other_assets: string
}

// ══════════════════════════════════════════════════════
// PROFILE SECTION
// ══════════════════════════════════════════════════════
export function ProfileSection({
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
export function AssetsSection({
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
export function AccountSection({ onLogout, loggingOut }: { onLogout: () => void | Promise<void>; loggingOut: boolean }) {
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
export function ExportSection({ exporting, userId }: { exporting: boolean; userId: string }) {
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
export function DangerZone({
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
