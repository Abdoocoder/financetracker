"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-context"
import { useI18n } from "@/lib/i18n"
import { toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getProvider, SUPPORTED_PROVIDERS } from "@/lib/byok/providers"
import { saveProviderKey, getProviderKey, deleteProviderKey, hasProviderKey } from "@/lib/byok/vault"

interface BYOKKeyRecord {
  id: string
  provider_id: string
  key_name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
  /** True when this browser's vault holds the decrypted ciphertext for this key. */
  hasKey: boolean
}

// Get only proxy providers (kind === 'proxy') — clientDirect providers
// (e.g. Local Ollama) dial the LLM directly from the browser and never
// store a key here.
const PROXY_PROVIDERS = Object.values(SUPPORTED_PROVIDERS).filter(p => p.kind === 'proxy')

export function BYOKKeysSection() {
  const { user } = useUser()
  const supabase = useRef(createClient()).current
  const { t, lang } = useI18n()

  const [keys, setKeys] = useState<BYOKKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyProvider, setNewKeyProvider] = useState("")
  const [newKeyValue, setNewKeyValue] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [vaultUnavailable, setVaultUnavailable] = useState(false)

  const loadKeys = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("user_byok_keys")
        .select("id, provider_id, key_name, key_prefix, created_at, last_used_at, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      if (error) throw error
      const rows = data ?? []
      // Fast presence check against the local vault (never decrypts).
      const vaulted = await Promise.all(rows.map(r => hasProviderKey(r.id)))
      setKeys(rows.map((r, i) => ({ ...r, hasKey: vaulted[i] })))
      setVaultUnavailable(false)
    } catch (err) {
      setVaultUnavailable(true)
      // Fail silently on table-missing (migration not applied yet) but still
      // surface non-RLS errors.
      console.error("BYOK keys load failed:", err)
    }
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadKeys() }, [loadKeys])

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
    if (!user) return
    if (saving) return
    if (!newKeyName.trim() || !newKeyProvider || !newKeyValue.trim()) return
    setSaving(true)
    const keyId = crypto.randomUUID()
    const rawKey = newKeyValue.trim()
    try {
      // 1. Encrypt into the local IndexedDB vault FIRST (AD-3: browser-only).
      await saveProviderKey(keyId, rawKey)

      // 2. Persist metadata only to Supabase — never the key itself.
      const { error } = await supabase
        .from("user_byok_keys")
        .insert({
          id: keyId,
          user_id: user.id,
          provider_id: newKeyProvider,
          key_name: newKeyName.trim(),
          key_prefix: getKeyPrefix(newKeyProvider, rawKey),
          is_active: true,
        })
      if (error) {
        await deleteProviderKey(keyId) // roll back the orphaned ciphertext
        throw error
      }

      setKeys(prev => [{
        id: keyId,
        provider_id: newKeyProvider,
        key_name: newKeyName.trim(),
        key_prefix: getKeyPrefix(newKeyProvider, rawKey),
        created_at: new Date().toISOString(),
        last_used_at: null,
        is_active: true,
        hasKey: true,
      }, ...prev])
      toast.success(t("settings_byok_keys_created") || "BYOK key saved")
      setNewKeyName("")
      setNewKeyProvider("")
      setNewKeyValue("")
      setShowKey(false)
    } catch (err) {
      toast.error((err as Error).message || t("error_generic") || "Failed to save key")
    }
    setSaving(false)
  }

  const handleRevoke = async (keyId: string) => {
    if (saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from("user_byok_keys").delete().eq("id", keyId)
      if (error) throw error
      await deleteProviderKey(keyId)
      setKeys(prev => prev.filter(k => k.id !== keyId))
      toast.success(t("settings_byok_keys_revoked") || "Key removed")
      setRevokeId(null)
    } catch (err) {
      toast.error((err as Error).message || t("error_generic") || "Failed to remove key")
    }
    setSaving(false)
  }

  const handleTestKey = async (key: BYOKKeyRecord) => {
    if (testingId) return
    setTestingId(key.id)
    toast.info(t("settings_byok_keys_testing") || "Testing key...")
    try {
      // Recover the raw key ON DEMAND from the browser vault only.
      const providerKey = await getProviderKey(key.id)
      if (!providerKey) {
        toast.error(t("settings_byok_keys_no_local") || "Key not stored in this browser. Re-add it here to test.")
        return
      }
      const { byokChat } = await import("@/lib/byok/client")
      const { buildChatBody } = await import("@/lib/byok/chat")
      const provider = getProvider(key.provider_id)
      if (!provider) throw new Error("Unknown provider")

      // Provider-native body (openai-compatible / anthropic / gemini shapes)
      // so the Test button works for every provider, not just OpenAI-compatible.
      const testBody = JSON.stringify(
        buildChatBody(provider, "", [{ role: "user", content: "Hi" }], provider.defaultModel, false)
      )

      const response = await byokChat({
        providerId: key.provider_id,
        providerKey,
        body: testBody,
        stream: false,
      })
      if (response.ok) {
        toast.success(t("settings_byok_keys_test_ok") || "Key works!")
        // Best-effort last_used_at stamp (metadata only).
        await supabase.from("user_byok_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id)
        setKeys(prev => prev.map(k => k.id === key.id ? { ...k, last_used_at: new Date().toISOString() } : k))
      } else {
        const body = await response.json().catch(() => null)
        toast.error(body?.error || t("settings_byok_keys_test_fail") || "Test failed")
      }
    } catch (err) {
      toast.error((err as Error).message || t("settings_byok_keys_test_fail") || "Test failed")
    }
    setTestingId(null)
  }

  const formatDate = (d: string | null) => {
    if (!d) return t("settings_byok_keys_never") || "Never"
    return new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const activeKeys = keys.filter(k => k.is_active)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        {t("settings_byok_keys_desc") || "Your LLM provider keys (BYOK). Keys are encrypted in your browser (IndexedDB) and never sent to our servers. They are used per-request via our proxy to bypass CORS."}
      </p>

      {vaultUnavailable && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "var(--accent-red-dim)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--accent-red-light)", fontSize: 12, lineHeight: 1.6,
        }}>
          {t("settings_byok_keys_vault_unavailable") || "The local key vault could not be opened (private browsing / unsupported browser). Saving or testing keys is disabled."}
        </div>
      )}

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
                    disabled={!!testingId}
                    aria-label={t("settings_byok_keys_test") || "Test key"}
                    style={{
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(59,126,246,0.1)", border: "1px solid rgba(59,126,246,0.2)",
                      color: "var(--accent-blue-light)", fontSize: 11, fontWeight: 700,
                      cursor: testingId ? "not-allowed" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    {testingId === key.id ? "⏳" : t("settings_byok_keys_test") || "Test"}
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
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  padding: "3px 8px", borderRadius: 6,
                  background: "rgba(59,126,246,0.1)", border: "1px solid rgba(59,126,246,0.2)",
                  color: "var(--accent-blue-light)", fontSize: 10, fontWeight: 700,
                }}>
                  {provider?.name || key.provider_id}
                </span>
                {key.hasKey ? (
                  <span style={{
                    padding: "3px 8px", borderRadius: 6,
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                    color: "var(--accent-green-light)", fontSize: 10, fontWeight: 700,
                  }}>
                    {t("settings_byok_keys_local") || "Key stored on this device"}
                  </span>
                ) : (
                  <span style={{
                    padding: "3px 8px", borderRadius: 6,
                    background: "var(--bg-secondary)", border: "1px solid var(--border)",
                    color: "var(--text-muted)", fontSize: 10, fontWeight: 700,
                  }}>
                    {t("settings_byok_keys_not_local") || "Not stored on this device"}
                  </span>
                )}
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
              autoFocus
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