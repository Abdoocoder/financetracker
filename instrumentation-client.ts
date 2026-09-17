// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Validate DSN before initializing to prevent 403 errors from invalid/mismatched DSN
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isValidDsn = Boolean(dsn && dsn.startsWith('https://') && dsn.includes('@') && dsn.includes('.ingest.'));

if (!isValidDsn) {
  console.warn('[Sentry] Invalid or missing NEXT_PUBLIC_SENTRY_DSN — Sentry disabled. Configure in .env.local');
}

Sentry.init({
  dsn: isValidDsn ? dsn : undefined,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  enabled: isValidDsn && process.env.NODE_ENV === 'production',
  beforeSend(event) {
    // Filter out the noisy unhandled promise rejections caused by Sentry's own
    // wrapping of navigator.serviceWorker.register failing on strict browsers
    const exceptionValue = event.exception?.values?.[0]?.value;
    const isServiceWorkerError = event.exception?.values?.[0]?.stacktrace?.frames?.some(
      (frame) => frame.function?.includes('serviceWorker.register') || frame.function?.includes('wrsParams.serviceWorkers')
    );
    if (exceptionValue === 'Rejected' && isServiceWorkerError) {
      return null; // Drop the event
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;