/**
 * /api/byok/config — Public BYOK configuration endpoint.
 *
 * Returns the runtime provider list (from SUPPORTED_PROVIDERS) plus the
 * server RSA public key and keyId needed by clients to build envelopes.
 * No auth required — public config is safe to expose.
 */

import { NextResponse } from 'next/server'
import { SUPPORTED_PROVIDERS, getProvider } from '@/lib/byok/providers'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  // Filter to v1 scope: Ollama (clientDirect) + OpenRouter + NVIDIA NIM (proxy)
  // Per PRD D3: 3 providers only for v1
  const V1_PROVIDER_IDS = ['ollama', 'openrouter', 'nvidia-nim'] as const

  const providers = V1_PROVIDER_IDS
    .map((id) => getProvider(id))
    .filter((p): p is typeof SUPPORTED_PROVIDERS[string] => p !== undefined)

  const publicKeyPem = process.env.NEXT_PUBLIC_BYOK_PUBLIC_KEY ?? ''
  const kekId = process.env.NEXT_PUBLIC_BYOK_KEK_ID ?? ''

  return NextResponse.json({
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      baseUrl: p.baseUrl,
      defaultModel: p.defaultModel,
      availableModels: p.availableModels ?? [],
      auth: p.auth,
      authHeaderName: p.authHeaderName,
      defaultHeaders: p.defaultHeaders ?? {},
    })),
    keyId: kekId,
    publicKey: publicKeyPem,
  })
}