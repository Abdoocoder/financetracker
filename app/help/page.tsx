import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { buildPageMetadata } from '@/lib/seo'
import { HelpClient } from './help-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return buildPageMetadata({
    title: t('help_title'),
    description: t('help_subtitle'),
    path: '/help',
  })
}

export default function HelpPage() {
  return <HelpClient />
}