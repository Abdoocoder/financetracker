import 'server-only'
import { headers, cookies } from 'next/headers'
import { ar } from './locales/ar'
import { en } from './locales/en'

export async function getServerLang() {
  const cookieStore = await cookies()
  const langCookie = cookieStore.get('lang')?.value

  if (langCookie === 'ar' || langCookie === 'en') {
    return langCookie as 'ar' | 'en'
  }

  const headerList = await headers()
  const acceptLanguage = headerList.get('accept-language') || ''
  
  if (acceptLanguage.toLowerCase().includes('en')) {
    return 'en'
  }

  return 'ar' // Default to Arabic
}

export function getTranslation(lang: 'ar' | 'en') {
  return lang === 'en' ? en : ar
}

export async function getServerTranslation() {
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
    lang
  }
}
