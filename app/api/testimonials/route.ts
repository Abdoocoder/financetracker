import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { name, country, role, stars, text } = await req.json()

    if (!name || !text || !stars) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (text.length < 20) {
      return NextResponse.json({ error: 'Review too short' }, { status: 400 })
    }

    const user_id = user.id

    // تحقق إذا المستخدم عنده شهادة موجودة
    const { data: existing } = await supabase
      .from('testimonials')
      .select('id')
      .eq('user_id', user_id)
      .single()

    if (existing) {
      // تحديث الشهادة الموجودة
      const { error: updateError } = await supabase
        .from('testimonials')
        .update({ name, country, role, stars, text, is_visible: false })
        .eq('user_id', user_id)

      if (updateError) throw updateError
      return NextResponse.json({ success: true, updated: true })
    }

    // إضافة شهادة جديدة
    const { error: insertError } = await supabase
      .from('testimonials')
      .insert({ user_id, name, country, role, stars, text, is_visible: false })

    if (insertError) throw insertError
    return NextResponse.json({ success: true, updated: false })
  } catch (err) {
    console.error('Testimonial error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  if (!user_id) return NextResponse.json(null)

  // If requester is the same user (via access token), allow returning their own testimonial (even if hidden).
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user?.id === user_id) {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('user_id', user_id)
        .single()
      return NextResponse.json(data ?? null)
    }
  }

  // Public read: return only visible testimonials and only safe fields.
  const { data } = await supabase
    .from('testimonials')
    .select('id,name,country,role,stars,text,created_at')
    .eq('user_id', user_id)
    .eq('is_visible', true)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}
