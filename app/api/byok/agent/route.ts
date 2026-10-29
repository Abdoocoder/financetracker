/**
 * `/api/byok/agent` — server-side agent loop (Phase 2).
 *
 * Auth, envelope decryption and rate limiting mirror `/api/byok/proxy`. The
 * difference is what happens next: instead of relaying provider-native bytes,
 * this route owns the loop (see `lib/agent/loop.ts`):
 *
 *   model → tool_call → read tool (RLS session client) → result → model …
 *
 * Policy:
 *   - READ tools execute immediately, as the user (`auth.uid() = user_id`).
 *   - WRITE tools never execute on the model's say-so. The loop returns
 *     `confirmation_required`; the client shows the exact args and, only after
 *     the user approves, sends them back as `confirmation`.
 *   - The loop is bounded to 3 model turns.
 *   - Client-direct providers (Ollama) keep the existing direct path — this
 *     route only handles allowlisted `kind === 'proxy'` providers.
 *   - The provider key is decrypted in memory and destroyed in `finally`;
 *     logs never contain the key or the auth header.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/byok/providers'
import { unwrapProviderKeyWithRotation, zeroBytes, isKekConfigured } from '@/lib/byok/envelope'
import { AGENT_TOOLS, getAgentTool } from '@/lib/agent/tools'
import { runAgentLoop } from '@/lib/agent/loop'
import {
  agentEndpoint,
  buildAgentBody,
  readModelTurn,
  type AgentMessage,
} from '@/lib/agent/providers'
import {
  encodeAgentEvent,
  type AgentErrorCode,
  type AgentEvent,
  AGENT_ERROR_CODES,
} from '@/lib/agent/events'
import { BYOK_PROXY_LIMIT_PER_MIN, type ByokProxyError } from '@/lib/byok/types'
import { writeAuditLog } from '@/lib/unified-tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_MESSAGES = 100
const MAX_MESSAGE_CHARS = 8_000
const MAX_SYSTEM_PROMPT_CHARS = 8_000

/** Agent request body — plaintext conversation, plus the encrypted key envelope. */
interface AgentRequestBody {
  providerId: string
  keyId: string
  env: string
  payload: string
  model: string
  systemPrompt?: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  confirmation?: { tool: string; args: Record<string, unknown> }
}

class UpstreamError extends Error {
  readonly code: AgentErrorCode

  constructor(code: AgentErrorCode) {
    super(code)
    this.name = 'UpstreamError'
    this.code = code
  }
}

function json(body: ByokProxyError | Record<string, unknown>, status: number, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(extra ?? {}) },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Validate the client-authored messages. Only user/assistant text is accepted:
 * the client must not smuggle a `system` or `tool` role past the server prompt.
 */
function parseMessages(raw: unknown): AgentMessage[] | null {
  if (raw == null) return []
  if (!Array.isArray(raw) || raw.length > MAX_MESSAGES) return null
  const messages: AgentMessage[] = []
  for (const item of raw) {
    if (!isRecord(item)) return null
    const role = item.role
    const content = item.content
    if (role !== 'user' && role !== 'assistant') return null
    if (typeof content !== 'string' || content.length > MAX_MESSAGE_CHARS) return null
    messages.push({ role, content })
  }
  return messages
}

function isAgentErrorCode(value: unknown): value is AgentErrorCode {
  return typeof value === 'string' && (AGENT_ERROR_CODES as readonly string[]).includes(value)
}

/** Stream events as SSE; always terminates with `done`. */
function eventStream(run: (emit: (event: AgentEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeAgentEvent(event)))
        } catch {
          // Client went away mid-stream — nothing left to do.
        }
      }
      try {
        await run(emit)
      } catch (err) {
        const code = isAgentErrorCode((err as { code?: unknown }).code)
          ? ((err as { code: AgentErrorCode }).code)
          : 'internal'
        emit({ type: 'error', code })
      } finally {
        emit({ type: 'done' })
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}

export async function POST(request: NextRequest) {
  // ---- 1. Session auth (cookies for web, Bearer JWT for Flutter) -----------
  let bearerToken: string | undefined
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice('bearer '.length).trim() || undefined
  }
  const supabase = await createClient(bearerToken)
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken)
  if (!user) {
    return json({ error: 'Unauthorized: a valid session is required' }, 401)
  }

  // ---- 2. Parse + validate the request -------------------------------------
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!isRecord(raw)) return json({ error: 'Invalid JSON body' }, 400)
  const reqBody = raw as unknown as AgentRequestBody

  const provider = getProvider(reqBody.providerId)
  if (!provider) {
    return json({ error: `Unsupported provider: ${reqBody.providerId}` }, 404)
  }
  if (provider.kind !== 'proxy') {
    return json({ error: 'clientDirect providers do not use the agent route' }, 400)
  }
  if (!reqBody.env || !reqBody.payload || !reqBody.keyId) {
    return json({ error: 'Missing envelope fields (keyId/env/payload)' }, 400)
  }

  const messages = parseMessages(reqBody.messages)
  if (!messages) {
    return json({ error: 'Invalid messages: only user/assistant text is accepted' }, 400)
  }

  let systemPrompt = ''
  if (reqBody.systemPrompt != null) {
    if (typeof reqBody.systemPrompt !== 'string' || reqBody.systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      return json({ error: 'Invalid systemPrompt' }, 400)
    }
    systemPrompt = reqBody.systemPrompt
  }

  let confirmation: { tool: string; args: Record<string, unknown> } | undefined
  if (reqBody.confirmation != null) {
    const candidate = reqBody.confirmation
    if (
      !isRecord(candidate) ||
      typeof candidate.tool !== 'string' ||
      !isRecord(candidate.args)
    ) {
      return json({ error: 'Invalid confirmation' }, 400)
    }
    confirmation = { tool: candidate.tool, args: candidate.args }
  }

  const model = typeof reqBody.model === 'string' && reqBody.model ? reqBody.model : provider.defaultModel

  if (!isKekConfigured()) {
    console.error(
      '[byok/agent] KEK not configured: BYOK_PRIVATE_KEY=' +
        (process.env.BYOK_PRIVATE_KEY ? 'set' : 'MISSING') +
        ', BYOK_KEK_ID=' +
        (process.env.BYOK_KEK_ID ? 'set' : 'MISSING')
    )
    return json(
      {
        error:
          'Proxy KEK is not configured on the server. Check BYOK_PRIVATE_KEY / BYOK_KEK_ID in the deployment environment.',
      },
      500
    )
  }

  // ---- 3. Per-user rate counter (shared with the proxy) --------------------
  const { data: count, error: rpcError } = await supabase.rpc('bump_proxy_usage')
  if (rpcError) {
    console.error('[byok/agent] bump_proxy_usage rpc error', rpcError.message)
    return json({ error: 'Rate limit service unavailable' }, 500)
  }
  if ((count as number) > BYOK_PROXY_LIMIT_PER_MIN) {
    return json(
      { error: `Rate limit exceeded: ${BYOK_PROXY_LIMIT_PER_MIN}/min`, origin: 'proxy' },
      429,
      { 'x-byok-origin': 'proxy' }
    )
  }

  // ---- 4. Decrypt the provider key (in memory only) ------------------------
  let key: string
  try {
    key = await unwrapProviderKeyWithRotation(reqBody.keyId, reqBody.env, reqBody.payload)
  } catch (err) {
    return json({ error: `Failed to unwrap key: ${(err as Error).message}` }, 400)
  }

  try {
    // ---- 5. Upstream headers (fixed allowlist host, key injected) ---------
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.set('accept', 'text/event-stream')
    for (const [name, value] of Object.entries(provider.defaultHeaders ?? {})) {
      headers.set(name, value)
    }
    if (provider.auth.kind === 'bearer') headers.set('authorization', `Bearer ${key}`)
    else if (provider.auth.kind === 'x-api-key') headers.set('x-api-key', key)
    else if (provider.auth.kind === 'x-goog-api-key') headers.set('x-goog-api-key', key)

    const endpoint = agentEndpoint(provider.id, provider.baseUrl, model)

    const callModel = async (history: AgentMessage[], onText: (text: string) => void) => {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          buildAgentBody(provider.id, {
            model,
            systemPrompt,
            messages: history,
            tools: AGENT_TOOLS,
            stream: true,
          })
        ),
        redirect: 'error',
        signal: AbortSignal.timeout(110_000),
      })

      if (!upstream.ok) {
        if (upstream.body) {
          await upstream.body.cancel().catch(() => {})
        }
        if (upstream.status === 401 || upstream.status === 403) {
          throw new UpstreamError('unauthorized')
        }
        // Keep the three actionable distinctions the chat UI can act on
        // instead of collapsing every failure into a generic "upstream".
        if (upstream.status === 404) throw new UpstreamError('model-not-found')
        if (upstream.status === 410) throw new UpstreamError('gone')
        if (upstream.status >= 500) throw new UpstreamError('provider-down')
        if (upstream.status === 429) throw new UpstreamError('rate_limited')
        throw new UpstreamError('upstream')
      }

      let streamed = false
      const turn = await readModelTurn(provider.id, upstream, (text) => {
        streamed = true
        onText(text)
      })
      // Non-streaming upstream (JSON) — forward the answer as one delta.
      if (!streamed && turn.text) onText(turn.text)
      return turn
    }

    return eventStream(async (emit) => {
      const executeTool = async (
        name: string,
        args: Record<string, unknown>,
        _call: { id: string; name: string; arguments: string },
        confirmed: boolean
      ) => {
        const tool = getAgentTool(name)
        if (!tool) throw new Error(`Unknown tool: ${name}`)

        // A user-approved write was already shown on the confirmation card —
        // don't re-trace it. Read tools trace while they run.
        if (!confirmed) emit({ type: 'trace', tool: name, status: 'running' })

        try {
          const result = await tool.execute(args, {
            userId: user.id,
            client: supabase,
            confirmed,
            apiKeyId: null,
          })
          if (!confirmed) emit({ type: 'tool_result', tool: name, ok: true })
          void writeAuditLog(
            {
              apiKeyId: null,
              userId: user.id,
              action: name,
              payload: { args, confirmed },
            },
            { client: supabase }
          )
          return result
        } catch (err) {
          if (!confirmed) emit({ type: 'tool_result', tool: name, ok: false })
          void writeAuditLog(
            {
              apiKeyId: null,
              userId: user.id,
              action: name,
              payload: { args, confirmed, error: (err as Error).message },
            },
            { client: supabase }
          )
          throw err
        }
      }

      const result = await runAgentLoop({
        messages,
        confirmation,
        callModel,
        executeTool,
        getTool: getAgentTool,
        events: {
          onText: (text) => emit({ type: 'delta', text }),
        },
      })

      if (result.type === 'confirmation_required') {
        emit({
          type: 'confirmation_required',
          tool: result.tool,
          args: result.args,
        })
      }
      // `completed` text was already streamed through onText deltas.
    })
  } finally {
    // ---- 6. Destroy the key material in memory ----------------------------
    zeroBytes(Buffer.from(reqBody.payload, 'base64'))
  }
}