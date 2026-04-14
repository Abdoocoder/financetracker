// app/layout.tsx
import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import QueryProvider from '@/components/providers/QueryProvider'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { I18nProvider } from '@/lib/i18n'
import { UserProvider } from '@/lib/user-context'
import { getServerTranslation, getServerLang } from '@/lib/i18n-server'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'optional',
})

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation()
  
  return {
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: t('land_app_name'),
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'theme-color': '#070B14',
    },
    title: t('meta_title'),
    description: t('meta_desc'),
    icons: { icon: '/icon-512.png' },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang()
  
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){
          var saved = localStorage.getItem('theme');
          var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var initial = (saved === 'dark' || (saved === 'system' && systemDark) || (!saved && systemDark)) ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', initial);
          
          // Hydrate lang and dir early to prevent jump
          var savedLang = localStorage.getItem('lang');
          if (savedLang === 'en' || (!savedLang && navigator.language.startsWith('en'))) {
            document.documentElement.lang = 'en';
            document.documentElement.dir = 'ltr';
          } else {
            document.documentElement.lang = 'ar';
            document.documentElement.dir = 'rtl';
          }
        })()` }} />
      </head>
      <body suppressHydrationWarning className={`${cairo.variable} font-cairo antialiased`}>
        <script dangerouslySetInnerHTML={{
          __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(err) {
                console.error('Service worker registration failed:', err);
              });
              if (/android/i.test(navigator.userAgent)) {
                navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' }).catch(function(err) {
                  console.error('Firebase SW registration failed:', err);
                });
              }
            });
          }
        ` }} />
        <QueryProvider>
          <UserProvider>
            <I18nProvider>
              <ThemeProvider>{children}</ThemeProvider>
            </I18nProvider>
          </UserProvider>
        </QueryProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
