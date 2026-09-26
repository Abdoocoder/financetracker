/**
 * LLM Output Moderation Layer (SERVER-ONLY, Feature A + B).
 * Implements pre-output guardrails and post-output sanitization per ADR-012.
 */

import { createHash } from 'crypto'

// ============================================================
// Types
// ============================================================

export interface ModerationResult {
  allowed: boolean
  flags: ModerationFlag[]
  sanitized?: string
  metadata: ModerationMetadata
}

export interface ModerationFlag {
  type: 'riba' | 'hallucination' | 'prompt_injection' | 'boundary_violation' | 'xss'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  location?: string
}

export interface ModerationMetadata {
  model?: string
  promptTokens?: number
  completionTokens?: number
  latencyMs: number
  ruleVersion: string
}

export interface FullModerationOptions {
  userId?: string
  model?: string
  financialContext?: string
  sanitizeOutput?: boolean
}

// ============================================================
// Guardrail Patterns (Financial Safety)
// ============================================================

const RIBA_PATTERNS = [
  /\b(interest|rate|apr|apy|yield|return on investment|roi)\b/i,
  /\b(compound interest|simple interest|fixed income|bond yield)\b/i,
  /\b(usury|ربا|فائدة|عائد)\b/i,
  /investment.*guaranteed|guaranteed.*return/i,
  /risk.free|free.risk/i,
]

const HALLUCINATION_PATTERNS = [
  /txn[_-]?\d{6,}/i,
  /transaction[_-]?id[_-]?\d{8,}/i,
  /\$\d{10,}/,
  /\d{10,}\s*(JOD|USD|EUR)/,
  /central bank of fajrak/i,
  /fajrak federal reserve/i,
]

const PROMPT_INJECTION_PATTERNS = [
  /ignore (previous|above|all) (instructions|prompts|rules)/i,
  /system prompt|override|bypass/i,
  /pretend to be|act as|roleplay/i,
  /<script|javascript:|onerror=|onload=/i,
  /{{.*}}|%{.*}%|\$\{.*\}/,
]

const BOUNDARY_PATTERNS = [
  /\b(legal advice|tax advice|legal opinion)\b/i,
  /\b(medical advice|diagnosis|prescription)\b/i,
  /\b(buy|sell|short|long)\s+(stock|coin|token|crypto)\b/i,
  /\byou should\b.*\b(invest|allocate|diversify)\b/i,
]

// ============================================================
// Scanning Utility
// ============================================================

function scanPatterns(
  text: string,
  patterns: RegExp[],
  flagType: ModerationFlag['type'],
  severity: ModerationFlag['severity'] = 'medium'
): ModerationFlag[] {
  const flags: ModerationFlag[] = []
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      flags.push({
        type: flagType,
        severity,
        message: `Detected ${flagType}: "${match[0].substring(0, 100)}"`,
        location: match.index?.toString(),
      })
    }
  }
  return flags
}

// ============================================================
// Pre-output Guardrails
// ============================================================

export async function preOutputGuardrails(
  llmOutput: string,
  context?: { userId?: string; model?: string; financialContext?: string }
): Promise<ModerationResult> {
  const startTime = Date.now()
  const flags: ModerationFlag[] = []

  flags.push(...scanPatterns(llmOutput, RIBA_PATTERNS, 'riba', 'high'))
  flags.push(...scanPatterns(llmOutput, HALLUCINATION_PATTERNS, 'hallucination', 'medium'))
  flags.push(...scanPatterns(llmOutput, PROMPT_INJECTION_PATTERNS, 'prompt_injection', 'critical'))
  flags.push(...scanPatterns(llmOutput, BOUNDARY_PATTERNS, 'boundary_violation', 'high'))

  if (context?.financialContext) {
    const balancePattern = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(JOD|USD|EUR)\b/g
    const balancesInOutput = llmOutput.match(balancePattern)
    if (balancesInOutput && balancesInOutput.length > 0) {
      flags.push({
        type: 'hallucination',
        severity: 'medium',
        message: 'LLM output contains specific monetary amounts that may leak user financial data',
        location: 'balance_pattern',
      })
    }
  }

  const criticalFlags = flags.filter(f => f.severity === 'critical')
  const highFlags = flags.filter(f => f.severity === 'high')
  const finalAllowed = criticalFlags.length === 0 && highFlags.length === 0

  return {
    allowed: finalAllowed,
    flags,
    metadata: {
      model: context?.model,
      latencyMs: Date.now() - startTime,
      ruleVersion: '1.0.0',
    },
  }
}

// ============================================================
// Post-output Sanitization (XSS Prevention)
// ============================================================

let dompurify: any = null

async function getDOMPurify(): Promise<any> {
  if (!dompurify) {
    const { JSDOM } = await import('jsdom')
    const window = new JSDOM('').window
    const DOMPurify = (await import('dompurify')).default
    dompurify = DOMPurify(window)
  }
  return dompurify
}

export async function postOutputSanitize(htmlOrMarkdown: string): Promise<string> {
  const purify = await getDOMPurify()
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(htmlOrMarkdown)

  if (hasHtmlTags) {
    return purify.sanitize(htmlOrMarkdown, {
      ALLOWED_TAGS: [
        'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'code', 'pre', 'span', 'div',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'hr'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'id', 'style'
      ],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
    })
  } else {
    return htmlOrMarkdown
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '\u2019')
  }
}

// ============================================================
// Full Moderation Pipeline
// ============================================================

export async function moderateLLMOutput(
  llmOutput: string,
  options: FullModerationOptions = {}
): Promise<ModerationResult> {
  const startTime = Date.now()
  const guardrailResult = await preOutputGuardrails(llmOutput, {
    userId: options.userId,
    model: options.model,
    financialContext: options.financialContext,
  })

  if (!guardrailResult.allowed) {
    return {
      allowed: false,
      flags: guardrailResult.flags,
      metadata: {
        ...guardrailResult.metadata,
        latencyMs: Date.now() - startTime,
      },
    }
  }

  let sanitized = llmOutput
  if (options.sanitizeOutput) {
    sanitized = await postOutputSanitize(llmOutput)
  }

  return {
    allowed: true,
    flags: guardrailResult.flags,
    sanitized,
    metadata: {
      ...guardrailResult.metadata,
      latencyMs: Date.now() - startTime,
    },
  }
}

// ============================================================
// Hash utilities
// ============================================================

export function hashOutput(output: string): string {
  return createHash('sha256').update(output).digest('hex').substring(0, 16)
}

export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').substring(0, 16)
}