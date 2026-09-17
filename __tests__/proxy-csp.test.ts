/**
 * @jest-environment node
 *
 * CSP builder regression tests.
 *
 * Bug (Sep 2026): `upgrade-insecure-requests` in the development CSP rewrites
 * the post-login browser navigation router.push('/dashboard') from http to
 * https://localhost:3000/dashboard. The dev server has no TLS, so the
 * navigation aborts with net::ERR_SSL_PROTOCOL_ERROR and the Playwright
 * auth-flow / transaction-management specs time out (flaky race).
 *
 * The directive must be PRESENT in production (https) and ABSENT in
 * development (http localhost).
 */
import { buildCspHeader } from '@/proxy';

describe('buildCspHeader — upgrade-insecure-requests scoping', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true, configurable: true });
  });

  function setNodeEnv(env: string): void {
    Object.defineProperty(process.env, 'NODE_ENV', { value: env, writable: true, configurable: true });
  }

  it('keeps upgrade-insecure-requests in production (https) CSP', () => {
    setNodeEnv('production');
    expect(buildCspHeader('abc')).toContain('upgrade-insecure-requests');
  });

  it('omits upgrade-insecure-requests in development (http localhost) CSP', () => {
    setNodeEnv('development');
    expect(buildCspHeader('abc')).not.toContain('upgrade-insecure-requests');
  });

  it('keeps script nonce and supabase connect-src in both environments', () => {
    setNodeEnv('development');
    const devCsp = buildCspHeader('abc');
    expect(devCsp).toContain("script-src 'self' 'nonce-abc'");
    expect(devCsp).toContain('https://*.supabase.co');
    setNodeEnv('production');
    expect(buildCspHeader('abc')).toContain("connect-src 'self' https://*.supabase.co");
  });
});