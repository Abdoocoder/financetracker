import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { buildPageMetadata } from '@/lib/seo'
import { DownloadClient } from './download-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return buildPageMetadata({
    title: `${t('down_title_part1')} Android`,
    description: t('down_desc'),
    path: '/download',
  })
}

export default function DownloadPage() {
  return <DownloadClient />
}
