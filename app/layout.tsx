// app/layout.tsx
import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
})

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'FinanceTracker — إدارة شؤونك المالية',
  description: 'تتبع دخلك، مصاريفك، ديونك واستثماراتك في مكان واحد',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-cairo antialiased`}>
        {children}
      </body>
    </html>
  )
}
