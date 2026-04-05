import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LandingClient from '@/components/layout/LandingClient'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_visible', true)
    .order('created_at')

  const testimonialsList = testimonials || []

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', direction: 'rtl', fontFamily: 'inherit', overflowX: 'hidden' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
      </div>

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.8)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon-512.png" style={{ width: 36, height: 36, borderRadius: 10 }} alt="فجرك" />
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>فجرك</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ padding: '8px 18px', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>تسجيل الدخول</Link>
            <Link href="/register" style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>ابدأ ←</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: 'clamp(60px, 10vw, 100px) 20px clamp(40px, 8vw, 80px)', textAlign: 'center' }}>
        {/* الـ badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 36 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D' }}>🇯🇴🇸🇦🇦🇪 أول أداة مالية عربية بالكامل</span>
        </div>

        {/* السطر التشويقي */}
        <div className="hero-line-1" style={{ fontSize: 'clamp(15px, 3vw, 19px)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.01em' }}>
          كل شهر نفس السؤال...
        </div>

        {/* العنوان الرئيسي */}
        <h1 className="hero-line-2" style={{ fontSize: 'clamp(36px, 8vw, 76px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 6px', letterSpacing: '-0.04em' }}>
          <span style={{ background: 'linear-gradient(135deg, #F59E0B 20%, #FBBF24 50%, #10B981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            وين راح الراتب؟
          </span>
        </h1>

        {/* الجواب */}
        <div className="hero-line-3" style={{ fontSize: 'clamp(16px, 3.5vw, 22px)', color: 'var(--text-secondary)', fontWeight: 700, margin: '10px 0 28px', letterSpacing: '-0.01em' }}>
          <span style={{ color: '#10B981' }}>فجرك</span> عنده الجواب — بالأرقام لا بالتخمين 🌅
        </div>

        <p className="hero-line-4" style={{ fontSize: 'clamp(14px, 3.5vw, 17px)', color: 'var(--text-muted)', lineHeight: 1.8, maxWidth: 480, margin: '0 auto 32px' }}>
          اعرف أين يذهب كل دينار · خطط لسداد ديونك · راقب استثماراتك · وحقق حريتك المالية — كل ذلك في مكان واحد.
        </p>
        <div className="hero-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: 400, margin: '0 auto' }}>
          <Link href="/register" style={{ flex: 1, minWidth: 160, padding: '13px 20px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 15, fontWeight: 900, textDecoration: 'none', textAlign: 'center' as const, boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}>ابدأ مجاناً ←</Link>
          <a href="#features" style={{ flex: 1, minWidth: 120, padding: '13px 20px', borderRadius: 14, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' as const }}>شاهد كيف يعمل ↓</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          {['✓ مجاني للأبد', '✓ بدون بطاقة ائتمانية', '✓ يدعم الاستثمار الحلال'].map((t, i) => (
            <span key={i} style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>🇯🇴🇸🇦🇦🇪🇪🇬🇲🇦🇰🇼🇶🇦🇧🇭 مصمم للعالم العربي</div>

        <div style={{ marginTop: 28 }}>
          <Link href="/download" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            📱 تحميل تطبيق Android — متاح الآن ✨
          </Link>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', background: 'var(--bg-card)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--bg-elevated)', maxWidth: 300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>fajrak.com/dashboard</span>
            </div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>لوحة التحكم</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ملخص هذا الشهر</div>
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 12, fontWeight: 700 }}>🔔 3</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'الدخل', value: '+2,400', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { label: 'المصاريف', value: '1,250', color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
                { label: 'الصافي', value: '+1,150', color: '#3B7EF6', bg: 'rgba(59,126,246,0.08)' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: `1px solid ${s.color}22` }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* خارطة الثراء - Preview */}
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(16,185,129,0.05))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>🗺️ خارطة الثراء</div>
                <div style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>المرحلة 2: سداد الديون</div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['طوارئ', 'ديون', 'استثمار', 'ثروة'].map((stage, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= 1 ? (i === 1 ? '#F59E0B' : '#10B981') : 'var(--bg-elevated)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>72<span style={{ fontSize: 14 }}>/100</span></div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>الخطوة التالية</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>سدّد أصغر دين أولاً 🎯</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>الإيرادات والمصروفات</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                {[{i:40,e:30},{i:55,e:45},{i:35,e:50},{i:70,e:40},{i:60,e:35},{i:80,e:55}].map((bar, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '45%', height: `${bar.i}%`, background: 'rgba(16,185,129,0.6)', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: '45%', height: `${bar.e}%`, background: 'rgba(239,68,68,0.5)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* المشكلة */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-blue-light)', textTransform: 'uppercase', marginBottom: 12 }}>المشكلة</div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>تعبت من هذا كله؟</h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>معظم الناس يتنقلون بين ٣-٤ تطبيقات وأوراق لفهم وضعهم المالي</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { icon: '📱', title: 'تطبيق البنك + تطبيق الاستثمار + Excel', desc: 'تفتح ٣ تطبيقات وتحسب يدوياً كل مرة تريد تعرف وين وقف وضعك.' },
            { icon: '💸', title: 'الأقساط تفاجئك', desc: 'قسط السيارة، قرض البنك، دين صديق — كلها تجي في نفس الوقت وأنت ما حاسب.' },
            { icon: '🌍', title: 'التطبيقات العالمية ما تفهمك', desc: 'YNAB وMint مبنيين للسوق الأمريكي — ما يدعمون الريال ولا الدينار.' },
            { icon: '🎯', title: 'تحفظ لكن ما تعرف إذا وصلت', desc: 'عندك هدف في بالك لكن ما في مكان تتابع تقدمك بشكل واضح.' },
          ].map((p, i) => (
            <div key={i} style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 14, left: 14, fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 10px', borderRadius: 100 }}>محلول ✓</div>
              <div style={{ fontSize: 24, marginBottom: 12, marginTop: 8 }}>{p.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>


      {/* رحلة الحرية المالية */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#F59E0B', textTransform: 'uppercase', marginBottom: 12 }}>رحلتك</div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            أين أنت الآن؟<br />
            <span style={{ background: 'linear-gradient(135deg, #F59E0B, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>وإلى أين تريد أن تصل؟</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
            فجرك يحدد مرحلتك المالية الحقيقية ويمشي معك خطوة بخطوة حتى تصل لليد العليا
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { num: '01', icon: '🌱', stage: 'الوعي المالي', desc: 'تعرف أين يذهب راتبك. تسجل مصاريفك. تفهم وضعك الحقيقي.', quote: '"ما لا يُقاس لا يُحسَّن"', color: '#8B5CF6', active: false },
            { num: '02', icon: '💳', stage: 'سداد الديون', desc: 'خطة سداد واضحة. خصم تلقائي شهري. احتفال عند كل دين تسدده.', quote: '"اقضِ دينك وارتح"', color: '#EF4444', active: false },
            { num: '03', icon: '🛡️', stage: 'صندوق الطوارئ', desc: 'ثلاثة أشهر من الأمان. درع ضد المفاجآت. نوم هادئ كل ليلة.', quote: '"تَصَدَّقُوا وَلَوْ بِشِقِّ تَمْرَةٍ"', color: '#F59E0B', active: false },
            { num: '04', icon: '📈', stage: 'الاستثمار', desc: 'أسهم حلال. عملات رقمية. محفظة تنمو وأنت نائم.', quote: '"وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ"', color: '#10B981', active: false },
            { num: '05', icon: '👑', stage: 'الحرية المالية', desc: 'اليد العليا. تعطي ولا تحتاج. تساعد عائلتك وتتصدق بيسر.', quote: '"اليد العليا خير من اليد السفلى"', color: '#3B7EF6', active: true },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, padding: '20px 24px', borderRadius: 16,
              background: step.active ? 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))' : 'var(--bg-card)',
              border: `1px solid ${step.active ? 'rgba(59,126,246,0.3)' : 'var(--border)'}`,
              alignItems: 'flex-start',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: `${step.color}15`, border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: step.color, background: `${step.color}15`, padding: '2px 8px', borderRadius: 100 }}>{step.num}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>{step.stage}</span>
                  {step.active && <span style={{ fontSize: 10, fontWeight: 700, color: '#3B7EF6', background: 'rgba(59,126,246,0.1)', padding: '2px 8px', borderRadius: 100 }}>🎯 الهدف النهائي</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{step.desc}</div>
                <div style={{ fontSize: 11, color: step.color, fontStyle: 'italic', opacity: 0.8 }}>{step.quote}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 15, fontWeight: 900, textDecoration: 'none', boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }}>
            ابدأ رحلتك اليوم ←
          </a>
        </div>
      </section>

      {/* الميزات - محدّث */}
      <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent-blue-light)', textTransform: 'uppercase', marginBottom: 12 }}>الميزات</div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>كل ما تحتاجه في مكان واحد</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { icon: '🗺️', title: 'خارطة الثراء', desc: 'اكتشف مرحلتك المالية الحقيقية واحصل على نقاط صحة مالية مع خطة واضحة للوصول للحرية المالية.', badge: 'أساسي', badgeColor: '#3B7EF6' },
            { icon: '🎮', title: 'رحلة الثروة', desc: 'نقاط، مستويات، شارات، وسلسلة يومية — كل معاملة تقربك خطوة نحو الحرية المالية.', badge: 'جديد', badgeColor: '#8B5CF6' },
            { icon: '📊', title: 'مستشار مالي ذكي', desc: 'قاعدة 50/30/20 تلقائية + تحليل ذكي يوجهك لأفضل توزيع لدخلك.', badge: 'جديد', badgeColor: '#10B981' },
            { icon: '💡', title: 'توجيه بناء الثروة', desc: 'نصيحة مالية شخصية يومية بناءً على وضعك الفعلي — ديون، استثمار، أو ادخار.', badge: 'جديد', badgeColor: '#F59E0B' },
            { icon: '💳', title: 'خطة سداد الديون', desc: 'رتّب ديونك وتتبع الدفعات مع خصم تلقائي شهري. واعرف متى ستكون حراً منها بالضبط.' },
            { icon: '📈', title: 'تتبع الاستثمارات', desc: 'راقب محفظتك من أسهم وعملات رقمية. أرباح وخسائر لحظية بأسعار حية مع دعم الاستثمار الحلال.' },
            { icon: '💎', title: 'الأصول الشخصية', desc: 'سجّل عقاراتك ومركباتك وذهبك واعرف صافي ثروتك الحقيقية مباشرة في خارطة الثراء.' },
            { icon: '🏆', title: 'تحديات الادخار', desc: 'تحديات أسبوعية وشهرية تتبعها تلقائياً من معاملاتك — بدون أي إدخال يدوي.' },
            { icon: '🎓', title: 'دروس يومية ذكية', desc: 'درس مالي يومي مخصص لمرحلتك — مبني على أبحاث علم السلوك المالي. من الوعي حتى الحرية المالية.', badge: 'جديد', badgeColor: '#8B5CF6' },
            { icon: '🔔', title: 'تنبيهات ذكية', desc: 'تقرير أسبوعي، تذكير مسائي، وتوجيه يومي — مع سياسة ذكية تمنع الإشعارات المزعجة.' },
            { icon: '🌐', title: 'عربي + English', desc: 'واجهة كاملة باللغتين العربية والإنجليزية مع دعم RTL احترافي.' },
            { icon: '🔥', title: 'حاسبة FIRE', desc: 'احسب متى تحقق حريتك المالية — أوضاع Lean/Full/Fat FIRE مع محاكاة الفائدة المركبة ومتزلجات تفاعلية.', badge: 'جديد', badgeColor: '#EF4444' },
            { icon: '🌙', title: 'حاسبة الزكاة', desc: 'ملء تلقائي من بياناتك الحقيقية. عداد حول لكل استثمار مع تذكيرات Push قبل 30 و7 و0 يوم.', badge: 'جديد', badgeColor: '#10B981' },
            { icon: '📊', title: 'تاريخ الصحة المالية', desc: 'رسم بياني لتطور نقاط صحتك المالية خلال 30 يوماً — اكتشف الاتجاه الصاعد في رحلتك.', badge: 'جديد', badgeColor: '#8B5CF6' },
            { icon: '📄', title: 'تقرير PDF الشهري', desc: 'طباعة ملخص مالي شهري شامل: الدخل، المصاريف، الفئات، الديون، والأهداف — جاهز للطباعة بلحظة.', badge: 'جديد', badgeColor: '#F59E0B' },
          ].map((f, i) => (
            <div key={i} style={{ padding: 24, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', position: 'relative' }}>
              {f.badge && (
                <div style={{ position: 'absolute', top: 14, left: 14, padding: '3px 10px', borderRadius: 100, background: `${f.badgeColor}22`, border: `1px solid ${f.badgeColor}44`, fontSize: 11, fontWeight: 700, color: f.badgeColor }}>{f.badge}</div>
              )}
              <div style={{ fontSize: 28, marginBottom: 14, marginTop: f.badge ? 8 : 0 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* خارطة الثراء - قسم مستقل */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ borderRadius: 24, background: 'linear-gradient(135deg, rgba(59,126,246,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(59,126,246,0.2)', padding: 'clamp(32px, 5vw, 56px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59,126,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🗺️</div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: 'rgba(59,126,246,0.1)', border: '1px solid rgba(59,126,246,0.25)', fontSize: 11, fontWeight: 700, color: 'var(--accent-blue-light)', marginBottom: 6 }}>✨ ميزة حصرية جديدة</div>
              <h3 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>خارطة الثراء</h3>
            </div>
          </div>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32, maxWidth: 600 }}>
            مش بس تتبع المصاريف — احصل على صورة كاملة عن صحتك المالية مع خطة واضحة لبناء ثروتك خطوة بخطوة.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[
              { icon: '🎯', title: 'مرحلتك المالية', desc: 'طوارئ → ديون → استثمار → ثروة' },
              { icon: '💯', title: 'نقاط الصحة المالية', desc: 'درجة من 100 تعكس وضعك الحقيقي' },
              { icon: '💪', title: 'نقاط قوتك', desc: 'اكتشف ما تفعله صح في حياتك المالية' },
              { icon: '👣', title: 'الخطوة التالية', desc: 'توصية عملية واحدة واضحة وقابلة للتطبيق' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      {/* شهادات المستخدمين */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>ماذا يقول المستخدمون؟</h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>آراء حقيقية من مستخدمين في العالم العربي</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {testimonialsList.map((t, i) => (
            <div key={i} style={{ padding: 24, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array(t.stars).fill(0).map((_, s) => (
                  <span key={s} style={{ color: '#F59E0B', fontSize: 14 }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, flex: 1 }}>{t.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: 'white' }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{t.name} {t.country}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* الأسعار */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>بسيط وشفاف</h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>ابدأ مجاناً، وطوّر عندما تحتاج</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: 28, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>مجاني</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>للأبد</div>
            {['المعاملات الأساسية', 'تتبع الديون', 'أهداف الادخار', 'خارطة الثراء 🗺️', 'رحلة الثروة 🎮', 'مستشار مالي 🤖', 'الأصول الشخصية 💎', 'تحديات الادخار 🏆', 'توجيه يومي 💡', 'تنبيهات ذكية 🔔', 'راتب تلقائي', 'حاسبة FIRE 🔥', 'حاسبة الزكاة 🌙', 'تاريخ الصحة المالية 📊', 'تقرير PDF الشهري 📄'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
            <Link href="/register" style={{ display: 'block', textAlign: 'center', marginTop: 24, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>ابدأ مجاناً</Link>
          </div>
          <div style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, rgba(59,126,246,0.06), rgba(139,92,246,0.06))', border: '1px solid rgba(59,126,246,0.2)', position: 'relative', overflow: 'hidden', opacity: 0.85 }}>
            <div style={{ position: 'absolute', top: 16, left: 16, padding: '4px 10px', borderRadius: 100, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)', fontSize: 11, fontWeight: 800 }}>قريباً</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>قريباً</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>نعمل عليها الآن</div>
            {[
              '🤖 مستشار مالي بالذكاء الاصطناعي',
              '📸 OCR — مسح الفواتير تلقائياً',
              '📊 تقارير متقدمة ورسوم تفصيلية',
              '🔔 إشعارات Push مخصصة',
              '🔗 ربط حسابات بنكية',
              '⭐ دعم أولوية',
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#A78BFA', fontSize: 14 }}>◇</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{f}</span>
              </div>
            ))}
            <div style={{ marginTop: 24, padding: '14px', borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#A78BFA', fontWeight: 900, marginBottom: 6 }}>🎁 عرض خاص لأول 100 مشترك</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>خصم 50% مدى الحياة — فقط لمن يسجّل مبكراً</div>
              <Link href="/register" style={{ display: 'block', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', color: 'white', fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
                سجّل الآن واحجز مكانك ←
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* أسئلة شائعة */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto 100px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 40, letterSpacing: '-0.02em' }}>أسئلة شائعة</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { q: 'هل بياناتي آمنة؟', a: 'نعم. كل بيانات المستخدم محمية بـ Row Level Security — لا يمكن لأي مستخدم رؤية بيانات غيره.' },
            { q: 'ما العملات المدعومة؟', a: 'ندعم الدينار الأردني، الريال السعودي، الدرهم الإماراتي، والدولار الأمريكي. المزيد قادم.' },
            { q: 'هل يعمل على الموبايل؟', a: 'نعم! التطبيق PWA يعمل على كل الأجهزة وكأنه تطبيق موبايل أصيل مع إشعارات Push.' },
            { q: 'كيف تعمل خارطة الثراء؟', a: 'تحلّل خارطة الثراء وضعك المالي تلقائياً وتعطيك نقاط صحة مالية من 100 مع تحديد مرحلتك وأولويات خطواتك القادمة.' },
            { q: 'ما هو نظام رحلة الثروة؟', a: 'نظام نقاط وشارات ومستويات يحوّل إدارة مالك إلى رحلة ممتعة — كل معاملة تسجّلها تكسبك نقاطاً وتقربك من الحرية المالية.' },
            { q: 'كيف يعمل الراتب التلقائي؟', a: 'تحدد راتبك ويوم استلامه في الإعدادات، وسيُضاف تلقائياً كمعاملة دخل كل شهر.' },
            { q: 'كيف تعمل حاسبة الزكاة؟', a: 'تجلب حاسبة الزكاة بياناتك الفعلية تلقائياً: مدخراتك كنقد، استثماراتك بالسعر الحالي، وديونك كخصوم. كما تعرض عداد حول لكل استثمار وترسل إشعارات قبل 30 و7 و0 يوم من موعد الزكاة.' },
            { q: 'ما هي حاسبة FIRE؟', a: 'FIRE اختصار لـ Financial Independence, Retire Early. الحاسبة تحسب رقم الحرية المالية الخاص بك بناءً على مصاريفك، وتمحي لك الوقت المتبقي للوصول إليه مع محاكاة الفائدة المركبة.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{item.q}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ padding: '56px 40px', borderRadius: 28, background: 'linear-gradient(135deg, rgba(59,126,246,0.1), rgba(16,185,129,0.07))', border: '1px solid rgba(59,126,246,0.2)' }}>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>وضعك المالي يستحق أكثر من Excel 💡</h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>ابدأ مجاناً الآن وشوف أين يذهب راتبك خلال دقيقتين</p>
          <Link href="/register" style={{ display: 'inline-block', padding: '16px 44px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontSize: 17, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 40px rgba(245,158,11,0.45), 0 4px 20px rgba(0,0,0,0.3)' }}>جرّب مجاناً — لا بطاقة مطلوبة ✓</Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
            {['✓ مجاني للأبد', '✓ بدون بطاقة', '✓ 30 ثانية للتسجيل'].map((t, i) => (
              <span key={i} style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── قسم الرؤية ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.06), rgba(16,185,129,0.04))', border: '1px solid rgba(59,126,246,0.15)', borderRadius: 24, padding: 'clamp(32px, 6vw, 56px)' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🌅</div>
          <h2 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 20, letterSpacing: '-0.02em' }}>
            لماذا بنينا هذا التطبيق؟
          </h2>
          <p style={{ fontSize: 'clamp(15px, 3vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 28, maxWidth: 600, margin: '0 auto 28px' }}>
            رؤيتنا أن يكون كل إنسان على دراية كاملة بوضعه المالي، ويملك خطة واضحة للتحسين — بغض النظر عن دخله أو مستواه — حتى ينجح في تحقيق حريته المالية.
          </p>
          <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
            {[
              { icon: '🕌', title: 'مستلهم من الإسلام', desc: 'السعي والعمل والقناعة' },
              { icon: '🎓', title: 'يُعلّم لا يتتبع فقط', desc: 'درس يومي يغير تفكيرك' },
              { icon: '🔒', title: 'بياناتك لك وحدك', desc: 'أمان كامل بدون استثناء' },
              { icon: '🆓', title: 'مجاني للأبد', desc: 'الوعي المالي حق للجميع' },
            ].map((v, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '28px 0' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            &quot;كل رحلة ثراء تبدأ بخطوة&quot; — بُني بـ ❤️ من الأردن للعالم العربي
          </p>
        </div>
      </section>

      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '32px 24px 100px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <img src="/icon-512.png" style={{ width: 28, height: 28, borderRadius: 8 }} alt="فجرك" />
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>فجرك</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>© {new Date().getFullYear()} فجرك — إدارة مالية ذكية للعالم العربي</p>
      </footer>

      <LandingClient />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-line-1 { animation: fadeUp 0.6s ease both; }
        .hero-line-2 { animation: fadeUp 0.6s ease 0.25s both; }
        .hero-line-3 { animation: fadeUp 0.6s ease 0.5s both; }
        .hero-line-4 { animation: fadeUp 0.6s ease 0.75s both; }
        .hero-cta    { animation: fadeUp 0.6s ease 1s both; }
      `}</style>
    </div>
  )
}
