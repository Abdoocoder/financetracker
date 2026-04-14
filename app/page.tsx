import { createClient } from '@/lib/supabase/server'
import LandingPageClient from '@/components/landing/LandingPageClient'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_visible', true)
    .order('created_at')

  return <LandingPageClient testimonialsList={testimonials || []} />
}
