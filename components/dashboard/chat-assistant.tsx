'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/user-context'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { useAccounts } from '@/hooks/useAccounts'
import { SUPPORTED_PROVIDERS } from '@/lib/byok/providers'
import { byokAgent } from '@/lib/byok/client'
import { getProviderKey, hasProviderKey, isVaultUnavailable } from '@/lib/byok/vault'
import { buildChatBody, readAgentStream, readStream, type ChatMsg } from '@/lib/byok/chat'
import { buildChatFormatRules } from '@/lib/byok/system-prompt'
import { formatAmount } from '@/lib/currency'

interface ByokKeyRow {
    id: string
    provider_id: string
    key_name: string | null
    hasKey?: boolean
}

interface PendingConfirmation {
    tool: string
    args: Record<string, unknown>
}

const PROVIDERS = Object.values(SUPPORTED_PROVIDERS)

/** Tool name → trace line. Unknown tools fall back to `chat_trace_generic`. */
const TRACE_KEYS: Record<string, string> = {
    get_spending_breakdown: 'chat_trace_spending',
    get_financial_snapshot: 'chat_trace_snapshot',
    create_transaction: 'chat_trace_transaction',
}

/** Tool name → human label shown on the confirmation card. */
const TOOL_LABEL_KEYS: Record<string, string> = {
    get_spending_breakdown: 'chat_tool_spending',
    get_financial_snapshot: 'chat_tool_snapshot',
    create_transaction: 'chat_tool_transaction',
}

/** Confirmation card rows, in display order. */
const CONFIRM_FIELDS: ReadonlyArray<readonly [string, string]> = [
    ['type', 'chat_confirm_type'],
    ['amount', 'chat_confirm_amount'],
    ['currency', 'chat_confirm_currency'],
    ['category', 'chat_confirm_category'],
    ['transaction_date', 'chat_confirm_date'],
    ['description', 'chat_confirm_description'],
]

export default function ChatAssistant() {
    const { user, profile } = useUser()
    const { t, tCategory } = useI18n()
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
    const [notice, setNotice] = useState<string | null>(null)
    const [trace, setTrace] = useState<string | null>(null)
    const [pending, setPending] = useState<PendingConfirmation | null>(null)
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
            .then(async ({ data }) => {
                const rows = data ?? []
                // Fast presence check against the local vault (never decrypts).
                const vaulted = await Promise.all(rows.map(r => hasProviderKey(r.id)))
                setByokKeys(rows.map((r, i) => ({ ...r, hasKey: vaulted[i] })))
            })

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
        () => byokKeys.filter(k => k.provider_id === providerId && k.hasKey),
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
    }, [messages, sending, trace, pending])

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
        const base = parts.join('\n')
        const rules = buildChatFormatRules({ plainText: true, currency: 'JOD' })
        return `${base}\n\n${rules}`
    }, [t, balancesLoading, totalBalance, monthly, currency])

    const appendDelta = useCallback((delta: string) => {
        setMessages(prev => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last && last.role === 'assistant') {
                copy[copy.length - 1] = { role: 'assistant', content: last.content + delta }
            }
            return copy
        })
    }, [])

    const dropEmptyAssistant = useCallback(() => {
        setMessages(prev => {
            const copy = [...prev]
            if (copy.length && copy[copy.length - 1].content === '') copy.pop()
            return copy
        })
    }, [])

    const showError = useCallback((code: string) => {
        if (code === 'no-key') setError(t('chat_error_no_key'))
        else if (code === 'unauthorized') setError(t('chat_error_unauthorized'))
        else if (code === 'gone') setError(t('chat_error_gone'))
        else if (code === 'ollama-cors') setError(t('chat_error_ollama_cors'))
        else if (code === 'rate_limited') setError(t('chat_error_rate_limited'))
        else if (code === 'iteration_limit') setError(t('chat_error_loop'))
        else if (code === 'invalid_args' || code === 'invalid_confirmation' || code === 'tool') {
            setError(t('chat_error_tool'))
        } else setError(t('chat_error_generic'))
    }, [t])

    /** Agent route (proxy providers): the server owns the tools + write gate. */
    const runAgentTurn = useCallback(async (
        history: ChatMsg[],
        confirmation?: PendingConfirmation
    ) => {
        if (!provider || !selectedKey) return
        setSending(true)
        setError(null)
        setNotice(null)
        setTrace(null)
        setPending(null)

        const abort = new AbortController()
        abortRef.current = abort
        let failed = false

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])
            const providerKey = await getProviderKey(selectedKey.id)
            if (!providerKey) throw new Error('no-key')

            const res = await byokAgent({
                providerId: provider.id,
                providerKey,
                model: model || provider.defaultModel,
                systemPrompt,
                messages: history,
                confirmation,
                signal: abort.signal,
            })

            if (abort.signal.aborted) return
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) throw new Error('unauthorized')
                if (res.status === 429) throw new Error('rate_limited')
                throw new Error('generic')
            }

            await readAgentStream(res, event => {
                switch (event.type) {
                    case 'delta':
                        appendDelta(event.text)
                        break
                    case 'trace':
                        setTrace(event.status === 'running' ? event.tool : null)
                        break
                    case 'tool_result':
                        setTrace(null)
                        if (!event.ok) {
                            failed = true
                            setError(t('chat_error_tool'))
                        }
                        break
                    case 'confirmation_required':
                        // Paused — nothing was written. The card asks the user.
                        setTrace(null)
                        setPending({ tool: event.tool, args: event.args })
                        break
                    case 'error':
                        failed = true
                        setTrace(null)
                        showError(event.code)
                        break
                    case 'done':
                        setTrace(null)
                        break
                }
            })

            if (failed) dropEmptyAssistant()
        } catch (err) {
            if (abort.signal.aborted) return
            showError(err instanceof Error ? err.message : 'generic')
            dropEmptyAssistant()
        } finally {
            setSending(false)
            setTrace(null)
            abortRef.current = null
        }
    }, [provider, selectedKey, model, systemPrompt, appendDelta, dropEmptyAssistant, showError, t])

    /** Ollama local — direct from the browser (no proxy, no key, no tools). */
    const runDirectTurn = useCallback(async (history: ChatMsg[]) => {
        if (!provider) return
        setSending(true)
        setError(null)
        setNotice(null)
        setTrace(null)
        setPending(null)

        const abort = new AbortController()
        abortRef.current = abort

        try {
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            const body = buildChatBody(provider, systemPrompt, history, model || provider.defaultModel, true)
            const url = provider.baseUrl.endsWith('/v1')
                ? `${provider.baseUrl}/chat/completions`
                : provider.baseUrl
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: abort.signal,
            })

            if (abort.signal.aborted) return
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) throw new Error('unauthorized')
                // Upstream model/endpoint retired (e.g. NVIDIA NIM returns 410 Gone).
                if (res.status === 410) throw new Error('gone')
                throw new Error('ollama-cors')
            }

            await readStream(res, provider.id, appendDelta)
        } catch (err) {
            if (abort.signal.aborted) return
            showError(err instanceof Error ? err.message : 'generic')
            dropEmptyAssistant()
        } finally {
            setSending(false)
            abortRef.current = null
        }
    }, [provider, systemPrompt, model, appendDelta, dropEmptyAssistant, showError])

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
        setError(null)
        setNotice(null)
        setPending(null)

        if (provider.kind === 'clientDirect') await runDirectTurn(nextMessages)
        else await runAgentTurn(nextMessages)
    }, [input, sending, provider, selectedKey, messages, t, runAgentTurn, runDirectTurn])

    /** User approved the paused write — execute it and let the model finish. */
    const confirmPending = useCallback(async () => {
        if (!pending || sending) return
        await runAgentTurn(messages, { tool: pending.tool, args: pending.args })
    }, [pending, sending, messages, runAgentTurn])

    const cancelPending = useCallback(() => {
        setPending(null)
        setNotice(t('chat_confirm_cancelled'))
    }, [t])

    const stop = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    const clear = useCallback(() => {
        setMessages([])
        setError(null)
        setNotice(null)
        setTrace(null)
        setPending(null)
    }, [])

    /** Render one confirmation-card value without trusting the model's shape. */
    const renderConfirmValue = useCallback((field: string, value: unknown): string => {
        if (value == null || value === '') return '—'
        if (field === 'type') {
            return value === 'income' ? t('trans_income') : t('trans_expense')
        }
        if (field === 'amount') {
            const n = Number(value)
            return Number.isFinite(n) ? formatAmount(n, currency) : String(value)
        }
        if (field === 'category') return tCategory(String(value))
        if (field === 'transaction_date') return String(value)
        return String(value)
    }, [t, tCategory, currency])

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
                                    {byokKeys.some(k => k.provider_id === providerId) && !providerKeys.length
                                        ? t('chat_key_not_local')
                                        : t('chat_key_none').replace('{provider}', provider.name)}{' '}
                                    <Link href="/dashboard/settings" style={{ color: 'var(--accent-blue)' }}>{t('chat_setup_keys')}</Link>
                                </span>
                            )}
                        </>
                    )}

                    {provider?.kind === 'clientDirect' && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat_ollama_no_key')}</span>
                    )}

                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('chat_model')}</label>
                    <select
                        aria-label={t('chat_model')}
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', fontSize: 14, width: 220 }}
                    >
                        {provider?.availableModels?.map(m => (
                            <option key={m} value={m}>{m}</option>
                        )) || (
                            <option value={provider?.defaultModel ?? ''}>{provider?.defaultModel ?? t('chat_auto_model')}</option>
                        )}
                    </select>
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
                {trace && (
                    <div
                        aria-live="polite"
                        style={{
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            borderRadius: 14,
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            background: 'var(--bg-elevated)',
                            border: '1px dashed var(--border)',
                        }}
                    >
                        <span aria-hidden="true">⏳</span>
                        <span>
                            {t(TRACE_KEYS[trace] ?? 'chat_trace_generic', { tool: trace })}
                        </span>
                    </div>
                )}
                {messages.length === 0 && !sending && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                        {t('chat_context_label')}: {t('chat_context_included')}
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {pending && (
                <div
                    role="group"
                    aria-label={t('chat_confirm_title')}
                    style={{
                        marginTop: 10,
                        padding: 14,
                        borderRadius: 16,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--accent-blue)',
                    }}
                >
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {t('chat_confirm_title')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t('chat_confirm_tool', {
                            tool: t(TOOL_LABEL_KEYS[pending.tool] ?? 'chat_tool_generic'),
                        })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', marginTop: 10, fontSize: 13 }}>
                        {CONFIRM_FIELDS.filter(([field]) => pending.args[field] != null && pending.args[field] !== '').map(([field, labelKey]) => (
                            <div key={field} style={{ display: 'contents' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{t(labelKey)}</span>
                                <span style={{ color: 'var(--text-primary)' }}>{renderConfirmValue(field, pending.args[field])}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                        {t('chat_confirm_hint')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                            onClick={confirmPending}
                            disabled={sending}
                            aria-label={t('chat_confirm_yes')}
                            style={{ background: 'var(--accent-blue)', color: 'var(--text-primary)', border: 'none', borderRadius: 12, padding: '8px 18px', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}
                        >
                            {t('chat_confirm_yes')}
                        </button>
                        <button
                            onClick={cancelPending}
                            disabled={sending}
                            aria-label={t('chat_confirm_no')}
                            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 16px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 13 }}
                        >
                            {t('chat_confirm_no')}
                        </button>
                    </div>
                </div>
            )}

            {notice && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 12, marginTop: 8 }}>
                    {notice}
                </div>
            )}

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