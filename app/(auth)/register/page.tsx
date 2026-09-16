import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { buildPageMetadata } from '@/lib/seo'
import { RegisterClient } from './register-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return buildPageMetadata({
    title: t('auth_register_title'),
    description: t('auth_register_subtitle'),
    path: '/register',
  })
}

export default function RegisterPage() {
  return <RegisterClient />
}
