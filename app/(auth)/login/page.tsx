import type { Metadata } from 'next'
import { getServerTranslation } from '@/lib/i18n-server'
import { LoginClient } from './login-client'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  return {
    title: t('auth_login_title'),
    description: t('auth_login_subtitle'),
    alternates: { canonical: '/login' },
  }
}

export default function LoginPage() {
  return <LoginClient />
}
