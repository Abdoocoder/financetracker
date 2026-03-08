// app/page.tsx
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-blue flex items-center justify-center text-white font-bold text-sm">ف</div>
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>FinanceTracker</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
            تسجيل الدخول
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm rounded-lg gradient-blue text-white font-medium hover:opacity-90 transition-opacity">
            ابدأ مجاناً
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ background: 'rgba(79,142,247,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(79,142,247,0.2)' }}>
          ✨ إدارة مالية ذكية باللغة العربية
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
          تحكم في مالك،<br />
          <span style={{ color: 'var(--accent-blue)' }}>حقق أهدافك</span>
        </h1>
        <p className="text-lg mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          تتبع دخلك ومصاريفك، سدد ديونك بخطة ذكية، وراقب استثماراتك — مع تنبيهات يومية تحفزك على الالتزام
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="px-8 py-3.5 rounded-xl gradient-blue text-white font-semibold text-lg hover:opacity-90 transition-all hover:scale-105">
            ابدأ مجاناً الآن →
          </Link>
          <Link href="/login" className="px-8 py-3.5 rounded-xl text-base font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            لدي حساب
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-8 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📊', title: 'ميزانية شهرية', desc: 'تتبع كل دينار دخلاً ومصروفاً', color: 'var(--accent-blue)' },
          { icon: '💳', title: 'خطة سداد الديون', desc: 'رتّب ديونك وتخلص منها بذكاء', color: 'var(--accent-red)' },
          { icon: '📈', title: 'تتبع الاستثمار', desc: 'SPUS وBTC وكل محفظتك في مكان واحد', color: 'var(--accent-green)' },
          { icon: '🔔', title: 'تنبيهات ذكية', desc: 'تحفيز وتحذير يومي وأسبوعي وشهري', color: 'var(--accent-yellow)' },
        ].map((f, i) => (
          <div key={i} className="p-6 rounded-2xl border transition-all hover:border-opacity-50"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
