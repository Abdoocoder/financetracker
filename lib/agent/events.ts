/**
 * Normalized agent SSE events (Phase 2) — SHARED by route, web client and tests.
 *
 * The agent route owns the loop, so unlike `/api/byok/proxy` (verbatim relay)
 * it speaks a small stable protocol the clients can render:
 *
 *   delta                incremental assistant text
 *   trace                a tool is running / finished (drives "checking…")
 *   tool_result          a tool returned (ok / failed)
 *   confirmation_required  a write tool is paused for explicit user approval
 *   error                a stable code (see AgentErrorCode)
 *   done                 terminal event — always last
 */

export type AgentErrorCode =
  | 'invalid_confirmation'
  | 'invalid_args'
  | 'iteration_limit'
  | 'unauthorized'
  // The upstream endpoint/model slug does not exist (relayed 404) — usually a
  // stale catalogue entry, or a key without access to that model.
  | 'model-not-found'
  // The provider retired the model/endpoint (relayed 410, e.g. NVIDIA NIM).
  | 'gone'
  // The provider itself is failing (relayed 5xx).
  | 'provider-down'
  | 'rate_limited'
  | 'upstream'
  | 'internal'

export type AgentEvent =
  | { type: 'delta'; text: string }
  | { type: 'trace'; tool: string; status: 'running' | 'done' }
  | { type: 'tool_result'; tool: string; ok: boolean }
  | { type: 'confirmation_required'; tool: string; args: Record<string, unknown> }
  | { type: 'error'; code: AgentErrorCode; message?: string }
  | { type: 'done' }

/** Serialize one event as an SSE frame. */
export function encodeAgentEvent(event: AgentEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/** Parse one SSE `data:` payload. Returns null for malformed / unknown frames. */
export function parseAgentEvent(data: string): AgentEvent | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const type = (parsed as { type?: unknown }).type
  if (typeof type !== 'string') return null
  return parsed as AgentEvent
}

/** Error codes that can safely be shown to the user. */
export const AGENT_ERROR_CODES: readonly AgentErrorCode[] = [
  'invalid_confirmation',
  'invalid_args',
  'iteration_limit',
  'unauthorized',
  'model-not-found',
  'gone',
  'provider-down',
  'rate_limited',
  'upstream',
  'internal',
]
