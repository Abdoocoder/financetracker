import { createClient } from '@supabase/supabase-js'
import { cookies as nextCookies } from 'next/headers'

// Typings لتوافق Next.js 15
type Cookie = {
  name: string
  value: string
  options?: {
    path?: string
    maxAge?: number
    expires?: Date
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
  }
}

// إنشاؤها بحيث تكون دالة دائماً
type CookieMethodsServer = {
  getAll: () => Cookie[]
  setAll: (cookiesToSet: Cookie[]) => void
}

// تخزين داخلي للكوكيز
const cookieStore = new Map<string, { value: string; options?: Cookie['options'] }>()

export const cookieMethods: CookieMethodsServer = {
  getAll: () => {
    const all: Cookie[] = []
    cookieStore.forEach((v, k) => {
      all.push({ name: k, value: v.value, options: v.options })
    })
    return all
  },

  setAll: (cookiesToSet: Cookie[]) => {
    try {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, { value, options })
      })
    } catch (err) {
      console.error('Error setting cookies:', err)
    }
  }
}

// إنشاء عميل Supabase
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    // تمرير الكوكيز لضمان عمل الجلسات في السيرفر
    global: {
      headers: {
        cookie: cookieMethods.getAll()
          .map(c => `${c.name}=${c.value}`)
          .join('; ')
      }
    }
  }
)