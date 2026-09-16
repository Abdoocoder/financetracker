import { headers } from 'next/headers'
import { getServerTranslation } from '@/lib/i18n-server'

const SITE_URL = 'https://fajrak.com'

export default async function JsonLd() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const { t, lang } = await getServerTranslation()
  const appName = t('app_name')
  const description = t('meta_desc')
  const inLanguage = lang === 'en' ? 'en-US' : 'ar-JO'

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: appName,
    alternateName: ['فجرك', 'Fajrak Financial'],
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    email: 'support@fajrak.com',
    description,
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appName,
    alternateName: 'Fajrak',
    url: SITE_URL,
    description,
    inLanguage,
  }

  return (
    <>
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  )
}