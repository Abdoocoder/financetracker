import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { buildPageMetadata } from '@/lib/seo'
import { PrivacyClient } from './privacy-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return buildPageMetadata({
    title: t('priv_title'),
    description: t('priv_s_who_desc'),
    path: '/privacy',
  })
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
