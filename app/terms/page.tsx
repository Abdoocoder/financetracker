import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { buildPageMetadata } from '@/lib/seo'
import { TermsClient } from './terms-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return buildPageMetadata({
    title: t('terms_title'),
    description: t('terms_s_nature_desc'),
    path: '/terms',
  })
}

export default function TermsPage() {
  return <TermsClient />
}
