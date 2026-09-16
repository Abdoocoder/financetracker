import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { PrivacyClient } from './privacy-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return {
    title: t('priv_title'),
    description: t('priv_s_who_desc'),
    alternates: { canonical: '/privacy' },
  }
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
