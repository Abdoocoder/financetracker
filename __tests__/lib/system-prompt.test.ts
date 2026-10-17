/**
 * @jest-environment node
 *
 * Task 1 — BYOK assistant output rules.
 * The prompt must force: simplified Arabic MSA, no English filler inside
 * Arabic replies, JOD with exactly 3 decimals, no raw Markdown in plain-text
 * clients, and always one actionable suggestion at the end.
 */
import { buildChatFormatRules } from '@/lib/byok/system-prompt'

describe('buildChatFormatRules', () => {
  it('demands simplified Modern Standard Arabic with no English filler words', () => {
    const rules = buildChatFormatRules({ plainText: true })
    expect(rules).toMatch(/الفصحى المبسطة/)
    expect(rules).toContain('modest') // banned-word example from the live bug
    expect(rules).toMatch(/English words?/i)
  })

  it('formats JOD with exactly 3 decimal places', () => {
    const rules = buildChatFormatRules({ plainText: true, currency: 'JOD' })
    expect(rules).toContain('73.240')
    expect(rules).toMatch(/3 decimal places/)
  })

  it('forbids raw Markdown symbols in plain text mode', () => {
    const rules = buildChatFormatRules({ plainText: true })
    expect(rules).toContain('**')
    expect(rules).toContain('###')
    expect(rules).toMatch(/never output raw Markdown/i)
  })

  it('allows Markdown when the client renders it', () => {
    const rules = buildChatFormatRules({ plainText: false })
    expect(rules).toMatch(/Markdown/i)
    expect(rules).not.toMatch(/never output raw Markdown/i)
  })

  it('always requires exactly one actionable suggestion at the end', () => {
    const rules = buildChatFormatRules({ plainText: true })
    expect(rules).toMatch(/actionable/i)
    expect(rules).toMatch(/one/i)
  })
})
