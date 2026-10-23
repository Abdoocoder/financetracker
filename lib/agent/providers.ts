/**
 * Agent provider adapters (Phase 2 — Parsing).
 *
 * The agent route cannot use the thin `/api/byok/proxy` pass-through: it owns
 * the loop, so it must (a) advertise the tool registry in each provider's
 * dialect and (b) understand each provider's tool-call stream. Everything here
 * is provider-shaped, but the loop only ever sees:
 *
 *   ModelTurn = { text, toolCalls: [{ id, name, arguments }] }
 *
 * `arguments` is always the raw JSON string the model produced — parsing and
 * validation happen in `lib/agent/loop.ts` (untrusted output).
 */

import type { AgentTool } from '@/lib/agent/tools'

export interface AgentToolCall {
  id: string
  name: string
  /** Raw JSON string (may be invalid — the loop validates it). */
  arguments: string
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  /** Assistant only: tool calls the model asked for. */
  toolCalls?: AgentToolCall[]
  /** Tool only: the call this result answers. */
  toolCallId?: string
  /** Tool only: the tool name (Gemini's functionResponse needs it). */
  name?: string
}

export interface ModelTurn {
  text: string
  toolCalls: AgentToolCall[]
}

export interface AgentBodyInput {
  model: string
  systemPrompt: string
  messages: AgentMessage[]
  tools: readonly AgentTool[]
  stream: boolean
}

const TEMPERATURE = 0.2
const ANTHROPIC_MAX_TOKENS = 4096

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// ============================================================
// Request bodies
// ============================================================

function openAiBody(input: AgentBodyInput): Record<string, unknown> {
  return {
    model: input.model,
    temperature: TEMPERATURE,
    stream: input.stream,
    tool_choice: 'auto',
    tools: input.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
    messages: [
      { role: 'system', content: input.systemPrompt },
      ...input.messages.map((m) => {
        if (m.role === 'tool') {
          return { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
        }
        if (m.role === 'assistant') {
          return {
            role: 'assistant',
            content: m.content,
            ...(m.toolCalls?.length
              ? {
                  tool_calls: m.toolCalls.map((call) => ({
                    id: call.id,
                    type: 'function',
                    function: { name: call.name, arguments: call.arguments },
                  })),
                }
              : {}),
          }
        }
        return { role: 'user', content: m.content }
      }),
    ],
  }
}

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }
type AnthropicMessage = { role: 'user' | 'assistant'; content: string | AnthropicBlock[] }

function anthropicBody(input: AgentBodyInput): Record<string, unknown> {
  const messages: AnthropicMessage[] = []

  for (const m of input.messages) {
    if (m.role === 'tool') {
      const block: AnthropicBlock = {
        type: 'tool_result',
        tool_use_id: m.toolCallId ?? '',
        content: m.content,
      }
      const last = messages[messages.length - 1]
      if (last?.role === 'user' && Array.isArray(last.content)) last.content.push(block)
      else messages.push({ role: 'user', content: [block] })
      continue
    }

    if (m.role === 'assistant') {
      const content: AnthropicBlock[] = []
      if (m.content) content.push({ type: 'text', text: m.content })
      for (const call of m.toolCalls ?? []) {
        content.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: parseJson(call.arguments),
        })
      }
      messages.push({ role: 'assistant', content: content.length ? content : [{ type: 'text', text: '' }] })
      continue
    }

    messages.push({ role: 'user', content: m.content })
  }

  return {
    model: input.model,
    system: input.systemPrompt,
    max_tokens: ANTHROPIC_MAX_TOKENS,
    temperature: TEMPERATURE,
    stream: input.stream,
    tools: input.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    })),
    messages,
  }
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: unknown } }
  | { functionResponse: { name: string; response: { result: string } } }
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

function geminiBody(input: AgentBodyInput): Record<string, unknown> {
  const contents: GeminiContent[] = []

  for (const m of input.messages) {
    if (m.role === 'tool') {
      const part: GeminiPart = {
        functionResponse: { name: m.name ?? '', response: { result: m.content } },
      }
      const last = contents[contents.length - 1]
      if (last?.role === 'user' && last.parts.some((p) => 'functionResponse' in p)) last.parts.push(part)
      else contents.push({ role: 'user', parts: [part] })
      continue
    }

    if (m.role === 'assistant') {
      const parts: GeminiPart[] = []
      if (m.content) parts.push({ text: m.content })
      for (const call of m.toolCalls ?? []) {
        parts.push({ functionCall: { name: call.name, args: parseJson(call.arguments) } })
      }
      contents.push({ role: 'model', parts: parts.length ? parts : [{ text: '' }] })
      continue
    }

    contents.push({ role: 'user', parts: [{ text: m.content }] })
  }

  return {
    system_instruction: { parts: [{ text: input.systemPrompt }] },
    generationConfig: { temperature: TEMPERATURE },
    tools: [
      {
        functionDeclarations: input.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    ],
    contents,
  }
}

/** Build the provider-native request body for one model turn. */
export function buildAgentBody(providerId: string, input: AgentBodyInput): Record<string, unknown> {
  if (providerId === 'anthropic') return anthropicBody(input)
  if (providerId === 'gemini') return geminiBody(input)
  return openAiBody(input)
}

/**
 * Resolve the upstream URL for a model turn. The host always comes from the
 * fixed allowlist (`provider.baseUrl`); only Gemini needs path surgery because
 * its model is part of the URL rather than the body.
 */
export function agentEndpoint(providerId: string, baseUrl: string, model: string): string {
  if (providerId !== 'gemini') return baseUrl
  const url = new URL(baseUrl)
  url.pathname = url.pathname.replace(
    /\/models\/[^/]+:(?:generateContent|streamGenerateContent)$/,
    `/models/${model}:streamGenerateContent`
  )
  url.search = '?alt=sse'
  return url.toString()
}

// ============================================================
// Response parsing
// ============================================================

type Json = Record<string, unknown>

function asRecord(value: unknown): Json | undefined {
  return value && typeof value === 'object' ? (value as Json) : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readOpenAiJson(payload: Json): ModelTurn {
  const message = asRecord(asArray(payload.choices).map(asRecord)[0]?.message) ?? {}
  const text = typeof message.content === 'string' ? message.content : ''
  const toolCalls = asArray(message.tool_calls)
    .map(asRecord)
    .filter((call): call is Json => !!call)
    .map((call, index) => {
      const fn = asRecord(call.function) ?? {}
      return {
        id: typeof call.id === 'string' ? call.id : `call_${index}`,
        name: typeof fn.name === 'string' ? fn.name : '',
        arguments: typeof fn.arguments === 'string' ? fn.arguments : '{}',
      }
    })
  return { text, toolCalls }
}

function readAnthropicJson(payload: Json): ModelTurn {
  const blocks = asArray(payload.content).map(asRecord).filter((b): b is Json => !!b)
  let text = ''
  const toolCalls: AgentToolCall[] = []
  for (const block of blocks) {
    if (block.type === 'text' && typeof block.text === 'string') text += block.text
    if (block.type === 'tool_use') {
      toolCalls.push({
        id: typeof block.id === 'string' ? block.id : `toolu_${toolCalls.length}`,
        name: typeof block.name === 'string' ? block.name : '',
        arguments: JSON.stringify(block.input ?? {}),
      })
    }
  }
  return { text, toolCalls }
}

function readGeminiJson(payload: Json): ModelTurn {
  const candidate = asRecord(asArray(payload.candidates).map(asRecord)[0]) ?? {}
  const parts = asArray(asRecord(candidate.content)?.parts).map(asRecord).filter((p): p is Json => !!p)
  let text = ''
  const toolCalls: AgentToolCall[] = []
  for (const part of parts) {
    if (typeof part.text === 'string') text += part.text
    const fn = asRecord(part.functionCall)
    if (fn) {
      toolCalls.push({
        id: `gemini_call_${toolCalls.length}`,
        name: typeof fn.name === 'string' ? fn.name : '',
        arguments: JSON.stringify(fn.args ?? {}),
      })
    }
  }
  return { text, toolCalls }
}

function readJsonTurn(providerId: string, payload: Json): ModelTurn {
  if (providerId === 'anthropic') return readAnthropicJson(payload)
  if (providerId === 'gemini') return readGeminiJson(payload)
  return readOpenAiJson(payload)
}

interface StreamAccumulator {
  text: string
  emit(text: string): void
  push(payload: Json): void
  finish(): AgentToolCall[]
}

function openAiAccumulator(emit: (text: string) => void): StreamAccumulator {
  const calls = new Map<number, { id?: string; name?: string; arguments: string }>()
  return {
    text: '',
    emit,
    push(payload) {
      const delta = asRecord(asRecord(asArray(payload.choices)[0])?.delta)
      if (!delta) return
      if (typeof delta.content === 'string' && delta.content) {
        this.text += delta.content
        emit(delta.content)
      }
      for (const rawCall of asArray(delta.tool_calls)) {
        const call = asRecord(rawCall)
        if (!call) continue
        const index = typeof call.index === 'number' ? call.index : 0
        const current = calls.get(index) ?? { arguments: '' }
        if (typeof call.id === 'string' && call.id) current.id = call.id
        const fn = asRecord(call.function)
        if (fn) {
          if (typeof fn.name === 'string' && fn.name) current.name = fn.name
          if (typeof fn.arguments === 'string') current.arguments += fn.arguments
        }
        calls.set(index, current)
      }
    },
    finish() {
      return [...calls.entries()]
        .sort(([a], [b]) => a - b)
        .filter(([, call]) => !!call.name)
        .map(([index, call]) => ({
          id: call.id ?? `call_${index}`,
          name: call.name ?? '',
          arguments: call.arguments || '{}',
        }))
    },
  }
}

function anthropicAccumulator(emit: (text: string) => void): StreamAccumulator {
  const blocks = new Map<number, { id: string; name: string; json: string }>()
  return {
    text: '',
    emit,
    push(payload) {
      const index = typeof payload.index === 'number' ? payload.index : 0
      if (payload.type === 'content_block_start') {
        const block = asRecord(payload.content_block)
        if (block?.type === 'tool_use') {
          blocks.set(index, {
            id: typeof block.id === 'string' ? block.id : `toolu_${index}`,
            name: typeof block.name === 'string' ? block.name : '',
            json: '',
          })
        }
        return
      }
      if (payload.type !== 'content_block_delta') return
      const delta = asRecord(payload.delta)
      if (!delta) return
      if (delta.type === 'text_delta' && typeof delta.text === 'string' && delta.text) {
        this.text += delta.text
        emit(delta.text)
      }
      if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
        const block = blocks.get(index)
        if (block) block.json += delta.partial_json
      }
    },
    finish() {
      return [...blocks.entries()]
        .sort(([a], [b]) => a - b)
        .filter(([, block]) => !!block.name)
        .map(([, block]) => ({
          id: block.id,
          name: block.name,
          arguments: block.json || '{}',
        }))
    },
  }
}

function geminiAccumulator(emit: (text: string) => void): StreamAccumulator {
  const toolCalls: AgentToolCall[] = []
  return {
    text: '',
    emit,
    push(payload) {
      const candidate = asRecord(asArray(payload.candidates)[0])
      const parts = asArray(asRecord(candidate?.content)?.parts)
      for (const rawPart of parts) {
        const part = asRecord(rawPart)
        if (!part) continue
        if (typeof part.text === 'string' && part.text) {
          this.text += part.text
          emit(part.text)
        }
        const fn = asRecord(part.functionCall)
        if (fn) {
          toolCalls.push({
            id: `gemini_call_${toolCalls.length}`,
            name: typeof fn.name === 'string' ? fn.name : '',
            arguments: JSON.stringify(fn.args ?? {}),
          })
        }
      }
    },
    finish() {
      return toolCalls.filter((call) => !!call.name)
    },
  }
}

function accumulatorFor(providerId: string, emit: (text: string) => void): StreamAccumulator {
  if (providerId === 'anthropic') return anthropicAccumulator(emit)
  if (providerId === 'gemini') return geminiAccumulator(emit)
  return openAiAccumulator(emit)
}

async function readSseTurn(
  providerId: string,
  res: Response,
  onText: (text: string) => void
): Promise<ModelTurn> {
  if (!res.body) return { text: '', toolCalls: [] }

  const accumulator = accumulatorFor(providerId, onText)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const payload = asRecord(JSON.parse(data))
        if (payload) accumulator.push(payload)
      } catch {
        // malformed frame — skip rather than kill the turn
      }
    }
  }

  return { text: accumulator.text, toolCalls: accumulator.finish() }
}

/**
 * Read one model turn from either an SSE stream or a plain JSON response and
 * normalize both into `{ text, toolCalls }`. `onText` fires per text fragment
 * so the route can forward deltas while the model is still talking.
 */
export async function readModelTurn(
  providerId: string,
  res: Response,
  onText: (text: string) => void = () => {}
): Promise<ModelTurn> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = asRecord(await res.json())
    return payload ? readJsonTurn(providerId, payload) : { text: '', toolCalls: [] }
  }
  return readSseTurn(providerId, res, onText)
}
