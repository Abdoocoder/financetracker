/**
 * @jest-environment node
 *
 * `beforeSend` filters for the Node.js and Edge Sentry runtimes.
 *
 * Regression target (Sentry issue JAVASCRIPT-NEXTJS-M): malformed bot traffic
 * POSTed to the action-less landing route and reported "Failed to find Server
 * Action", filling the issue feed with non-actionable events.
 *
 * The other half is AGENTS.md rule 12: no PII may leave the process, even
 * though `sendDefaultPii` is off, because Sentry forwards request headers
 * (`x-forwarded-for`, `cookie`, ...) as-is.
 *
 * All data here is synthetic — `203.0.113.7` is TEST-NET-3 (RFC 5737).
 */
import type { ErrorEvent } from '@sentry/nextjs';

import {
  SERVER_ACTION_NOT_FOUND,
  beforeSend,
  getRequestPath,
  isRootRouteRequest,
  isServerActionProbe,
  redactSensitiveData,
} from '@/lib/sentry-filters';

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return { ...overrides } as ErrorEvent;
}

function serverActionError(): ErrorEvent['exception'] {
  return {
    values: [
      {
        type: 'Error',
        value: `${SERVER_ACTION_NOT_FOUND} <synthetic-id>`,
      },
    ],
  };
}

describe('isServerActionProbe', () => {
  it('drops the probe when the request URL is the landing route', () => {
    const event = makeEvent({
      exception: serverActionError(),
      request: { url: 'https://app.example.com/' },
    });

    expect(isServerActionProbe(event)).toBe(true);
    expect(beforeSend(event)).toBeNull();
  });

  it('drops the probe when only the route transaction is known', () => {
    // `onRequestError` reports carry the transaction but not always a URL.
    const event = makeEvent({
      exception: serverActionError(),
      transaction: 'POST /page',
    });

    expect(beforeSend(event)).toBeNull();
  });

  it('drops the probe when the URL carries a query string', () => {
    const event = makeEvent({
      exception: serverActionError(),
      request: { url: 'https://app.example.com/?next=%2Fdashboard' },
    });

    expect(beforeSend(event)).toBeNull();
  });

  it('keeps the same error on a route that actually has Server Actions', () => {
    const event = makeEvent({
      exception: serverActionError(),
      request: { url: 'https://app.example.com/reset-password' },
    });

    expect(isServerActionProbe(event)).toBe(false);
    expect(beforeSend(event)).not.toBeNull();
  });

  it('keeps unrelated errors on the landing route', () => {
    const event = makeEvent({
      exception: { values: [{ type: 'TypeError', value: 'Synthetic failure' }] },
      request: { url: 'https://app.example.com/' },
    });

    expect(beforeSend(event)).not.toBeNull();
  });

  it('keeps errors that merely mention the phrase without a root request', () => {
    const event = makeEvent({
      exception: serverActionError(),
      transaction: 'POST /dashboard',
    });

    expect(beforeSend(event)).not.toBeNull();
  });

  it('keeps an event with no exception at all', () => {
    const event = makeEvent({ request: { url: 'https://app.example.com/' } });

    expect(beforeSend(event)).not.toBeNull();
  });
});

describe('redactSensitiveData', () => {
  it('removes the user context', () => {
    const event = makeEvent({
      user: { id: 'synthetic-user', ip_address: '203.0.113.7' },
    });

    const result = beforeSend(event);

    expect(result).not.toBeNull();
    expect(result?.user).toBeUndefined();
  });

  it('redacts IP and credential headers, case-insensitively', () => {
    const event = makeEvent({
      request: {
        url: 'https://app.example.com/dashboard',
        headers: {
          'X-Forwarded-For': '203.0.113.7',
          'x-real-ip': '203.0.113.7',
          Cookie: 'session=synthetic',
          authorization: 'Bearer synthetic',
          'Set-Cookie': 'session=synthetic',
        },
      },
    });

    const result = redactSensitiveData(event);
    const headers = result.request?.headers ?? {};

    expect(headers['X-Forwarded-For']).toBe('[Filtered]');
    expect(headers['x-real-ip']).toBe('[Filtered]');
    expect(headers['Cookie']).toBe('[Filtered]');
    expect(headers['authorization']).toBe('[Filtered]');
    expect(headers['Set-Cookie']).toBe('[Filtered]');
  });

  it('preserves non-sensitive headers', () => {
    const event = makeEvent({
      request: {
        url: 'https://app.example.com/dashboard',
        headers: {
          'X-Forwarded-For': '203.0.113.7',
          'content-type': 'application/json',
          'user-agent': 'SyntheticAgent/1.0',
        },
      },
    });

    const headers = redactSensitiveData(event).request?.headers ?? {};

    expect(headers['content-type']).toBe('application/json');
    expect(headers['user-agent']).toBe('SyntheticAgent/1.0');
  });

  it('tolerates an event without request or user', () => {
    const event = makeEvent({ message: 'Synthetic message' });

    expect(() => redactSensitiveData(event)).not.toThrow();
  });
});

describe('getRequestPath', () => {
  it('returns the pathname', () => {
    expect(getRequestPath(makeEvent({ request: { url: 'https://app.example.com/a/b' } }))).toBe('/a/b');
  });

  it('returns null for a missing or unparseable URL', () => {
    expect(getRequestPath(makeEvent())).toBeNull();
    expect(getRequestPath(makeEvent({ request: { url: 'not a url' } }))).toBeNull();
  });
});

describe('isRootRouteRequest', () => {
  it('prefers the request path over the transaction name', () => {
    const event = makeEvent({
      request: { url: 'https://app.example.com/settings' },
      transaction: 'POST /page',
    });

    expect(isRootRouteRequest(event)).toBe(false);
  });

  it('falls back to the transaction name when the URL is absent', () => {
    expect(isRootRouteRequest(makeEvent({ transaction: 'POST /page' }))).toBe(true);
    expect(isRootRouteRequest(makeEvent({ transaction: 'POST /settings' }))).toBe(false);
  });
});

