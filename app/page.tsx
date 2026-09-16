import { createClient } from '@/lib/supabase/server'
import LandingPageClient from '@/components/landing/LandingPageClient'
import JsonLd from '@/components/seo/JsonLd'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_visible', true)
    .order('created_at')

  return (
    <>
      <JsonLd />
      <LandingPageClient testimonialsList={testimonials || []} />
    </>
  )
}
