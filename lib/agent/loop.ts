/**
 * Agent loop (Phase 2) — model → tool → result → model, bounded.
 *
 * Pure orchestration: it never touches Supabase, the network, or the BYOK
 * envelope. Everything is injected so the policy can be unit-tested:
 *
 *   - read tools run immediately through `executeTool`
 *   - write / confirmation-gated tools NEVER run on the model's say-so; the
 *     loop pauses with a `confirmation_required` result
 *   - an explicit `confirmation` runs the tool with `confirmed: true`, then the
 *     model finishes the turn
 *   - the loop is bounded (`maxIterations`, default 3)
 *
 * Tool arguments are model output: they are parsed and validated against the
 * tool's Zod schema before anything executes. Unknown tools and invalid
 * arguments are fed back to the model as tool results, not thrown, so it can
 * recover inside the same turn.
 */

import type { AgentTool } from '@/lib/agent/tools'
import type { AgentMessage, AgentToolCall, ModelTurn } from '@/lib/agent/providers'

export type AgentLoopErrorCode =
  | 'iteration_limit'
  | 'invalid_args'
  | 'invalid_confirmation'
  | 'unknown_tool'

export class AgentLoopError extends Error {
  readonly code: AgentLoopErrorCode

  constructor(code: AgentLoopErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AgentLoopError'
    this.code = code
  }
}

export interface AgentLoopResultCompleted {
  type: 'completed'
  text: string
  messages: AgentMessage[]
}

export interface AgentLoopResultConfirmation {
  type: 'confirmation_required'
  tool: string
  args: Record<string, unknown>
  toolCall: AgentToolCall
  text: string
  messages: AgentMessage[]
}

export type AgentLoopResult = AgentLoopResultCompleted | AgentLoopResultConfirmation

export interface AgentLoopEvents {
  /** Forwarded model text fragments (the route turns these into SSE deltas). */
  onText?: (text: string) => void
  /** Emitted around each executed tool. */
  onTrace?: (tool: string, status: 'running' | 'done') => void
}

export interface AgentLoopOptions {
  /** Conversation so far (user + assistant text only). */
  messages: AgentMessage[]
  /** One model turn. `onText` receives text fragments as they stream. */
  callModel(messages: AgentMessage[], onText: (text: string) => void): Promise<ModelTurn>
  /** Execute a validated tool call. `confirmed` is true only for user-approved writes. */
  executeTool(
    name: string,
    args: Record<string, unknown>,
    toolCall: AgentToolCall,
    confirmed: boolean
  ): Promise<unknown>
  getTool(name: string): AgentTool | undefined
  events?: AgentLoopEvents
  /** User approval captured by the client after a `confirmation_required` pause. */
  confirmation?: { tool: string; args: Record<string, unknown> }
  maxIterations?: number
}

const DEFAULT_MAX_ITERATIONS = 3

function toolResult(call: AgentToolCall, content: string): AgentMessage {
  return { role: 'tool', toolCallId: call.id, name: call.name, content }
}

function serialize(result: unknown): string {
  try {
    return JSON.stringify(result ?? null)
  } catch {
    return 'null'
  }
}

function parseArguments(call: AgentToolCall): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(call.arguments) }
  } catch {
    return { ok: false }
  }
}

/**
 * Attach a synthetic tool call to the conversation so the follow-up history is
 * valid for providers that require every `tool` message to answer an
 * assistant `tool_call`.
 */
function appendConfirmedCall(
  history: AgentMessage[],
  call: AgentToolCall
): AgentMessage[] {
  const last = history[history.length - 1]
  if (last?.role === 'assistant') {
    const merged: AgentMessage = { ...last, toolCalls: [...(last.toolCalls ?? []), call] }
    return [...history.slice(0, -1), merged]
  }
  return [...history, { role: 'assistant', content: '', toolCalls: [call] }]
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const {
    callModel,
    executeTool,
    getTool,
    events,
    confirmation,
    maxIterations = DEFAULT_MAX_ITERATIONS,
  } = options

  const emitText = (text: string) => events?.onText?.(text)
  let history = [...options.messages]

  const runTool = async (call: AgentToolCall, args: Record<string, unknown>, confirmed: boolean) => {
    events?.onTrace?.(call.name, 'running')
    try {
      return await executeTool(call.name, args, call, confirmed)
    } finally {
      events?.onTrace?.(call.name, 'done')
    }
  }

  // ---- Explicit confirmation: run the approved write, then let the model talk.
  if (confirmation) {
    const tool = getTool(confirmation.tool)
    if (!tool || !tool.requiresConfirmation || tool.kind !== 'write') {
      throw new AgentLoopError(
        'invalid_confirmation',
        `Tool ${confirmation.tool} does not accept confirmation`
      )
    }

    const parsed = tool.schema.safeParse(confirmation.args)
    if (!parsed.success) {
      throw new AgentLoopError('invalid_args', `Invalid arguments for ${tool.name}`)
    }

    const args = parsed.data as Record<string, unknown>
    const call: AgentToolCall = {
      id: `confirmed_${tool.name}_${Date.now()}`,
      name: tool.name,
      arguments: JSON.stringify(args),
    }

    history = appendConfirmedCall(history, call)
    let content: string
    try {
      content = serialize(await runTool(call, args, true))
    } catch (err) {
      content = serialize({ error: (err as Error).message })
    }
    history.push(toolResult(call, content))
  }

  // ---- Bounded model/tool loop.
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const turn = await callModel(history, emitText)

    if (turn.toolCalls.length === 0) {
      return { type: 'completed', text: turn.text, messages: history }
    }

    history.push({
      role: 'assistant',
      content: turn.text,
      toolCalls: turn.toolCalls,
    })

    for (const call of turn.toolCalls) {
      const tool = getTool(call.name)
      if (!tool) {
        history.push(toolResult(call, serialize({ error: `Unknown tool: ${call.name}` })))
        continue
      }

      const parsedArgs = parseArguments(call)
      if (!parsedArgs.ok) {
        history.push(
          toolResult(call, serialize({ error: `Invalid arguments for ${call.name}: not JSON` }))
        )
        continue
      }

      const parsed = tool.schema.safeParse(parsedArgs.value)
      if (!parsed.success) {
        history.push(
          toolResult(
            call,
            serialize({
              error: `Invalid arguments for ${call.name}: ${parsed.error.issues
                .map((issue) => issue.message)
                .join('; ')}`,
            })
          )
        )
        continue
      }

      const args = parsed.data as Record<string, unknown>

      // Write tools pause for explicit user approval — never auto-execute.
      if (tool.kind === 'write' || tool.requiresConfirmation) {
        return {
          type: 'confirmation_required',
          tool: call.name,
          args,
          toolCall: call,
          text: turn.text,
          messages: history,
        }
      }

      let content: string
      try {
        content = serialize(await runTool(call, args, false))
      } catch (err) {
        content = serialize({ error: (err as Error).message })
      }
      history.push(toolResult(call, content))
    }
  }

  throw new AgentLoopError(
    'iteration_limit',
    `Agent loop exceeded ${maxIterations} model turns`
  )
}
