// app/layout.tsx
import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'

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
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.setAttribute('data-theme',t||(d?'dark':'light'));})()` }} />
      </head>
      <body suppressHydrationWarning className={`${cairo.variable} font-cairo antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' });
              if (/android/i.test(navigator.userAgent)) {
                navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
              }
            });
          }
        ` }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
