import type { Metadata } from 'next'
import { NotFoundClient } from './not-found-client'

export const metadata: Metadata = {
  title: '404',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: null,
  },
}

export default function NotFound() {
  return <NotFoundClient />
}