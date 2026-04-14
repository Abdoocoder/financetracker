'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { ar } from './locales/ar'
import { en } from './locales/en'

export type Lang = 'ar' | 'en' | 'system'
export type TranslationKey = keyof typeof ar

const translations = { ar, en }

interface I18nContextType {
  lang: 'ar' | 'en'
  currentLang: 'ar' | 'en' // Alias for compatibility
  setLang: (l: Lang) => void
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string
  tCategory: (cat: string) => string
  hydrated: boolean
}

const CAT_MAP: Record<string, string> = {
  'طعام وشراب': 'cat_food',
  'طعام': 'cat_food',
  'مواصلات': 'cat_transport',
  'فواتير': 'cat_bills',
  'صحة': 'cat_health',
  'تعليم': 'cat_edu',
  'ترفيه': 'cat_fun',
  'صلة رحم': 'cat_family',
  'ملابس': 'cat_clothes',
  'ديون': 'cat_debts',
  'إيجار / قسط': 'cat_rent',
  'أخرى': 'cat_other',
  'راتب': 'cat_salary',
  'عمل حر': 'cat_freelance',
  'استثمار': 'cat_invest',
  'مكافأة': 'cat_gift',
  'هدية': 'cat_gift',
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  currentLang: 'ar',
  setLang: () => {},
  t: (k) => k,
  tCategory: (c) => c,
  hydrated: false,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<'ar' | 'en'>('ar')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang
    if (saved === 'en' || saved === 'ar') {
      setLangState(saved)
    } else {
      // system or default
      const isEn = navigator.language.startsWith('en')
      setLangState(isEn ? 'en' : 'ar')
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    if (l === 'system') {
      localStorage.removeItem('lang')
      const isEn = navigator.language.startsWith('en')
      setLangState(isEn ? 'en' : 'ar')
    } else {
      localStorage.setItem('lang', l)
      setLangState(l)
    }
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let str = (translations[lang] as any)[key] || (translations['ar'] as any)[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v))
      })
    }
    return str
  }, [lang])

  const tCategory = useCallback((cat: string) => {
    const key = CAT_MAP[cat] || cat
    return t(key)
  }, [t])

  return (
    <I18nContext.Provider value={{ lang, currentLang: lang, setLang, t, tCategory, hydrated }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
