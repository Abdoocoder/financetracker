import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/onboarding', '/forgot-password', '/reset-password'],
      },
    ],
    sitemap: 'https://fajrak.com/sitemap.xml',
  }
}
