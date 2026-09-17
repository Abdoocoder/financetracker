import type { StorageState, StorageStateCookie, StorageStateOrigin } from '@/e2e/playwright-types'

// Supabase session token cookie/localStorage name: "<project-ref>-auth-token",
// e.g. sb-ujvcvtpwsaidljecqbaa-auth-token. The 12-char ref is [a-z0-9].
const AUTH_TOKEN_RE = /^sb-[a-z0-9]+-auth-token$/

/**
 * True when a persisted Playwright storageState contains a Supabase auth
 * token, either as a cookie (web session) or a localStorage entry (PKCE).
 */
export function hasAuthenticatedSession(state: StorageState): boolean {
  const cookieHit = (state.cookies ?? []).some((c: StorageStateCookie) => AUTH_TOKEN_RE.test(c.name))
  const storageHit = (state.origins ?? []).some((o: StorageStateOrigin) =>
    (o.localStorage ?? []).some((entry: { name: string; value: string }) => AUTH_TOKEN_RE.test(entry.name))
  )
  return cookieHit || storageHit
}

/**
 * Fails loudly when the storageState has no auth token. Meant to be called in
 * e2e/setup/global-setup.ts right before persisting the session. Regression
 * (Sep 2026): the old global-setup swallowed post-login navigation failures and
 * saved an empty session ('{"cookies":[]}'), so authenticated specs silently
 * started logged-out.
 */
export function assertAuthenticatedSession(state: StorageState, context: string): void {
  if (hasAuthenticatedSession(state)) return
  throw new Error(
    '[global-setup] login did not produce a Supabase auth token; saved storageState ' +
    'would be empty. Aborting session persist so specs fail loudly instead of ' +
    'starting logged-out. Context: ' + context
  )
}