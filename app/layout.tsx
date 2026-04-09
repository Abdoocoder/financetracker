// app/layout.tsx
import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'
import QueryProvider from '@/components/providers/QueryProvider'
import { SpeedInsights } from "@vercel/speed-insights/next"

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'optional',
})

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'فجرك',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'theme-color': '#070B14',
  },
  title: 'فجرك — إدارة شؤونك المالية',
  description: 'تتبع دخلك، مصاريفك، ديونك واستثماراتك في مكان واحد',
  icons: { icon: '/icon-512.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){
          var saved = localStorage.getItem('theme');
          var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var initial = (saved === 'dark' || (saved === 'system' && systemDark) || (!saved && systemDark)) ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', initial);
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
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
