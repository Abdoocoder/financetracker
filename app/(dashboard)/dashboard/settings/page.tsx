"use client"
export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-context"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme-context"
import { PageHeader } from "@/components/ui/page-header"
import { FormField, Input, Select, SaveButton } from "@/components/ui/form-field"
import { PushToggle } from "@/components/ui/push-toggle"

// ==================== TypeScript Interfaces ====================
interface ProfileFormData {
  full_name: string
  monthly_income: string
  currency: string
  salary_day: string
}

interface AssetsFormData {
  real_estate: string
  vehicles: string
  jewelry: string
  other_assets: string
}

// ==================== Utility Functions ====================
const safeParseFloat = (value: string): number => {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

const safeParseInt = (value: string, defaultValue: number = 1): number => {
  const num = parseInt(value, 10)
  return isNaN(num) ? defaultValue : Math.min(Math.max(num, 1), 28)
}

// ==================== Main Component ====================
export default function SettingsPage() {
  const { user: currentUser } = useUser()
  const supabase = useRef(createClient()).current
  const router = useRouter()
  const { t } = useI18n()
  const { theme } = useTheme() // not used directly but kept for context

  // States
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: "",
    monthly_income: "",
    currency: "JOD",
    salary_day: "1",
  })
  const [assetsForm, setAssetsForm] = useState<AssetsFormData>({
    real_estate: "",
    vehicles: "",
    jewelry: "",
    other_assets: "",
  })
  const [assetsUpdatedAt, setAssetsUpdatedAt] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [loadingStates, setLoadingStates] = useState({
    profile: false,
    assets: false,
    logout: false,
    export: false,
    delete: false,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")

  // ========== Data Loading ==========
  useEffect(() => {
    async function loadProfile() {
      const user = currentUser
      if (!user) return
      setUserEmail(user.email ?? "")

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) {
        toast.error(t("toast_error_save")) // using existing key
        return
      }

      if (data) {
        setProfileForm({
          full_name: data.full_name ?? "",
          monthly_income: data.monthly_income?.toString() ?? "",
          currency: data.currency ?? "JOD",
          salary_day: data.salary_day?.toString() ?? "1",
        })
        setAssetsForm({
          real_estate: data.asset_real_estate?.toString() ?? "",
          vehicles: data.asset_vehicles?.toString() ?? "",
          jewelry: data.asset_jewelry?.toString() ?? "",
          other_assets: data.asset_other?.toString() ?? "",
        })
        setAssetsUpdatedAt(data.assets_updated_at ?? null)
      }
    }
    loadProfile()
  }, [currentUser, supabase, t])

  // ========== Memoized Values ==========
  const totalAssets = useMemo(() => {
    return (
      safeParseFloat(assetsForm.real_estate) +
      safeParseFloat(assetsForm.vehicles) +
      safeParseFloat(assetsForm.jewelry) +
      safeParseFloat(assetsForm.other_assets)
    )
  }, [assetsForm])

  const initials = useMemo(() => {
    if (profileForm.full_name) return profileForm.full_name.slice(0, 2).toUpperCase()
    return userEmail.slice(0, 2).toUpperCase()
  }, [profileForm.full_name, userEmail])

  const assetsAge = useMemo(() => {
    if (!assetsUpdatedAt) return null
    return Math.floor(
      (Date.now() - new Date(assetsUpdatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
  }, [assetsUpdatedAt])

  // ========== Handlers ==========
  const setLoading = (key: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveProfile = async () => {
    const user = currentUser
    if (!user) return

    setLoading("profile", true)
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profileForm.full_name,
      monthly_income: safeParseFloat(profileForm.monthly_income),
      currency: profileForm.currency,
      salary_day: safeParseInt(profileForm.salary_day, 1),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      toast.error(t("toast_error_save"))
    } else {
      toast.success(t("toast_saved"))
    }
    setLoading("profile", false)
  }

  const handleSaveAssets = async () => {
    const user = currentUser
    if (!user) return

    setLoading("assets", true)
    const now = new Date().toISOString()
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      asset_real_estate: safeParseFloat(assetsForm.real_estate),
      asset_vehicles: safeParseFloat(assetsForm.vehicles),
      asset_jewelry: safeParseFloat(assetsForm.jewelry),
      asset_other: safeParseFloat(assetsForm.other_assets),
      assets_updated_at: now,
    })

    if (error) {
      toast.error(t("toast_error_save"))
    } else {
      setAssetsUpdatedAt(now)
      toast.success(t("toast_saved"))
    }
    setLoading("assets", false)
  }

  const handleExportCSV = async () => {
    const user = currentUser
    if (!user) return

    setLoading("export", true)
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })

    if (error || !data?.length) {
      toast.error(t("settings_no_export"))
      setLoading("export", false)
      return
    }

    // We'll get lang inside ExportSection via useI18n, so no need to use lang here
    setLoading("export", false)
    // The actual CSV generation is now inside ExportSection
  }

  const handleDeleteAccount = async () => {
    const user = currentUser
    if (!user || deleteInput !== "حذف حسابي") return

    setLoading("delete", true)
    const { error } = await supabase.rpc("delete_user_account", {
      user_id: user.id,
    })

    if (error) {
      toast.error(t("toast_error_save"))
      setLoading("delete", false)
      return
    }

    await supabase.auth.signOut()
    router.push("/register")
  }

  const handleLogout = async () => {
    setLoading("logout", true)
    await supabase.auth.signOut()
    router.push("/login")
  }

  // ========== Render ==========
  return (
    <div
      className="animate-fade-in settings-container"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <PageHeader title={t("settings_title")} subtitle={t("settings_subtitle")} />

      {/* Profile Section */}
      <ProfileSection
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        userEmail={userEmail}
        initials={initials}
        saving={loadingStates.profile}
        onSave={handleSaveProfile}
      />

      {/* Assets Section */}
      <AssetsSection
        assetsForm={assetsForm}
        setAssetsForm={setAssetsForm}
        totalAssets={totalAssets}
        assetsAge={assetsAge}
        currency={profileForm.currency}
        saving={loadingStates.assets}
        onSave={handleSaveAssets}
      />

      {/* Account Section */}
      <AccountSection
        onLogout={handleLogout}
        loggingOut={loadingStates.logout}
      />

      {/* Export Section */}
      <ExportSection
        onExport={handleExportCSV}
        exporting={loadingStates.export}
      />

      {/* Danger Zone */}
      <DangerZone
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        deleteInput={deleteInput}
        setDeleteInput={setDeleteInput}
        onDelete={handleDeleteAccount}
        deleting={loadingStates.delete}
      />
    </div>
  )
}

// ==================== Subcomponents ====================

interface ProfileSectionProps {
  profileForm: ProfileFormData
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormData>>
  userEmail: string
  initials: string
  saving: boolean
  onSave: () => Promise<void>
}

function ProfileSection({
  profileForm,
  setProfileForm,
  userEmail,
  initials,
  saving,
  onSave,
}: ProfileSectionProps) {
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="settings-card">
      <div className="profile-header">
        <div className="avatar">{initials}</div>
        <div>
          <div className="avatar-name">{profileForm.full_name || t("settings_title")}</div>
          <div className="avatar-email">{userEmail}</div>
        </div>
      </div>

      <FormField label={lang === "en" ? "Full Name" : "الاسم الكامل"}>
        <Input
          placeholder={lang === "en" ? "Full Name" : "الاسم الكامل"}
          value={profileForm.full_name}
          onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
        />
      </FormField>

      <FormField label={lang === "en" ? "Monthly Salary (JOD)" : "الراتب الشهري (JOD)"}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={profileForm.monthly_income}
          onChange={(e) => setProfileForm((f) => ({ ...f, monthly_income: e.target.value }))}
        />
      </FormField>

      <FormField label={lang === "en" ? "Salary Day (1-28)" : "يوم استلام الراتب (1-28)"}>
        <Input
          type="number"
          min="1"
          max="28"
          placeholder="1"
          value={profileForm.salary_day}
          onChange={(e) => setProfileForm((f) => ({ ...f, salary_day: e.target.value }))}
        />
      </FormField>

      <FormField label={lang === "en" ? "Currency" : "العملة"}>
        <Select
          value={profileForm.currency}
          onChange={(e) => setProfileForm((f) => ({ ...f, currency: e.target.value }))}
        >
          <option value="JOD">
            {lang === "en" ? "Jordanian Dinar (JOD)" : "دينار أردني (JOD)"}
          </option>
          <option value="USD">{lang === "en" ? "US Dollar (USD)" : "دولار (USD)"}</option>
          <option value="EUR">{lang === "en" ? "Euro (EUR)" : "يورو (EUR)"}</option>
          <option value="SAR">{lang === "en" ? "Saudi Riyal (SAR)" : "ريال سعودي (SAR)"}</option>
        </Select>
      </FormField>

      <FormField label={lang === "en" ? "Language" : "اللغة"}>
        <div className="toggle-group">
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`toggle-option ${lang === l ? "active" : ""}`}
            >
              {l === "ar" ? "🇯🇴 العربية" : "🇬🇧 English"}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label={t("settings_theme")}>
        <div className="toggle-group">
          {(["dark", "light"] as const).map((themeOpt) => (
            <button
              key={themeOpt}
              onClick={() => themeOpt !== theme && toggleTheme()}
              className={`toggle-option ${theme === themeOpt ? "active" : ""}`}
            >
              {themeOpt === "dark" ? t("settings_dark") : t("settings_light")}
            </button>
          ))}
        </div>
      </FormField>

      <SaveButton
        label={lang === "en" ? "Save Changes" : "حفظ التغييرات"}
        loading={saving}
        onClick={onSave}
      />
    </div>
  )
}

interface AssetsSectionProps {
  assetsForm: AssetsFormData
  setAssetsForm: React.Dispatch<React.SetStateAction<AssetsFormData>>
  totalAssets: number
  assetsAge: number | null
  currency: string
  saving: boolean
  onSave: () => Promise<void>
}

function AssetsSection({
  assetsForm,
  setAssetsForm,
  totalAssets,
  assetsAge,
  currency,
  saving,
  onSave,
}: AssetsSectionProps) {
  const { t, lang } = useI18n()

  return (
    <div className="settings-card assets-card">
      <div className="section-header">
        <div className="section-title">{t("settings_assets_title")}</div>
        {assetsAge !== null && (
          <div className={`assets-age ${assetsAge >= 3 ? "warning" : ""}`}>
            {assetsAge >= 3 && "⚠️ "}
            {lang === "en"
              ? `Updated ${assetsAge}mo ago`
              : `آخر تحديث منذ ${assetsAge} أشهر`}
          </div>
        )}
      </div>

      <p className="section-description">{t("settings_assets_desc")}</p>

      {totalAssets > 0 && (
        <div className="total-assets-card">
          <span>💼 {t("settings_assets_total")}</span>
          <span className="total-assets-value">
            {totalAssets.toLocaleString()} {currency}
          </span>
        </div>
      )}

      <FormField label={`🏠 ${t("settings_assets_realestate")}`}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={assetsForm.real_estate}
          onChange={(e) => setAssetsForm((a) => ({ ...a, real_estate: e.target.value }))}
        />
      </FormField>

      <FormField label={`🚗 ${t("settings_assets_vehicles")}`}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={assetsForm.vehicles}
          onChange={(e) => setAssetsForm((a) => ({ ...a, vehicles: e.target.value }))}
        />
      </FormField>

      <FormField label={`👑 ${t("settings_assets_jewelry")}`}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={assetsForm.jewelry}
          onChange={(e) => setAssetsForm((a) => ({ ...a, jewelry: e.target.value }))}
        />
      </FormField>

      <FormField label={`📦 ${t("settings_assets_other")}`}>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={assetsForm.other_assets}
          onChange={(e) => setAssetsForm((a) => ({ ...a, other_assets: e.target.value }))}
        />
      </FormField>

      <SaveButton
        label={lang === "en" ? "Save Assets" : "حفظ الأصول"}
        loading={saving}
        onClick={onSave}
      />
    </div>
  )
}

interface AccountSectionProps {
  onLogout: () => Promise<void>
  loggingOut: boolean
}

function AccountSection({ onLogout, loggingOut }: AccountSectionProps) {
  const { t, lang } = useI18n()

  return (
    <div className="settings-card">
      <div className="section-title">{lang === "en" ? "Account" : "الحساب"}</div>
      <PushToggle />
      <div className="divider" />
      <button
        onClick={onLogout}
        disabled={loggingOut}
        className="logout-button"
      >
        {loggingOut ? "⏳ ..." : lang === "en" ? "Sign Out ←" : "تسجيل الخروج ←"}
      </button>
    </div>
  )
}

interface ExportSectionProps {
  onExport: () => Promise<void>
  exporting: boolean
}

function ExportSection({ onExport, exporting }: ExportSectionProps) {
  const { t, lang } = useI18n()
  const { user: currentUser } = useUser()
  const supabase = useRef(createClient()).current

  const handleExport = async () => {
    if (exporting) return
    onExport() // this will set loading state and fetch data, but we need the actual CSV generation here
    // We'll re-fetch because onExport already did, but to avoid duplication, we can move logic here
    // Actually, we can keep onExport as the handler that does the fetch and then call a separate function for CSV generation
    // For simplicity, I'll move the export logic entirely inside this component.
    const user = currentUser
    if (!user) return

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })

    if (error || !data?.length) {
      toast.error(t("settings_no_export"))
      return
    }

    const headers =
      lang === "en"
        ? ["Date", "Type", "Amount", "Category", "Description"]
        : ["التاريخ", "النوع", "المبلغ", "الفئة", "الوصف"]

    const rows = data.map((t) => [
      t.transaction_date,
      t.type === "income"
        ? lang === "en"
          ? "Income"
          : "دخل"
        : lang === "en"
        ? "Expense"
        : "مصروف",
      t.amount,
      t.category ?? "",
      t.description ?? "",
    ])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `financetracker-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t("settings_export_ok"))
  }

  return (
    <div className="settings-card">
      <div className="section-title">{t("settings_data")}</div>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="export-button"
      >
        {exporting ? t("settings_exporting") : t("settings_export")}
      </button>
    </div>
  )
}

interface DangerZoneProps {
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (show: boolean) => void
  deleteInput: string
  setDeleteInput: (value: string) => void
  onDelete: () => Promise<void>
  deleting: boolean
}

function DangerZone({
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteInput,
  setDeleteInput,
  onDelete,
  deleting,
}: DangerZoneProps) {
  const { t, lang } = useI18n()

  return (
    <div className="settings-card danger-card">
      <div className="danger-title">{t("settings_danger")}</div>
      <p className="danger-description">
        {lang === "en"
          ? "Deleting your account will permanently erase all your data and cannot be undone."
          : "حذف الحساب سيمسح جميع بياناتك نهائياً ولا يمكن استرجاعها."}
      </p>

      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="danger-button"
        >
          🗑️ {lang === "en" ? "Delete my account permanently" : "حذف حسابي نهائياً"}
        </button>
      ) : (
        <div className="delete-confirm">
          <p className="confirm-text">
            {lang === "en"
              ? "Type \"delete my account\" to confirm:"
              : "اكتب \"حذف حسابي\" للتأكيد:"}
          </p>
          <input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder={lang === "en" ? "delete my account" : "حذف حسابي"}
            className="delete-input"
          />
          <div className="confirm-buttons">
            <button
              onClick={onDelete}
              disabled={deleteInput !== "حذف حسابي" || deleting}
              className="confirm-delete"
            >
              {deleting
                ? "⏳ ..."
                : lang === "en"
                ? "Confirm Delete"
                : "تأكيد الحذف"}
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteInput("")
              }}
              className="cancel-delete"
            >
              {lang === "en" ? "Cancel" : "إلغاء"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
