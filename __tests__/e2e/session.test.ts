/**
 * E2E session assertion regression tests.
 *
 * Bug (Sep 2026): global-setup swallowed failed post-login navigations and
 * saved storageState unconditionally, persisting an empty session
 * ('{"cookies":[]}' in e2e/.auth/user.json). Authenticated specs then started
 * logged-out. The assertion must fail loudly when no auth token survived.
 */
import type { StorageState } from '@/e2e/playwright-types';
import { assertAuthenticatedSession, hasAuthenticatedSession } from '@/e2e/setup/session';

const EMPTY_STATE: StorageState = { cookies: [], origins: [] };

describe('hasAuthenticatedSession', () => {
  it('returns false for an empty storageState (no auth token at all)', () => {
    expect(hasAuthenticatedSession(EMPTY_STATE)).toBe(false);
  });

  it('returns false when only non-auth cookies are present (lang, tracking)', () => {
    const state: StorageState = {
      cookies: [
        { name: 'lang', value: 'ar', domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
        { name: 'ajs_anonymous_id', value: 'x', domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' },
      ],
      origins: [],
    };
    expect(hasAuthenticatedSession(state)).toBe(false);
  });

  it('returns true when an sb-*-auth-token cookie exists (web session)', () => {
    const state: StorageState = {
      cookies: [
        { name: 'sb-ujvcvtpwsaidljecqbaa-auth-token', value: 'jwt', domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: true, sameSite: 'Lax' },
      ],
      origins: [],
    };
    expect(hasAuthenticatedSession(state)).toBe(true);
  });

  it('returns true when an sb-*-auth-token localStorage entry exists (PKCE)', () => {
    const state: StorageState = {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [{ name: 'sb-ujvcvtpwsaidljecqbaa-auth-token', value: 'jwt-pkce' }],
        },
      ],
    };
    expect(hasAuthenticatedSession(state)).toBe(true);
  });
});

describe('assertAuthenticatedSession', () => {
  it('throws with a descriptive message for an empty session', () => {
    expect(() => assertAuthenticatedSession(EMPTY_STATE, 'http://localhost:3000/login')).toThrow(
      /[Gg]lobal-setup.*auth token.*storageState/
    );
  });

  it('does not throw when a session is present', () => {
    const state: StorageState = {
      cookies: [{ name: 'sb-test-auth-token', value: 'jwt', domain: 'localhost', path: '/', expires: -1, httpOnly: false, secure: true, sameSite: 'Lax' }],
      origins: [],
    };
    expect(() => assertAuthenticatedSession(state, 'ctx')).not.toThrow();
  });
});