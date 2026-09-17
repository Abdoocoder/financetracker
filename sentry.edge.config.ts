// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Validate DSN before initializing to prevent 403 errors from invalid/mismatched DSN
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const isValidDsn = dsn && dsn.startsWith('https://') && dsn.includes('@') && dsn.includes('.ingest.');

if (!isValidDsn) {
  console.warn('[Sentry] Invalid or missing SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN — Sentry disabled. Configure in .env.local');
}

Sentry.init({
  dsn: isValidDsn ? dsn : undefined,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
