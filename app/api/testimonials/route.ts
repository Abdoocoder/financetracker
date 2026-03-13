import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, name, country, role, stars, text } = await req.json()

    if (!user_id || !name || !text || !stars) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (text.length < 20) {
      return NextResponse.json({ error: 'Review too short' }, { status: 400 })
    }

    // تحقق إذا المستخدم عنده شهادة موجودة
    const { data: existing } = await supabase
      .from('testimonials')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (existing) {
      // تحديث الشهادة الموجودة
      const { error } = await supabase
        .from('testimonials')
        .update({ name, country, role, stars, text, is_visible: false })
        .eq('user_id', user_id)

      if (error) throw error
      return NextResponse.json({ success: true, updated: true })
    }

    // إضافة شهادة جديدة
    const { error } = await supabase
      .from('testimonials')
      .insert({ user_id, name, country, role, stars, text, is_visible: false })

    if (error) throw error
    return NextResponse.json({ success: true, updated: false })
  } catch (err) {
    console.error('Testimonial error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  if (!user_id) return NextResponse.json(null)

  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('user_id', user_id)
    .single()

  return NextResponse.json(data ?? null)
}
