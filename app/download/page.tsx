import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { DownloadClient } from './download-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return {
    title: `${t('down_title_part1')} Android`,
    description: t('down_desc'),
    alternates: { canonical: '/download' },
  }
}

export default function DownloadPage() {
  return <DownloadClient />
}
