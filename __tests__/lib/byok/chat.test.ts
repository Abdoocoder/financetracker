/**
 * @jest-environment node
 */
import { buildChatBody, extractDelta, readStream } from '@/lib/byok/chat'

describe('buildChatBody', () => {
  const msgs = [
    { role: 'user' as const, content: 'what do I spend on food?' },
    { role: 'assistant' as const, content: '45 KWD last month.' },
  ]

  it('builds the Anthropic messages format (system as top-level string)', () => {
    const body = buildChatBody({ id: 'anthropic' }, 'You are Fajrak.', msgs, 'claude-x', true) as any
    expect(body.model).toBe('claude-x')
    expect(body.system).toBe('You are Fajrak.')
    expect(body.max_tokens).toBe(1024)
    expect(body.stream).toBe(true)
    expect(body.messages).toEqual(msgs.map(m => ({ role: m.role, content: m.content })))
  })

  it('builds Gemini contents with assistant mapped to role model', () => {
    const body = buildChatBody({ id: 'gemini' }, 'Sys', msgs, 'gemini-2.5', false) as any
    expect(body.system_instruction).toEqual({ parts: [{ text: 'Sys' }] })
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'what do I spend on food?' }] },
      { role: 'model', parts: [{ text: '45 KWD last month.' }] },
    ])
    // Gemini signals streaming via the streamGenerateContent URL, not a body flag.
    expect(body.stream).toBeUndefined()
  })

  it('builds OpenAI-compatible bodies with a prepended system message for every proxy provider', () => {
    for (const id of ['openai', 'nvidia-nim', 'openrouter', 'ollama']) {
      const body = buildChatBody({ id }, 'Sys', msgs, 'm', true) as any
      expect(body.temperature).toBe(0.2)
      expect(body.stream).toBe(true)
      expect(body.messages).toEqual([
        { role: 'system', content: 'Sys' },
        ...msgs,
      ])
    }
  })
})

describe('extractDelta', () => {
  it('extracts Anthropic content_block_delta text only', () => {
    expect(
      extractDelta('anthropic', { type: 'content_block_delta', delta: { text: 'Hel' } })
    ).toBe('Hel')
    expect(extractDelta('anthropic', { type: 'message_start' })).toBe('')
    expect(extractDelta('anthropic', { type: 'content_block_delta', delta: {} })).toBe('')
  })

  it('extracts the first Gemini candidate part text', () => {
    expect(
      extractDelta('gemini', {
        candidates: [{ content: { parts: [{ text: 'world' }] } }],
      })
    ).toBe('world')
    expect(extractDelta('gemini', { candidates: [] })).toBe('')
    expect(extractDelta('gemini', {})).toBe('')
  })

  it('extracts OpenAI delta text (with message fallback)', () => {
    expect(extractDelta('openrouter', { choices: [{ delta: { content: 'ab' } }] })).toBe('ab')
    expect(extractDelta('ollama', { choices: [{ message: { content: 'cd' } }] })).toBe('cd')
    expect(extractDelta('openai', { choices: [{ delta: {} }] })).toBe('')
    expect(extractDelta('nvidia-nim', {})).toBe('')
  })
})

describe('readStream', () => {
  function sseResponse(chunks: string[]): Response {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
        controller.close()
      },
    })
    return new Response(stream, { status: 200 })
  }

  it('collects incremental Delta text and skips non-text frames', async () => {
    const body = [
      'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"text":" world"}}\n\n',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
      'event: ping\ndata: [DONE]\n\n',
    ].join('')

    const seen: string[] = []
    await readStream(sseResponse([body]), 'anthropic', t => seen.push(t))
    expect(seen).toEqual(['Hello', ' world'])
  })

  it('rejoins frames split across network chunks', async () => {
    const seen: string[] = []
    await readStream(
      sseResponse(['data: {"type":"content_block_delta","delta":{"text":"He', 'llo"}}\n\n']),
      'anthropic',
      t => seen.push(t)
    )
    expect(seen).toEqual(['Hello'])
  })

  it('ignores malformed frames instead of throwing', async () => {
    const seen: string[] = []
    await readStream(
      sseResponse(['data: not-json\n\ndata: {"choices":[{"delta":{"content":"ok"}}]}\n\n']),
      'openai',
      t => seen.push(t)
    )
    expect(seen).toEqual(['ok'])
  })

  it('skips comment/event lines and blank data', async () => {
    const seen: string[] = []
    await readStream(
      sseResponse([': keep-alive\nevent: ping\ndata:\n\ndata: [DONE]\n\n']),
      'openai',
      t => seen.push(t)
    )
    expect(seen).toEqual([])
  })

  it('throws when the response has no body', async () => {
    await expect(readStream(new Response(null, { status: 200 }), 'openai', () => {})).rejects.toThrow(
      'No response body'
    )
  })
})