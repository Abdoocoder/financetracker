/**
 * Sentry `beforeSend` filters shared by the Node.js and Edge runtimes.
 *
 * Kept in `lib/` rather than inline in `sentry.server.config.ts` so the logic is
 * unit-testable: importing a `sentry.*.config.ts` file also runs `Sentry.init()`,
 * which tests must not do.
 *
 * Why these filters exist:
 *
 * 1. PII (AGENTS.md rule 12, `docs/domain/observability-and-security.md` §2).
 *    `sendDefaultPii: false` stops Sentry attaching IP/user data on its own, but
 *    request headers are forwarded from the incoming request and can carry
 *    `X-Forwarded-For`, `X-Real-Ip`, `Cookie`, `Set-Cookie`, or `Authorization`.
 *    Those values are overwritten before the event leaves the process. Events are
 *    redacted rather than dropped: dropping every SSR event that has a `cookie`
 *    header would silence most real server errors.
 *
 * 2. Bot-probe noise (Sentry issue JAVASCRIPT-NEXTJS-M). All 7 events carried
 *    `transaction: POST /page` and `url: https://fajrak.com/`. The landing route
 *    has no `<form>` and no Server Action, so an action-resolution failure there
 *    can only come from malformed or manipulated traffic. Genuine deploy-skew
 *    failures occur on `/reset-password` — the only route in this app with
 *    Server Actions — and those stay visible.
 */
import type { ErrorEvent } from "@sentry/nextjs";

/** Message shared by the E974/E975 "action id not found" errors. */
export const SERVER_ACTION_NOT_FOUND = "Failed to find Server Action";

/** The app's landing route. */
const ROOT_PATH = "/";

/**
 * Next.js App Router transaction name for the landing route: the route file is
 * `app/page.tsx`, so the transaction is `POST /page` even though the URL path is
 * `/`. Verified against the issue's tag distribution (7/7 events).
 */
const ROOT_ROUTE_TRANSACTION = "POST /page";

/** Header values replaced before the event is sent. */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-forwarded-for",
  "x-real-ip",
]);

const REDACTED = "[Filtered]";

/** Pathname of the request URL, or `null` when it cannot be parsed. */
export function getRequestPath(event: ErrorEvent): string | null {
  const url = event.request?.url;
  if (!url) return null;

  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

/**
 * True when the event belongs to the landing route. Falls back to the
 * transaction name when the request URL is missing, which is what happens for
 * errors reported through `onRequestError`.
 */
export function isRootRouteRequest(event: ErrorEvent): boolean {
  const path = getRequestPath(event);
  if (path !== null) return path === ROOT_PATH;
  return event.transaction === ROOT_ROUTE_TRANSACTION;
}

/** A "Failed to find Server Action" error emitted for the action-less landing route. */
export function isServerActionProbe(event: ErrorEvent): boolean {
  const mentionsActionResolution =
    event.exception?.values?.some((value) =>
      value.value?.includes(SERVER_ACTION_NOT_FOUND)
    ) ?? false;

  return mentionsActionResolution && isRootRouteRequest(event);
}

/** Removes the user context and overwrites PII-bearing request headers in place. */
export function redactSensitiveData(event: ErrorEvent): ErrorEvent {
  delete event.user;

  const headers = event.request?.headers;
  if (headers) {
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) headers[key] = REDACTED;
    }
  }

  return event;
}

/** Composed handler passed to `Sentry.init({ beforeSend })`. */
export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  if (isServerActionProbe(event)) return null;
  return redactSensitiveData(event);
}
