import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { RegisterClient } from './register-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return {
    title: t('auth_register_title'),
    description: t('auth_register_subtitle'),
    alternates: { canonical: '/register' },
  }
}

export default function RegisterPage() {
  return <RegisterClient />
}
