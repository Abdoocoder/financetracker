import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  enabled: process.env.NODE_ENV === 'production',
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
})
