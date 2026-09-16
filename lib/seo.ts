import 'server-only'
import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'

const SITE_URL = 'https://fajrak.com'

interface BuildPageMetadataArgs {
  title: string
  description: string
  path: string
}

export async function buildPageMetadata({
  title,
  description,
  path,
}: BuildPageMetadataArgs): Promise<Metadata> {
  const { t, lang } = await getServerTranslation()
  const appName = t('app_name')
  const fullTitle = `${title} | ${appName}`
  const primaryLocale = lang === 'en' ? 'en_US' : 'ar_JO'
  const alternateLocale = lang === 'en' ? ['ar_JO'] : ['en_US']
  const ogImage = {
    url: '/feature-graphic.png',
    width: 1024,
    height: 500,
    alt: appName,
  }

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${path}`,
      locale: primaryLocale,
      alternateLocale,
      siteName: appName,
      title: fullTitle,
      description,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ['/feature-graphic.png'],
    },
  }
}