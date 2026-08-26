/**
 * API Key management for external integrations.
 *
 * Keys follow the format: fjk_live_<48-hex-chars>
 * Stored as SHA-256 hashes — the full key is shown only once at creation.
 *
 * SERVER-ONLY — import only from API route handlers.
 */
import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from './supabase/admin'

const KEY_PREFIX = 'fjk_live_'
const KEY_BYTES = 48 // 96 hex chars after prefix

export interface ApiKeyRecord {
  id: string
  user_id: string
  name: string
  key_hash: string
  key_prefix: string
  scopes: string[]
  rate_limit_per_min: number
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export interface CreateApiKeyResult {
  id: string
  name: string
  full_key: string   // only shown once
  key_prefix: string
  scopes: string[]
  rate_limit_per_min: number
  expires_at: string | null
  created_at: string
}

/** Hash a raw API key with SHA-256. */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/** Generate a new API key and return the full key + metadata. */
export function generateApiKey(): { fullKey: string; hash: string; prefix: string } {
  const random = randomBytes(KEY_BYTES).toString('hex')
  const fullKey = `${KEY_PREFIX}${random}`
  const hash = hashKey(fullKey)
  const prefix = fullKey.slice(0, 12) + '...'
  return { fullKey, hash, prefix }
}

/** Create an API key for a user. Returns the full key (shown once). */
export async function createApiKey(
  userId: string,
  name: string,
  options: {
    scopes?: string[]
    rateLimitPerMin?: number
    expiresAt?: string | null
  } = {}
): Promise<CreateApiKeyResult> {
  const supabase = createAdminClient()
  const { fullKey, hash, prefix } = generateApiKey()

  const { data, error } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes: options.scopes ?? ['create_transaction', 'read_transactions', 'read_balances'],
      rate_limit_per_min: options.rateLimitPerMin ?? 10,
      expires_at: options.expiresAt ?? null,
    })
    .select('id, name, key_prefix, scopes, rate_limit_per_min, expires_at, created_at')
    .single()

  if (error) throw new Error(`Failed to create API key: ${error.message}`)

  return { ...data, full_key: fullKey }
}

/** Verify an API key and return the associated user_id + key metadata. Returns null if invalid. */
export async function verifyApiKey(
  key: string
): Promise<{ userId: string; keyId: string; scopes: string[]; rateLimitPerMin: number } | null> {
  if (!key.startsWith(KEY_PREFIX)) return null

  const supabase = createAdminClient()
  const hash = hashKey(key)

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, user_id, scopes, rate_limit_per_min, is_active, expires_at')
    .eq('key_hash', hash)
    .single()

  if (error || !data) return null
  if (!data.is_active) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Update last_used_at (fire and forget)
  supabase
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    userId: data.user_id,
    keyId: data.id,
    scopes: data.scopes,
    rateLimitPerMin: data.rate_limit_per_min,
  }
}

/** List API keys for a user (never returns the full key or hash). */
export async function listApiKeys(userId: string): Promise<Omit<ApiKeyRecord, 'key_hash'>[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, user_id, name, key_prefix, scopes, rate_limit_per_min, is_active, last_used_at, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list API keys: ${error.message}`)
  return data ?? []
}

/** Revoke (deactivate) an API key. */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`)
}

/** Write an audit log entry. */
export async function writeAuditLog(entry: {
  apiKeyId: string
  userId: string
  action: string
  payload?: Record<string, unknown>
  ip?: string
  userAgent?: string
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('api_audit_log').insert({
    api_key_id: entry.apiKeyId,
    user_id: entry.userId,
    action: entry.action,
    payload: entry.payload ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
  })
}
