import { cn } from '@/lib/utils'

export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'var(--bg-tertiary, rgba(255,255,255,0.06))', ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-2 w-full" />
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1,2,3].map(i => (
        <div key={i} className="card p-3 text-center space-y-2">
          <Skeleton className="h-6 w-16 mx-auto" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>
      <StatsSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}
