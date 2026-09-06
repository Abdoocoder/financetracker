"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-context"
import { useI18n } from "@/lib/i18n"
import { toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getProvider, SUPPORTED_PROVIDERS, type ByokProvider } from "@/lib/byok/providers"

interface BYOKKeyRecord {
  id: string
  provider_id: string
  key_name: string
  encrypted_key: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

// DB row type (missing encrypted_key - stored in localStorage only)
interface BYOKKeyDbRow {
  id: string
  provider_id: string
  key_name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

// Get only proxy providers (kind === 'proxy')
const PROXY_PROVIDERS = Object.values(SUPPORTED_PROVIDERS).filter(p => p.kind === 'proxy')

export function BYOKKeysSection() {
  const { user } = useUser()
  const supabase = useRef(createClient()).current
  const { t, lang } = useI18n()

  const [keys, setKeys] = useState<BYOKKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyProvider, setNewKeyProvider] = useState<string>("")
  const [newKeyValue, setNewKeyValue] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("user_byok_keys")
        .select("id, provider_id, key_name, key_prefix, created_at, last_used_at, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (!error) setKeys((data ?? []).map(r => ({ ...r, encrypted_key: "" })))
    } catch {
      const stored = localStorage.getItem(`fajrak_byok_keys_${user.id}`)
      if (stored) {
        try { setKeys(JSON.parse(stored)) } catch {}
      }
    }
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadKeys() }, [loadKeys])

  const saveKeysToStorage = async (updatedKeys: BYOKKeyRecord[]) => {
    if (!user) return
    setKeys(updatedKeys)
    localStorage.setItem(`fajrak_byok_keys_${user.id}`, JSON.stringify(updatedKeys))
    try {
      await supabase.from("user_byok_keys").upsert(
        updatedKeys.map(k => ({
          user_id: user.id,
          provider_id: k.provider_id,
          key_name: k.key_name,
          key_prefix: k.key_prefix,
          created_at: k.created_at,
          last_used_at: k.last_used_at,
          is_active: k.is_active,
        }))
      )
    } catch {}
  }

  const getKeyPrefix = (providerId: string, fullKey: string): string => {
    const provider = getProvider(providerId)
    if (!provider) return fullKey.slice(0, 8) + "..."
    if (providerId === "nvidia-nim") return fullKey.startsWith("nvapi-") ? "nvapi-" + fullKey.slice(6, 10) + "..." : fullKey.slice(0, 8) + "..."
    if (providerId === "openai") return fullKey.startsWith("sk-") ? "sk-" + fullKey.slice(3, 7) + "..." : fullKey.slice(0, 8) + "..."
    if (providerId === "anthropic") return fullKey.startsWith("sk-ant-") ? "sk-ant-" + fullKey.slice(7, 11) + "..." : fullKey.slice(0, 8) + "..."
    if (providerId === "gemini") return fullKey.slice(0, 8) + "..."
    if (providerId === "openrouter") return fullKey.startsWith("sk-or-") ? "sk-or-" + fullKey.slice(6, 10) + "..." : fullKey.slice(0, 8) + "..."
    return fullKey.slice(0, 8) + "..."
  }

  const handleSave = async () => {
    if (!user || !newKeyName.trim() || !newKeyProvider || !newKeyValue.trim()) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const prefix = getKeyPrefix(newKeyProvider, newKeyValue.trim())
      const newKey: BYOKKeyRecord = {
        id: crypto.randomUUID(),
        provider_id: newKeyProvider,
        key_name: newKeyName.trim(),
        encrypted_key: "",
        key_prefix: prefix,
        created_at: now,
        last_used_at: null,
        is_active: true,
      }
      await saveKeysToStorage([...keys, newKey])
      toast.success(t("settings_byok_keys_created") || "BYOK key saved")
      setNewKeyName("")
      setNewKeyProvider("")
      setNewKeyValue("")
      setShowKey(false)
    } catch (err) {
      toast.error(t("error_generic") || "Failed to save key")
    }
    setSaving(false)
  }

  const handleRevoke = async (keyId: string) => {
    const updated = keys.filter(k => k.id !== keyId)
    await saveKeysToStorage(updated)
    toast.success(t("settings_byok_keys_revoked") || "Key removed")
    setRevokeId(null)
  }

  const handleTestKey = async (key: BYOKKeyRecord) => {
    toast.info(t("settings_byok_keys_testing") || "Testing key...")
    try {
      const { byokChat } = await import("@/lib/byok/client")
      const provider = getProvider(key.provider_id)
      if (!provider) throw new Error("Unknown provider")

      const testBody = JSON.stringify({
        model: provider.defaultModel,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      })

      const response = await byokChat({
        providerId: key.provider_id,
        providerKey: key.encrypted_key || "",
        body: testBody,
        stream: false,
      })
      if (response.ok) toast.success(t("settings_byok_keys_test_ok") || "Key works!")
      else toast.error(t("settings_byok_keys_test_fail") || "Test failed")
    } catch (err) {
      toast.error((err as Error).message || t("settings_byok_keys_test_fail") || "Test failed")
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return t("settings_byok_keys_never") || "Never"
    return new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const activeKeys = keys.filter(k => k.is_active)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        {t("settings_byok_keys_desc") || "Your LLM provider keys (BYOK). Keys are encrypted in your browser and never sent to our servers. They are used per-request via our proxy to bypass CORS."}
      </p>

      <details style={{ marginBottom: 8 }}>
        <summary style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", cursor: "pointer", padding: "8px 0" }}>
          {t("settings_byok_providers_title") || "Supported Providers"}
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {PROXY_PROVIDERS.map(p => (
            <span key={p.id} style={{
              padding: "4px 10px", borderRadius: 6,
              background: "rgba(59,126,246,0.1)", border: "1px solid rgba(59,126,246,0.2)",
              color: "var(--accent-blue-light)", fontSize: 11, fontWeight: 700,
            }}>
              {p.name} ({p.defaultModel})
            </span>
          ))}
        </div>
      </details>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>⏳</div>
      ) : activeKeys.length === 0 ? (
        <div style={{
          padding: 24, textAlign: "center",
          background: "var(--bg-secondary)", borderRadius: 14, border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {t("settings_byok_keys_none") || "No BYOK keys added yet. Add one below to start chatting with AI."}
          </div>
        </div>
      ) : (
        activeKeys.map(key => {
          const provider = getProvider(key.provider_id)
          return (
            <div key={key.id} style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>
                    {provider?.name === "NVIDIA NIM" ? "🟢" :
                     provider?.name === "OpenAI" ? "🔵" :
                     provider?.name === "Anthropic" ? "🟣" :
                     provider?.name === "Gemini" ? "🟡" : "🤖"}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>{key.key_name}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleTestKey(key)}
                    disabled={saving}
                    aria-label={t("settings_byok_keys_test") || "Test key"}
                    style={{
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(59,126,246,0.1)", border: "1px solid rgba(59,126,246,0.2)",
                      color: "var(--accent-blue-light)", fontSize: 11, fontWeight: 700,
                      cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("settings_byok_keys_test") || "Test"}
                  </button>
                  <button
                    onClick={() => setRevokeId(key.id)}
                    aria-label={t("settings_byok_keys_revoke") || "Revoke"}
                    style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: "var(--accent-red-dim)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "var(--accent-red-light)", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("settings_byok_keys_revoke") || "Remove"}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6 }}>
                {key.key_prefix}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
                <span>{t("settings_byok_keys_created_at") || "Added"}: {formatDate(key.created_at)}</span>
                <span>{t("settings_byok_keys_last_used") || "Last used"}: {formatDate(key.last_used_at)}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span style={{
                  padding: "3px 8px", borderRadius: 6,
                  background: "rgba(59,126,246,0.1)", border: "1px solid rgba(59,126,246,0.2)",
                  color: "var(--accent-blue-light)", fontSize: 10, fontWeight: 700,
                }}>
                  {provider?.name || key.provider_id}
                </span>
              </div>
            </div>
          )
        })
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>
          {t("settings_byok_keys_add_new") || "Add New BYOK Key"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={newKeyProvider}
              onChange={e => setNewKeyProvider(e.target.value)}
              style={{
                flex: 1, padding: "11px 14px", borderRadius: 12,
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            >
              <option value="">{t("settings_byok_keys_select_provider") || "Select provider"}</option>
              {PROXY_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.defaultModel}</option>
              ))}
            </select>
          </div>
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder={t("settings_byok_keys_name_placeholder") || "Key name (e.g., My NVIDIA Key)"}
            style={{
              padding: "11px 14px", borderRadius: 12,
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type={showKey ? "text" : "password"}
              value={newKeyValue}
              onChange={e => setNewKeyValue(e.target.value)}
              placeholder={t("settings_byok_keys_value_placeholder") || "Paste your provider API key"}
              style={{
                flex: 1, padding: "11px 14px", borderRadius: 12,
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none",
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                padding: "11px 14px", borderRadius: 12,
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: 16, cursor: "pointer", fontFamily: "inherit",
              }}
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? "🙈" : "👁️"}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !newKeyName.trim() || !newKeyProvider || !newKeyValue.trim()}
            style={{
              padding: "11px 18px", borderRadius: 12,
              background: saving || !newKeyName.trim() || !newKeyProvider || !newKeyValue.trim() ? "var(--bg-secondary)" : "var(--accent-blue-dim)",
              border: `1px solid ${saving || !newKeyName.trim() || !newKeyProvider || !newKeyValue.trim() ? "var(--border)" : "rgba(59,126,246,0.3)"}`,
              color: saving || !newKeyName.trim() || !newKeyProvider || !newKeyValue.trim() ? "var(--text-muted)" : "var(--accent-blue-light)",
              fontSize: 13, fontWeight: 700, cursor: saving || !newKeyName.trim() || !newKeyProvider || !newKeyValue.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap", alignSelf: "flex-start",
            }}
          >
            {saving ? "⏳" : `+ ${t("settings_byok_keys_add") || "Add Key"}`}
          </button>
        </div>
      </div>

      {revokeId && (
        <ConfirmDialog
          title={t("settings_byok_keys_revoke") || "Remove Key"}
          message={lang === "ar" ? "هل أنت متأكد من حذف هذا المفتاح؟" : "Are you sure? This key will be permanently removed."}
          confirmLabel={t("settings_byok_keys_revoke") || "Remove"}
          cancelLabel={t("goals_cancel") || "Cancel"}
          onConfirm={() => handleRevoke(revokeId)}
          onCancel={() => setRevokeId(null)}
          danger
        />
      )}
    </div>
  )
}