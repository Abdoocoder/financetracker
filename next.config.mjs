import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  serverExternalPackages: ['firebase-admin'],
  turbopack: {},
}

export default withSentryConfig(nextConfig, {
  org: 'abdoocoder-m2',
  project: 'javascript-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
})
