/**
 * /api/byok/config — Public BYOK configuration endpoint.
 *
 * Returns the runtime provider list (from SUPPORTED_PROVIDERS) plus the
 * server RSA public key and keyId needed by clients to build envelopes.
 * No auth required — public config is safe to expose.
 */

import { NextResponse } from 'next/server'
import { SUPPORTED_PROVIDERS } from '@/lib/byok/providers'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  // Advertise every provider in SUPPORTED_PROVIDERS. The proxy already
  // accepts all of them via getProvider(); this endpoint previously
  // filtered to a v1 subset (Ollama/OpenRouter/NVIDIA NIM), which hid
  // OpenAI/Anthropic/Gemini from the web UI while the mobile app showed
  // them from a hardcoded list.
  const providers = Object.values(SUPPORTED_PROVIDERS)

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