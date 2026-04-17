import 'server-only'
import { headers, cookies } from 'next/headers'
import { ar } from './locales/ar'
import { en } from './locales/en'

export async function getServerLang(): Promise<'ar' | 'en'> {
  try {
    const cookieStore = await cookies()
    const langCookie = cookieStore.get('lang')?.value
    if (langCookie === 'ar' || langCookie === 'en') return langCookie
  } catch {}

  try {
    const headerList = await headers()
    const acceptLanguage = headerList.get('accept-language') || ''
    if (acceptLanguage.toLowerCase().includes('en')) return 'en'
  } catch {}

  return 'ar'
}

export function getTranslation(lang: 'ar' | 'en') {
  return lang === 'en' ? en : ar
}

export async function getServerTranslation() {
  try {
    const lang = await getServerLang()
    const translations = getTranslation(lang)
    return {
      t: (key: string, params?: Record<string, string | number>) => {
        let str = (translations as any)[key] || (ar as any)[key] || key
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            str = str.replace(`{${k}}`, String(v))
          })
        }
        return str
      },
      lang,
    }
  } catch {
    return {
      t: (key: string) => (ar as any)[key] || key,
      lang: 'ar' as const,
    }
  }
}
