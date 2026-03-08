// components/layout/Header.tsx
import type { Profile } from '@/types'

export default function Header({ profile }: { profile: Profile | null }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور'
  const dateStr = now.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b shrink-0"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <div>
        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
          {greeting}، {profile?.full_name?.split(' ')[0] ?? 'أهلاً'} 👋
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{dateStr}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>الراتب الشهري</div>
          <div className="text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
            {profile?.monthly_income?.toFixed(2) ?? '0.00'} {profile?.currency ?? 'JOD'}
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center text-white font-bold text-sm">
          {profile?.full_name?.charAt(0) ?? 'م'}
        </div>
      </div>
    </header>
  )
}
