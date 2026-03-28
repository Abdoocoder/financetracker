'use client'
import * as Sentry from '@sentry/nextjs'

export default function SentryTestPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Sentry Test</h1>
      <button
        onClick={() => {
          Sentry.captureMessage('Test message from fajrak.com')
          throw new Error('Test error from fajrak.com')
        }}
      >
        Send Test Error
      </button>
    </div>
  )
}
