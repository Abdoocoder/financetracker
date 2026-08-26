"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/lib/user-context"
import { useI18n } from "@/lib/i18n"
import { toast } from "@/components/ui/toast"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { ApiKeyRecord } from "@/types"

export function ApiKeysSection() {
  const { user } = useUser()
  const supabase = useRef(createClient()).current
  const { t, lang } = useI18n()

  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from("user_api_keys")
      .select("id, user_id, name, key_prefix, scopes, rate_limit_per_min, is_active, last_used_at, expires_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (!error) setKeys(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadKeys() }, [loadKeys])

  const handleGenerate = async () => {
    if (!user || !newKeyName.trim()) return
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error("Auth error"); setGenerating(false); return }

      const res = await fetch("/api/api-keys/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })

      const result = await res.json()
      if (!res.ok) { toast.error(result.error || "Failed"); setGenerating(false); return }

      setNewKey(result.full_key)
      setNewKeyName("")
      toast.success(t("settings_api_keys_created"))
      loadKeys()
    } catch {
      toast.error("Network error")
    }
    setGenerating(false)
  }

  const handleRevoke = async (keyId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/api-keys/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ key_id: keyId }),
      })

      if (res.ok) {
        toast.success(t("settings_api_keys_revoked"))
        loadKeys()
      }
    } catch { /* ignore */ }
    setRevokeId(null)
  }

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    toast.success(t("settings_api_keys_copied"))
  }

  const formatDate = (d: string | null) => {
    if (!d) return t("settings_api_keys_never")
    return new Date(d).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" })
  }

  const activeKeys = keys.filter(k => k.is_active)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        {t("settings_api_keys_desc")}
      </p>

      {/* Existing keys */}
      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>⏳</div>
      ) : activeKeys.length === 0 && !newKey ? (
        <div style={{
          padding: 24, textAlign: "center",
          background: "var(--bg-secondary)", borderRadius: 14, border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("settings_api_keys_none")}</div>
        </div>
      ) : (
        activeKeys.map(key => (
          <div key={key.id} style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "14px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>{key.name}</div>
              <button
                onClick={() => setRevokeId(key.id)}
                aria-label={t("settings_api_keys_revoke")}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  background: "var(--accent-red-dim)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "var(--accent-red-light)", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t("settings_api_keys_revoke")}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", marginBottom: 6 }}>
              {key.key_prefix}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
              <span>{t("settings_api_keys_created_at")}: {formatDate(key.created_at)}</span>
              <span>{t("settings_api_keys_last_used")}: {formatDate(key.last_used_at)}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {(key.scopes ?? []).map(scope => (
                <span key={scope} style={{
                  padding: "3px 8px", borderRadius: 6,
                  background: scope === 'create_transaction' ? "rgba(59,126,246,0.1)" : "rgba(16,185,129,0.1)",
                  border: `1px solid ${scope === 'create_transaction' ? "rgba(59,126,246,0.2)" : "rgba(16,185,129,0.2)"}`,
                  color: scope === 'create_transaction' ? "var(--accent-blue-light)" : "var(--accent-green)",
                  fontSize: 10, fontWeight: 700,
                }}>
                  {scope === 'create_transaction' ? t("settings_api_keys_scope_create")
                    : scope === 'read_transactions' ? t("settings_api_keys_scope_read_tx")
                    : scope === 'read_balances' ? t("settings_api_keys_scope_read_bal")
                    : scope}
                </span>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Newly created key display */}
      {newKey && (
        <div style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,126,246,0.05))",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 14,
          padding: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-green)", marginBottom: 10 }}>
            {t("settings_api_keys_created")}
          </div>
          <div style={{
            background: "var(--bg-card)", borderRadius: 10, padding: "10px 14px",
            fontFamily: "monospace", fontSize: 12, color: "var(--text-primary)",
            wordBreak: "break-all", marginBottom: 10, border: "1px solid var(--border)",
          }}>
            {newKey}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => copyKey(newKey)}
              style={{
                flex: 1, padding: "10px", borderRadius: 10,
                background: "var(--accent-green-dim)", border: "1px solid rgba(16,185,129,0.3)",
                color: "var(--accent-green)", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {t("settings_api_keys_copy")}
            </button>
            <button
              onClick={() => setNewKey(null)}
              style={{
                padding: "10px 16px", borderRadius: 10,
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Generate new key form */}
      {!newKey && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder={t("settings_api_keys_name_placeholder")}
            onKeyDown={e => e.key === "Enter" && handleGenerate()}
            style={{
              flex: 1, padding: "11px 14px", borderRadius: 12,
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !newKeyName.trim()}
            style={{
              padding: "11px 18px", borderRadius: 12,
              background: generating || !newKeyName.trim() ? "var(--bg-secondary)" : "var(--accent-blue-dim)",
              border: `1px solid ${generating || !newKeyName.trim() ? "var(--border)" : "rgba(59,126,246,0.3)"}`,
              color: generating || !newKeyName.trim() ? "var(--text-muted)" : "var(--accent-blue-light)",
              fontSize: 13, fontWeight: 700, cursor: generating || !newKeyName.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            {generating ? "⏳" : `+ ${t("settings_api_keys_generate")}`}
          </button>
        </div>
      )}

      {/* Usage example */}
      {activeKeys.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{
            fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
            cursor: "pointer", padding: "8px 0",
          }}>
            {t("settings_api_keys_usage_title")}
          </summary>
          <div style={{
            background: "var(--bg-secondary)", borderRadius: 12, padding: 14,
            fontFamily: "monospace", fontSize: 11, lineHeight: 1.8,
            color: "var(--text-muted)", border: "1px solid var(--border)",
            overflowX: "auto",
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "var(--accent-blue-light)", fontWeight: 700 }}>POST</span> {t("settings_api_keys_usage_url")}
              <div style={{ marginTop: 2, whiteSpace: "pre-wrap" }}>{t("settings_api_keys_usage_body")}</div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
              <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>GET</span> {t("settings_api_keys_get_usage")}
            </div>
            <div style={{ marginTop: 6 }}><span style={{ color: "var(--accent-blue-light)" }}>Authorization:</span> {t("settings_api_keys_usage_header")}</div>
          </div>
        </details>
      )}

      {revokeId && (
        <ConfirmDialog
          title={t("settings_api_keys_revoke")}
          message={lang === "ar" ? "هل أنت متأكد من إلغاء صلاحية هذا المفتاح؟ لن تتمكن من استخدامه مجدداً." : "Are you sure? This key will be permanently deactivated."}
          confirmLabel={t("settings_api_keys_revoke")}
          cancelLabel={t("goals_cancel")}
          onConfirm={() => handleRevoke(revokeId)}
          onCancel={() => setRevokeId(null)}
          danger
        />
      )}
    </div>
  )
}
