import { NextResponse } from 'next/server'

export async function GET() {
  throw new Error('Sentry test error - يمكن حذف هذا الملف')
  return NextResponse.json({ ok: true })
}
