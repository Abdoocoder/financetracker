/**
 * BYOK chat wire helpers (Feature A) — SHARED by the web client UI and tests.
 *
 * The proxy relays provider-native bytes verbatim (C2 / HOLD SCOPE), so the
 * CLIENT must speak each provider's exact request/SSE format. These pure
 * helpers build the provider-native request body and extract incremental text
 * from streamed frames — extracted out of the ChatAssistant component so they
 * can be unit-tested without a browser.
 */

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const TEMPERATURE = 0.2

/** Build the provider-native chat request body (bypass CORS thin pass-through). */
export function buildChatBody(
  provider: { id: string },
  systemPrompt: string,
  messages: ChatMsg[],
  model: string,
  stream: boolean
): object {
  if (provider.id === 'anthropic') {
    return {
      model,
      system: systemPrompt,
      max_tokens: 1024,
      temperature: TEMPERATURE,
      stream,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }
  }
  if (provider.id === 'gemini') {
    return {
      model,
      system_instruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: TEMPERATURE },
      contents: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    }
  }
  // openai-compatible (openai, nvidia-nim, openrouter, ollama)
  return {
    model,
    temperature: TEMPERATURE,
    stream,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  }
}

/** Extract incremental text from a streamed SSE data payload. */
export function extractDelta(providerId: string, parsed: Record<string, unknown>): string {
  if (providerId === 'anthropic') {
    const delta = parsed.delta as { text?: string } | undefined
    if (parsed.type === 'content_block_delta' && delta?.text) return delta.text
    return ''
  }
  if (providerId === 'gemini') {
    const candidates = parsed.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined
    return candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }
  const choices = parsed.choices as
    | Array<{ delta?: { content?: string }; message?: { content?: string } }>
    | undefined
  return choices?.[0]?.delta?.content ?? choices?.[0]?.message?.content ?? ''
}

/** Consume an SSE response body, calling onDelta for each text fragment. */
export async function readStream(
  res: Response,
  providerId: string,
  onDelta: (text: string) => void
): Promise<void> {
  if (!res.body) throw new Error('No response body')
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
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>
        const text = extractDelta(providerId, parsed)
        if (text) onDelta(text)
      } catch {
        // malformed frame — skip
      }
    }
  }
}