'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { SUPPORTED_PROVIDERS, type ByokProvider } from '@/lib/byok/providers'
import { byokChat } from '@/lib/byok/client'
import { getProviderKey, isVaultUnavailable } from '@/lib/byok/vault'
import { buildChatBody, readStream, type ChatMsg } from '@/lib/byok/chat'
import { formatAmount } from '@/lib/currency'

interface ByokKeyRow {
    id: string
    provider_id: string
    key_name: string | null
}

const PROVIDERS = Object.values(SUPPORTED_PROVIDERS)

export default function ChatAssistant() {
    const { user, profile } = useUser()
    const { t } = useI18n()
    const supabase = useMemo(() => createClient(), [])
    const { totalBalance, loading: balancesLoading } = useAccounts(user?.id)

    const [byokKeys, setByokKeys] = useState<ByokKeyRow[]>([])
    const [monthly, setMonthly] = useState<{ income: number; expense: number } | null>(null)
    const [providerId, setProviderId] = useState<string>('ollama')
    const [keyId, setKeyId] = useState<string>('')
    const [model, setModel] = useState<string>('')
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [vaultUnavailable, setVaultUnavailable] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const bottomRef = useRef<HTMLDivElement | null>(null)

    const provider = SUPPORTED_PROVIDERS[providerId]
    const currency = profile?.currency ?? 'KWD'

    // Load BYOK key metadata (never the key material) + monthly summary.
    useEffect(() => {
        if (!user) return
        setVaultUnavailable(isVaultUnavailable())
        supabase
            .from('user_byok_keys')
            .select('id, provider_id, key_name')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at')
            .then(({ data }) => setByokKeys(data ?? []))

        const today = new Date()
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        const iso = (d: Date) => d.toISOString().slice(0, 10)
        supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .gte('transaction_date', iso(firstDay))
            .lte('transaction_date', iso(today))
            .then(({ data }) => {
                if (!data) return
                let income = 0
                let expense = 0
                for (const tx of data) {
                    if (tx.type === 'income') income += Number(tx.amount)
                    else if (tx.type === 'expense') expense += Number(tx.amount)
                }
                setMonthly({ income, expense })
            })
        return undefined
    }, [user, supabase])

    const providerKeys = useMemo(
        () => byokKeys.filter(k => k.provider_id === providerId),
        [byokKeys, providerId]
    )

    const needsKey = provider?.kind === 'proxy'
    const selectedKey = providerKeys.find(k => k.id === keyId)
    const canSend = !sending && !!input.trim() && (!needsKey || !!selectedKey)

    // Reset key/model when provider changes (never on every render).
    const prevProviderRef = useRef<string>('')
    useEffect(() => {
        if (providerId === prevProviderRef.current) return
        prevProviderRef.current = providerId
        setKeyId('')
        setModel(provider?.defaultModel ?? '')
        setError(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providerId, provider?.defaultModel])

    // After keys load (or on key selection), keep a valid keyId selected.
    useEffect(() => {
        if (provider?.kind === 'clientDirect') {
            setKeyId('')
            return
        }
        if (providerKeys.length && !providerKeys.some(k => k.id === keyId)) {
            setKeyId(providerKeys[0].id)
        }
    }, [providerKeys, keyId, provider?.kind])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, sending])

    const systemPrompt = useMemo(() => {
        const parts = [t('chat_financial_context')]
        if (!balancesLoading) {
            parts.push(
                `Current total balance: ${formatAmount(totalBalance, currency)}.` +
                (monthly
                    ? ` This month: income ${formatAmount(monthly.income, currency)}, expenses ${formatAmount(monthly.expense, currency)}.`
                    : '')
            )
        }
        return parts.join('\n')
    }, [t, balancesLoading, totalBalance, monthly, currency])

    const send = useCallback(async () => {
        const text = input.trim()
        if (!text || sending) return
        if (!provider) return
        if (provider.kind === 'proxy' && !selectedKey) {
            setError(t('chat_error_no_key'))
            return
        }

        const userMsg: ChatMsg = { role: 'user', content: text }
        const nextMessages = [...messages, userMsg]
        setMessages(nextMessages)
        setInput('')
        setSending(true)
        setError(null)

        const abort = new AbortController()
        abortRef.current = abort

        try {
            const assistantMsg: ChatMsg = { role: 'assistant', content: '' }
            setMessages(prev => [...prev, assistantMsg])
            const appendDelta = (delta: string) => {
                setMessages(prev => {
                    const copy = [...prev]
                    const last = copy[copy.length - 1]
                    if (last && last.role === 'assistant') {
                        copy[copy.length - 1] = { role: 'assistant', content: last.content + delta }
                    }
                    return copy
                })
            }

            const history = nextMessages
            const body = buildChatBody(provider, systemPrompt, history, model || provider.defaultModel, true)

            let res: Response
            if (provider.kind === 'clientDirect') {
                // Ollama local — direct from the browser (no proxy, no key).
                const url = provider.baseUrl.endsWith('/v1')
                    ? `${provider.baseUrl}/chat/completions`
                    : provider.baseUrl
                res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: abort.signal,
                })
            } else {
                const providerKey = await getProviderKey(selectedKey!.id)
                if (!providerKey) throw new Error('no-key')
                res = await byokChat({
                    providerId: provider.id,
                    providerKey,
                    body,
                    stream: true,
                    signal: abort.signal,
                })
            }

            if (abort.signal.aborted) return
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) throw new Error('unauthorized')
                // Proxy 502 → upstream rejected the malformed body; show generic + CORS hint for ollama.
                if (provider.kind === 'clientDirect') throw new Error('ollama-cors')
                throw new Error('generic')
            }

            await readStream(res, provider.id, appendDelta)
        } catch (err) {
            if (abort.signal.aborted) return
            const code = err instanceof Error ? err.message : 'generic'
            if (code === 'no-key') setError(t('chat_error_no_key'))
            else if (code === 'unauthorized') setError(t('chat_error_unauthorized'))
            else if (code === 'ollama-cors') setError(t('chat_error_ollama_cors'))
            else setError(t('chat_error_generic'))
            // Drop the empty assistant bubble on failure so the user can retry.
            setMessages(prev => {
                const copy = [...prev]
                if (copy.length && copy[copy.length - 1].content === '') copy.pop()
                return copy
            })
        } finally {
            setSending(false)
            abortRef.current = null
        }
    }, [input, sending, provider, selectedKey, messages, systemPrompt, model, t])

    const stop = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    const clear = useCallback(() => {
        setMessages([])
        setError(null)
    }, [])

    const greeting: ChatMsg[] = messages.length
        ? messages
        : [{ role: 'assistant', content: t('chat_greeting') }]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 180px)', minHeight: 420 }}>
            {/* Provider / key / model bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat_provider')}</label>
                    <select
                        aria-label={t('chat_provider')}
                        value={providerId}
                        onChange={e => setProviderId(e.target.value)}
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', fontSize: 14 }}
                    >
                        {PROVIDERS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {needsKey && (
                        <>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat_key')}</label>
                            {providerKeys.length ? (
                                <select
                                    aria-label={t('chat_key')}
                                    value={keyId}
                                    onChange={e => setKeyId(e.target.value)}
                                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', fontSize: 14 }}
                                >
                                    {providerKeys.map(k => (
                                        <option key={k.id} value={k.id}>{k.key_name ?? k.id.slice(0, 8)}</option>
                                    ))}
                                </select>
                            ) : (
                                <span style={{ fontSize: 12, color: 'var(--accent-red-light)' }}>
                                    {t('chat_key_none').replace('{provider}', provider.name)}{' '}
                                    <Link href="/dashboard/settings" style={{ color: 'var(--accent-blue)' }}>{t('chat_setup_keys')}</Link>
                                </span>
                            )}
                        </>
                    )}

                    {provider?.kind === 'clientDirect' && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat_ollama_no_key')}</span>
                    )}

                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat_model')}</label>
                    <input
                        aria-label={t('chat_model')}
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        placeholder={provider?.id === 'openrouter' ? t('chat_auto_model') : provider?.defaultModel}
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', fontSize: 14, width: 220 }}
                    />
                </div>
                {(vaultUnavailable && needsKey) && (
                    <div style={{ fontSize: 12, color: 'var(--accent-red-light)' }}>{t('chat_error_vault')}</div>
                )}
                {needsKey && providerKeys.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔒 {t('chat_context_included')}</div>
                )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 2px' }}>
                {greeting.map((m, i) => (
                    <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        padding: '10px 14px',
                        borderRadius: 16,
                        whiteSpace: 'pre-wrap',
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        background: m.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-card)',
                        border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                    }}>
                        {m.content || (sending ? <span style={{ color: 'var(--text-muted)' }}>{t('chat_thinking')}</span> : '')}
                    </div>
                ))}
                {messages.length === 0 && !sending && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                        {t('chat_context_label')}: {t('chat_context_included')}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {error && (
                <div style={{ fontSize: 12, color: 'var(--accent-red-light)', padding: '8px 12px', background: 'var(--accent-red-dim)', borderRadius: 12, marginTop: 8 }}>⚠️ {error}</div>
            )}

            {/* Composer */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                    aria-label={t('chat_input_placeholder')}
                    autoFocus
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (canSend) send()
                        }
                    }}
                    placeholder={t('chat_input_placeholder')}
                    style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', fontSize: 14 }}
                />
                {sending ? (
                    <button onClick={stop} aria-label={t('chat_stop')}
                        style={{ background: 'var(--accent-red-dim)', color: 'var(--accent-red-light)', border: '1px solid var(--accent-red-light)', borderRadius: 12, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}>
                        {t('chat_stop')}
                    </button>
                ) : (
                    <button
                        onClick={send}
                        disabled={!canSend}
                        aria-label={t('chat_send')}
                        style={{ background: canSend ? 'var(--accent-blue)' : 'var(--bg-elevated)', color: canSend ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', borderRadius: 12, padding: '10px 18px', cursor: canSend ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}
                    >
                        {t('chat_send')}
                    </button>
                )}
                {messages.length > 0 && (
                    <button onClick={clear} aria-label={t('chat_clear')}
                        style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontSize: 13 }}>
                        {t('chat_clear')}
                    </button>
                )}
            </div>
        </div>
    )
}