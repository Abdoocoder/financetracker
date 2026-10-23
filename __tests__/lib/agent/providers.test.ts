/**
 * @jest-environment node
 *
 * Provider adapters for the agent loop (Phase 2 — Parsing).
 *
 * Each provider speaks a different request shape and a different SSE tool-call
 * dialect. These tests pin the normalized contract:
 *   - request bodies advertise the same tool registry in each dialect
 *   - assistant tool calls + tool results round-trip in each dialect
 *   - streamed tool calls are accumulated into one `{id,name,arguments}` object
 *   - text never includes tool-call frames
 */
import {
  agentEndpoint,
  buildAgentBody,
  readModelTurn,
  type AgentMessage,
} from '@/lib/agent/providers'
import { AGENT_TOOLS } from '@/lib/agent/tools'

const TOOLS = AGENT_TOOLS

function sseResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

const HISTORY: AgentMessage[] = [
  { role: 'user', content: 'How much did I spend?' },
  {
    role: 'assistant',
    content: 'Let me check.',
    toolCalls: [
      { id: 'call_1', name: 'get_spending_breakdown', arguments: '{"month":10}' },
    ],
  },
  {
    role: 'tool',
    toolCallId: 'call_1',
    name: 'get_spending_breakdown',
    content: '{"total":10}',
  },
]

describe('buildAgentBody — OpenAI-compatible', () => {
  it('maps the tool registry to function tools and round-trips tool messages', () => {
    const body = buildAgentBody('openai', {
      model: 'gpt-x',
      systemPrompt: 'Sys',
      messages: HISTORY,
      tools: TOOLS,
      stream: true,
    }) as any

    expect(body.model).toBe('gpt-x')
    expect(body.stream).toBe(true)
    expect(body.tool_choice).toBe('auto')
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Sys' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'How much did I spend?' })
    expect(body.messages[2]).toEqual({
      role: 'assistant',
      content: 'Let me check.',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'get_spending_breakdown', arguments: '{"month":10}' },
        },
      ],
    })
    expect(body.messages[3]).toEqual({
      role: 'tool',
      tool_call_id: 'call_1',
      content: '{"total":10}',
    })
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: {
        name: 'get_spending_breakdown',
        description: expect.any(String),
        parameters: expect.objectContaining({ type: 'object' }),
      },
    })
  })
})

describe('buildAgentBody — Anthropic', () => {
  it('maps tool schemas to input_schema and tool results to tool_result blocks', () => {
    const body = buildAgentBody('anthropic', {
      model: 'claude-x',
      systemPrompt: 'Sys',
      messages: HISTORY,
      tools: TOOLS,
      stream: true,
    }) as any

    expect(body.system).toBe('Sys')
    expect(body.messages[0]).toEqual({ role: 'user', content: 'How much did I spend?' })
    expect(body.messages[1]).toEqual({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me check.' },
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'get_spending_breakdown',
          input: { month: 10 },
        },
      ],
    })
    expect(body.messages[2]).toEqual({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'call_1',
          content: '{"total":10}',
        },
      ],
    })
    expect(body.tools[0]).toEqual({
      name: 'get_spending_breakdown',
      description: expect.any(String),
      input_schema: expect.objectContaining({ type: 'object' }),
    })
  })
})

describe('buildAgentBody — Gemini', () => {
  it('maps tools to functionDeclarations and tool results to functionResponse parts', () => {
    const body = buildAgentBody('gemini', {
      model: 'gemini-x',
      systemPrompt: 'Sys',
      messages: HISTORY,
      tools: TOOLS,
      stream: true,
    }) as any

    expect(body.system_instruction).toEqual({ parts: [{ text: 'Sys' }] })
    expect(body.contents[0]).toEqual({
      role: 'user',
      parts: [{ text: 'How much did I spend?' }],
    })
    expect(body.contents[1]).toEqual({
      role: 'model',
      parts: [
        { text: 'Let me check.' },
        {
          functionCall: {
            name: 'get_spending_breakdown',
            args: { month: 10 },
          },
        },
      ],
    })
    expect(body.contents[2]).toEqual({
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: 'get_spending_breakdown',
            response: { result: '{"total":10}' },
          },
        },
      ],
    })
    expect(body.tools[0].functionDeclarations[0]).toEqual({
      name: 'get_spending_breakdown',
      description: expect.any(String),
      parameters: expect.objectContaining({ type: 'object' }),
    })
  })
})

describe('agentEndpoint', () => {
  it('keeps the fixed allowlist host and switches Gemini to the streaming SSE endpoint', () => {
    expect(agentEndpoint('openai', 'https://api.openai.com/v1/chat/completions', 'gpt-x')).toBe(
      'https://api.openai.com/v1/chat/completions'
    )
    expect(
      agentEndpoint(
        'gemini',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
        'gemini-2.5-flash'
      )
    ).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse'
    )
  })
})

describe('readModelTurn — OpenAI stream', () => {
  it('accumulates fragmented tool_calls and streams text', async () => {
    const res = sseResponse([
      'data: {"choices":[{"delta":{"content":"Checking "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"now"}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"get_spending_breakdown","arguments":"{\\"month\\""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":10}"}}]},"finish_reason":"tool_calls"}]}\n\n',
      'data: [DONE]\n\n',
    ])
    const seen: string[] = []
    const turn = await readModelTurn('openai', res, (t) => seen.push(t))

    expect(seen).toEqual(['Checking ', 'now'])
    expect(turn.text).toBe('Checking now')
    expect(turn.toolCalls).toEqual([
      { id: 'call_1', name: 'get_spending_breakdown', arguments: '{"month":10}' },
    ])
  })
})

describe('readModelTurn — Anthropic stream', () => {
  it('joins input_json_delta fragments into one tool_use call', async () => {
    const res = sseResponse([
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Let me check."}}\n\n',
      'data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_1","name":"get_spending_breakdown","input":{}}}\n\n',
      'data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"month\\":10}"}}\n\n',
      'data: {"type":"content_block_stop","index":1}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ])
    const seen: string[] = []
    const turn = await readModelTurn('anthropic', res, (t) => seen.push(t))

    expect(seen).toEqual(['Let me check.'])
    expect(turn.text).toBe('Let me check.')
    expect(turn.toolCalls).toEqual([
      { id: 'toolu_1', name: 'get_spending_breakdown', arguments: '{"month":10}' },
    ])
  })
})

describe('readModelTurn — Gemini stream', () => {
  it('normalizes functionCall parts to a tool call with JSON arguments', async () => {
    const res = sseResponse([
      'data: {"candidates":[{"content":{"parts":[{"text":"Let me check."}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"get_spending_breakdown","args":{"month":10}}}]}}]}\n\n',
    ])
    const seen: string[] = []
    const turn = await readModelTurn('gemini', res, (t) => seen.push(t))

    expect(seen).toEqual(['Let me check.'])
    expect(turn.text).toBe('Let me check.')
    expect(turn.toolCalls).toEqual([
      { id: expect.any(String), name: 'get_spending_breakdown', arguments: '{"month":10}' },
    ])
  })
})

describe('readModelTurn — non-streaming JSON', () => {
  it('reads an OpenAI message with tool_calls', async () => {
    const turn = await readModelTurn(
      'openai',
      jsonResponse({
        choices: [
          {
            message: {
              content: 'Done',
              tool_calls: [
                {
                  id: 'call_9',
                  type: 'function',
                  function: { name: 'get_spending_breakdown', arguments: '{"year":2026}' },
                },
              ],
            },
          },
        ],
      })
    )
    expect(turn.text).toBe('Done')
    expect(turn.toolCalls).toEqual([
      { id: 'call_9', name: 'get_spending_breakdown', arguments: '{"year":2026}' },
    ])
  })

  it('reads Anthropic content blocks including tool_use', async () => {
    const turn = await readModelTurn(
      'anthropic',
      jsonResponse({
        content: [
          { type: 'text', text: 'Done' },
          { type: 'tool_use', id: 'toolu_9', name: 'get_financial_snapshot', input: { a: 1 } },
        ],
      })
    )
    expect(turn.text).toBe('Done')
    expect(turn.toolCalls).toEqual([
      { id: 'toolu_9', name: 'get_financial_snapshot', arguments: '{"a":1}' },
    ])
  })

  it('reads Gemini functionCall parts', async () => {
    const turn = await readModelTurn(
      'gemini',
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Done' },
                { functionCall: { name: 'get_financial_snapshot', args: { a: 1 } } },
              ],
            },
          },
        ],
      })
    )
    expect(turn.text).toBe('Done')
    expect(turn.toolCalls).toEqual([
      { id: expect.any(String), name: 'get_financial_snapshot', arguments: '{"a":1}' },
    ])
  })
})
