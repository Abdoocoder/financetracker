"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-context"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/ui/page-header"
import { TestimonialSection } from "@/components/ui/testimonial-section"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ApiKeysSection } from "@/components/settings/api-keys-section"
import { BYOKKeysSection } from "@/components/settings/byok-keys-section"
import { AccordionCard } from "@/components/settings/section-common"
import {
  ProfileSection, AssetsSection, AccountSection, ExportSection, DangerZone,
} from "@/components/settings/sections"
import type { ProfileFormData, AssetsFormData } from "@/components/settings/sections"

const safeParseFloat = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
const safeParseInt = (v: string, def = 1) => { const n = parseInt(v, 10); return isNaN(n) ? def : Math.min(Math.max(n, 1), 28) }

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════

export default function SettingsPage() {
  const { user: currentUser, refreshProfile } = useUser()
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const { t } = useI18n()
  const queryClient = useQueryClient()

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
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
    const newIncome = safeParseFloat(profileForm.monthly_income)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: profileForm.full_name,
      monthly_income: newIncome,
      opening_balance: safeParseFloat(profileForm.opening_balance),
      currency: profileForm.currency,
      salary_day: safeParseInt(profileForm.salary_day),
      phone: profileForm.phone || null,
      job_title: profileForm.job_title || null,
      birth_date: profileForm.birth_date || null,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      toast.error(t('toast_error_save'))
    } else {
      // Sync the auto-generated salary transaction for the current month
      // The onboarding and auto-salary features create income transactions with category 'راتب'.
      // If the user changes their salary in settings, those transactions must be updated too,
      // otherwise the dashboard will still show the old amount (it reads from transactions first).
      const now = new Date()
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      if (newIncome > 0) {
        // Update existing salary transaction(s) for this month to the new amount
        await supabase.from('transactions')
          .update({ amount: newIncome })
          .eq('user_id', user.id)
          .eq('type', 'income')
          .eq('category', 'راتب')
          .gte('transaction_date', firstDay)
          .lte('transaction_date', lastDay)
      } else {
        // If income set to 0, remove auto-generated salary transactions for this month
        await supabase.from('transactions')
          .delete()
          .eq('user_id', user.id)
          .eq('type', 'income')
          .eq('category', 'راتب')
          .gte('transaction_date', firstDay)
          .lte('transaction_date', lastDay)
      }

      toast.success(t('toast_saved'))
      // Refresh the global profile context so all screens reflect the updated salary/income
      await refreshProfile()
      // Invalidate dashboard cache so home screen re-fetches fresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] })
    }
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
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch('/api/push-subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
            body: JSON.stringify({ endpoint: sub.endpoint })
          }).catch(() => {}); // Ignore fetch errors on logout
        }
        await sub.unsubscribe().catch(() => {});
      }
      
      await supabase.auth.signOut();
      window.location.href = '/login'; // Full reload to clear all state
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('error_generic'));
      setLoading('logout', false);
      setShowLogoutConfirm(false);
    }
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
        <AccountSection onLogout={() => setShowLogoutConfirm(true)} loggingOut={loadingStates.logout} />
      </AccordionCard>

      {showLogoutConfirm && (
        <ConfirmDialog
          title={t('settings_logout_confirm_title') || t('settings_logout')}
          message={t('settings_logout_confirm_msg') || 'هل أنت متأكد من رغبتك في تسجيل الخروج؟'}
          confirmLabel={t('settings_logout')}
          cancelLabel={t('goals_cancel')}
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
          danger={true}
        />
      )}

      <AccordionCard icon="🔑" title={t('settings_api_keys')}>
        <ApiKeysSection />
      </AccordionCard>

      <AccordionCard icon="🤖" title={t('settings_byok_keys') || "AI Provider Keys (BYOK)"}>
        <BYOKKeysSection />
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
