import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', direction: 'rtl', fontFamily: 'inherit', overflowX: 'hidden' }}>

      {/* ── Ambient background ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,126,246,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)' }} />
      </div>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', background: 'rgba(10,12,18,0.8)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 16 }}>ف</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>FinanceTracker</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ padding: '8px 18px', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'color 0.15s' }}>
              تسجيل الدخول
            </Link>
            <Link href="/register" style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--accent-blue)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.15s' }}>
              ابدأ مجاناً →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(59,126,246,0.08)', border: '1px solid rgba(59,126,246,0.2)', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue-light)' }}>متاح لجميع دول العالم</span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
          تحكم في أموالك،<br />
          <span style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            حقق حريتك المالية
          </span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
          تتبع دخلك ومصاريفك، سدد ديونك بخطة ذكية، وراقب استثماراتك — كل ذلك في تطبيق واحد مع تنبيهات يومية تبقيك على المسار الصحيح.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            padding: '14px 32px', borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
            color: 'white', fontSize: 16, fontWeight: 800,
            textDecoration: 'none', letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(59,126,246,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            ابدأ مجاناً الآن — بدون بطاقة
          </Link>
          <Link href="/login" style={{
            padding: '14px 24px', borderRadius: 14,
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600,
            textDecoration: 'none',
          }}>
            لدي حساب
          </Link>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>🚀 جديد — كن من أوائل المستخدمين وشكّل تجربتك</span>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{
          borderRadius: 24, border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          background: 'var(--bg-card)',
        }}>
          {/* Fake browser bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--bg-elevated)', maxWidth: 300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>financetracker.app/dashboard</span>
            </div>
          </div>
          {/* Mock dashboard */}
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
            {/* Mini chart bars */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>الإيرادات والمصروفات</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                {[
                  { i: 40, e: 30 }, { i: 55, e: 45 }, { i: 35, e: 50 },
                  { i: 70, e: 40 }, { i: 60, e: 35 }, { i: 85, e: 50 },
                ].map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
                    <div style={{ flex: 1, height: `${d.i}%`, background: '#10B981', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
                    <div style={{ flex: 1, height: `${d.e}%`, background: '#EF4444', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            كل ما تحتاجه في مكان واحد
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
            أدوات مالية احترافية مصممة خصيصاً للمستخدم العربي
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              icon: '📊', title: 'ميزانية ذكية',
              desc: 'تتبع كل دينار دخلاً ومصروفاً. رسوم بيانية واضحة تريك وين يذهب مالك.',
              color: 'var(--accent-blue)', bg: 'rgba(59,126,246,0.06)', border: 'rgba(59,126,246,0.15)',
            },
            {
              icon: '💳', title: 'خطة سداد الديون',
              desc: 'رتّب ديونك وتتبع الدفعات. خطة سداد واضحة تريك كم تبقى حتى تتحرر من الديون.',
              color: 'var(--accent-red-light)', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)',
            },
            {
              icon: '📈', title: 'تتبع الاستثمارات',
              desc: 'راقب محفظتك من أسهم وعملات رقمية. أرباح وخسائر لحظية بأسعار حية.',
              color: 'var(--accent-green-light)', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)',
            },
            {
              icon: '🎯', title: 'أهداف الادخار',
              desc: 'حدد هدفاً مالياً وتتبع تقدمك شهراً بشهر حتى تصل.',
              color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)',
            },
            {
              icon: '🔔', title: 'تنبيهات ذكية يومية',
              desc: 'تحليل تلقائي كل يوم — تحذير عند الإسراف، وتحفيز عند الادخار.',
              color: '#8B5CF6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)',
            },
            {
              icon: '💰', title: 'راتب تلقائي',
              desc: 'حدد يوم استلام راتبك وسيُضاف تلقائياً كل شهر بدون أي جهد منك.',
              color: 'var(--accent-green-light)', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)',
            },
          ].map((f, i) => (
            <div key={i} style={{
              padding: 24, borderRadius: 20,
              background: f.bg, border: `1px solid ${f.border}`,
              transition: 'transform 0.2s, border-color 0.2s',
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto 100px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            بسيط وشفاف
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>ابدأ مجاناً، وطوّر عندما تحتاج</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Free */}
          <div style={{ padding: 28, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>مجاني</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>للأبد</div>
            {['المعاملات الأساسية', 'تتبع الديون', 'أهداف الادخار', 'تنبيهات يومية', 'راتب تلقائي'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
            <Link href="/register" style={{
              display: 'block', textAlign: 'center', marginTop: 24,
              padding: '12px', borderRadius: 12,
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}>
              ابدأ مجاناً
            </Link>
          </div>

          {/* Pro */}
          <div style={{
            padding: 28, borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(59,126,246,0.12), rgba(16,185,129,0.08))',
            border: '1px solid rgba(59,126,246,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 16, left: 16, padding: '4px 10px', borderRadius: 100, background: 'var(--accent-blue)', color: 'white', fontSize: 11, fontWeight: 800 }}>الأكثر شيوعاً</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue-light)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pro</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>$4.99</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>شهرياً</div>
            {['كل ميزات المجاني', 'إشعارات Push', 'أسعار أسهم حية', 'دعم أولوية', '⏳ تصدير PDF — قادم قريباً', '⏳ تقارير متقدمة — قادم قريباً'].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
            <Link href="/register" style={{
              display: 'block', textAlign: 'center', marginTop: 24,
              padding: '12px', borderRadius: 12,
              background: 'var(--accent-blue)', color: 'white',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(59,126,246,0.3)',
            }}>
              جرّب Pro مجاناً 14 يوم
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto 100px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 40, letterSpacing: '-0.02em' }}>أسئلة شائعة</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { q: 'هل بياناتي آمنة؟', a: 'نعم. كل بيانات المستخدم محمية بـ Row Level Security — لا يمكن لأي مستخدم رؤية بيانات غيره.' },
            { q: 'ما العملات المدعومة؟', a: 'ندعم الدينار الأردني، الريال السعودي، الدرهم الإماراتي، والدولار الأمريكي. المزيد قادم.' },
            { q: 'هل يعمل على الموبايل؟', a: 'نعم! التطبيق PWA يعمل على كل الأجهزة وكأنه تطبيق موبايل أصيل مع إشعارات Push.' },
            { q: 'كيف يعمل الراتب التلقائي؟', a: 'تحدد راتبك ويوم استلامه في الإعدادات، وسيُضاف تلقائياً كمعاملة دخل كل شهر.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{item.q}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto 80px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ padding: '56px 40px', borderRadius: 28, background: 'linear-gradient(135deg, rgba(59,126,246,0.1), rgba(16,185,129,0.07))', border: '1px solid rgba(59,126,246,0.2)' }}>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            ابدأ رحلتك المالية اليوم
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
            ابدأ اليوم وتحكم في أموالك — مجاناً وبدون أي التزامات
          </p>
          <Link href="/register" style={{
            display: 'inline-block', padding: '15px 40px', borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent-blue), #2563eb)',
            color: 'white', fontSize: 16, fontWeight: 800,
            textDecoration: 'none', letterSpacing: '-0.01em',
            boxShadow: '0 8px 32px rgba(59,126,246,0.4)',
          }}>
            أنشئ حسابك المجاني →
          </Link>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>لا بطاقة ائتمانية • بدون التزامات</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 13 }}>ف</div>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>FinanceTracker</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          © {new Date().getFullYear()} FinanceTracker — إدارة مالية ذكية للعالم العربي
        </p>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
