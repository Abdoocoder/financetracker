import { UserProvider } from '@/lib/user-context'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const alertsCount = 0
  return (
    <UserProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Sidebar alertsCount={alertsCount} />
        <main style={{ flex: 1, padding: '24px 20px', paddingBottom: '90px', maxWidth: '100%', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </UserProvider>
  )
}
