/**
 * BYOK provider sync check — verifies Dart providers match web providers exactly.
 * Run with: npx tsx scripts/sync-byok-providers.ts
 * Exits 0 on match, 1 on mismatch (suitable for CI).
 */

import { readFileSync } from 'fs'
import { join } from 'path'

interface WebProvider {
  id: string
  name: string
  kind: 'proxy' | 'clientDirect'
  baseUrl: string
  defaultModel: string
  availableModels?: string[]
  auth: { kind: 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'none' }
  authHeaderName: string
  defaultHeaders?: Record<string, string>
}

interface DartProvider {
  id: string
  name: string
  kind: string
  baseUrl: string
  defaultModel: string
  availableModels: string[]
  auth: string
  authHeaderName: string
  defaultHeaders: Record<string, string>
}

function parseDartProviders(): Record<string, DartProvider> {
  const content = readFileSync(join(__dirname, '../mobile/fajrak_flutter/lib/services/byok/providers.dart'), 'utf-8')
  
  const providers: Record<string, DartProvider> = {}
  
  // Find the SUPPORTED_PROVIDERS map content
  const startIdx = content.indexOf('const SUPPORTED_PROVIDERS =')
  if (startIdx === -1) {
    throw new Error('Could not find SUPPORTED_PROVIDERS in Dart file')
  }
  
  const mapContent = content.slice(startIdx)
  // Extract everything between { and the closing }; 
  const braceStart = mapContent.indexOf('{')
  let braceCount = 0
  let endIdx = -1
  for (let i = braceStart; i < mapContent.length; i++) {
    if (mapContent[i] === '{') braceCount++
    else if (mapContent[i] === '}') {
      braceCount--
      if (braceCount === 0) {
        endIdx = i
        break
      }
    }
  }
  if (endIdx === -1) {
    throw new Error('Could not find closing brace for SUPPORTED_PROVIDERS')
  }
  
  const providersBlock = mapContent.slice(braceStart + 1, endIdx)
  
  // Parse each provider entry using a state machine
  let currentProvider = ''
  let inString = false
  let stringChar = ''
  let parenCount = 0
  let bracketCount = 0
  let braceCount2 = 0
  
  for (let i = 0; i < providersBlock.length; i++) {
    const char = providersBlock[i]
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
    } else if (inString && char === stringChar && providersBlock[i-1] !== '\\') {
      inString = false
    }
    
    if (!inString) {
      if (char === '(') parenCount++
      else if (char === ')') parenCount--
      else if (char === '[') bracketCount++
      else if (char === ']') bracketCount--
      else if (char === '{') braceCount2++
      else if (char === '}') braceCount2--
    }
    
    currentProvider += char
    
    // End of a provider entry: '),' at top level
    if (!inString && parenCount === 0 && bracketCount === 0 && braceCount2 === 0 && char === ')' && 
        i + 1 < providersBlock.length && providersBlock[i + 1] === ',') {
      const entry = currentProvider.trim()
      const parsed = parseProviderEntry(entry)
      if (parsed) {
        providers[parsed.id] = parsed
      }
      currentProvider = ''
    }
  }
  
  return providers
}

function parseProviderEntry(entry: string): DartProvider | null {
  // Entry may start with comma and whitespace, e.g., `,   'nvidia-nim': ByokProvider(...)`
  // Use [^']+ to match provider IDs with hyphens (e.g., nvidia-nim)
  const idMatch = entry.match(/'([^']+)'\s*:/)
  if (!idMatch) {
    console.error('Failed to parse entry ID from:', entry.slice(0, 100))
    return null
  }
  const id = idMatch[1]
  
  const nameMatch = entry.match(/name:\s*'([^']+)'/)
  const kindMatch = entry.match(/kind:\s*'([^']+)'/)
  const baseUrlMatch = entry.match(/baseUrl:\s*'([^']+)'/)
  const defaultModelMatch = entry.match(/defaultModel:\s*'([^']+)'/)
  
  // availableModels array - use [\s\S]*? to match across newlines
  const availableModelsMatch = entry.match(/availableModels:\s*\[([\s\S]*?)\]/)
  let availableModels: string[] = []
  if (availableModelsMatch) {
    availableModels = availableModelsMatch[1]
      .split(',')
      .map(s => s.trim().replace(/'/g, ''))
      .filter(s => s)
  }
  
  const authMatch = entry.match(/auth:\s*ByokAuth\.(\w+)/)
  const authHeaderNameMatch = entry.match(/authHeaderName:\s*'([^']*)'/)
  
  const defaultHeadersMatch = entry.match(/defaultHeaders:\s*\{([^}]*)\}/)
  let defaultHeaders: Record<string, string> = {}
  if (defaultHeadersMatch) {
    const content = defaultHeadersMatch[1].trim()
    if (content) {
      const pairs = content.split(',')
      for (const pair of pairs) {
        const [k, v] = pair.split(':').map(s => s.trim().replace(/'/g, ''))
        if (k && v) defaultHeaders[k] = v
      }
    }
  }
  
  return {
    id,
    name: nameMatch?.[1] ?? '',
    kind: kindMatch?.[1] ?? '',
    baseUrl: baseUrlMatch?.[1] ?? '',
    defaultModel: defaultModelMatch?.[1] ?? '',
    availableModels,
    auth: authMatch?.[1] ?? '',
    authHeaderName: authHeaderNameMatch?.[1] ?? '',
    defaultHeaders,
  }
}

// Canonical web provider data (source of truth from lib/byok/providers.ts)
const WEB_PROVIDERS: Record<string, WebProvider> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    kind: 'proxy',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.4-mini',
    availableModels: ['gpt-5.4-mini', 'gpt-5.4', 'gpt-4.1', 'gpt-4.1-mini', 'o1-preview', 'o1-mini'],
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'proxy',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    availableModels: ['claude-sonnet-4-6', 'claude-opus-4', 'claude-3.5-sonnet'],
    auth: { kind: 'x-api-key' },
    authHeaderName: 'x-api-key',
    defaultHeaders: { 'anthropic-version': '2023-06-01' },
  },
  'nvidia-nim': {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    kind: 'proxy',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b',
    availableModels: [
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3-super-120b-a12b',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'mistralai/mistral-nemotron',
      'google/gemma-2-27b-it',
    ],
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'proxy',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'auto',
    availableModels: ['auto', 'openai/gpt-5.4-mini', 'anthropic/claude-sonnet-4-6', 'meta/llama-3.1-405b-instruct'],
    auth: { kind: 'bearer' },
    authHeaderName: 'authorization',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    kind: 'proxy',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    defaultModel: 'gemini-2.5-pro',
    availableModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'],
    auth: { kind: 'x-goog-api-key' },
    authHeaderName: 'x-goog-api-key',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local Engine)',
    kind: 'clientDirect',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    availableModels: ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5', 'phi3.5'],
    auth: { kind: 'none' },
    authHeaderName: '',
  },
}

function mapDartAuth(dartAuth: string): WebProvider['auth'] {
  switch (dartAuth) {
    case 'bearer': return { kind: 'bearer' }
    case 'xApiKey': return { kind: 'x-api-key' }
    case 'xGoogApiKey': return { kind: 'x-goog-api-key' }
    case 'none': return { kind: 'none' }
    default: throw new Error(`Unknown Dart auth: ${dartAuth}`)
  }
}

function checkSync(): boolean {
  const dartProviders = parseDartProviders()
  let hasError = false
  
  console.log('Checking BYOK provider sync between web and Dart...')
  console.log('')
  
  // Check all web providers exist in Dart
  for (const [id, web] of Object.entries(WEB_PROVIDERS)) {
    const dart = dartProviders[id]
    if (!dart) {
      console.error(`❌ MISSING in Dart: ${id}`)
      hasError = true
      continue
    }
    
    const dartAuth = mapDartAuth(dart.auth)
    
    const checks = [
      { name: 'name', web: web.name, dart: dart.name },
      { name: 'kind', web: web.kind, dart: dart.kind },
      { name: 'baseUrl', web: web.baseUrl, dart: dart.baseUrl },
      { name: 'defaultModel', web: web.defaultModel, dart: dart.defaultModel },
      { name: 'availableModels', web: web.availableModels?.join(',') ?? '', dart: dart.availableModels.join(',') },
      { name: 'auth.kind', web: web.auth.kind, dart: dartAuth.kind },
      { name: 'authHeaderName', web: web.authHeaderName, dart: dart.authHeaderName },
    ]
    
    for (const check of checks) {
      if (check.web !== check.dart) {
        console.error(`❌ MISMATCH ${id}.${check.name}: web="${check.web}" vs dart="${check.dart}"`)
        hasError = true
      }
    }
    
    // Check defaultHeaders
    const webHeaders = web.defaultHeaders ?? {}
    const dartHeaders = dart.defaultHeaders ?? {}
    for (const [key, value] of Object.entries(webHeaders)) {
      if (dartHeaders[key] !== value) {
        console.error(`❌ MISMATCH ${id}.defaultHeaders.${key}: web="${value}" vs dart="${dartHeaders[key] ?? 'undefined'}"`)
        hasError = true
      }
    }
    for (const key of Object.keys(dartHeaders)) {
      if (!(key in webHeaders)) {
        console.error(`❌ EXTRA in Dart ${id}.defaultHeaders.${key}: "${dartHeaders[key]}"`)
        hasError = true
      }
    }
    
    if (!hasError) {
      console.log(`✅ ${id} (${web.name}) - OK`)
    }
  }
  
  // Check for extra providers in Dart
  for (const id of Object.keys(dartProviders)) {
    if (!(id in WEB_PROVIDERS)) {
      console.error(`❌ EXTRA in Dart: ${id}`)
      hasError = true
    }
  }
  
  console.log('')
  if (hasError) {
    console.error('❌ SYNC CHECK FAILED: Dart providers do not match web providers')
    return false
  } else {
    console.log('✅ SYNC CHECK PASSED: All providers match exactly')
    return true
  }
}

const ok = checkSync()
process.exit(ok ? 0 : 1)
