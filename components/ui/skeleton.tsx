export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={style}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-static p-4 flex items-center gap-4">
          <Skeleton className="w-12 h-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/4 rounded-md" />
            <Skeleton className="h-5 w-1/2 rounded-lg" />
          </div>
          <Skeleton className="w-6 h-6 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="card-static p-4 space-y-2 flex flex-col items-center">
          <Skeleton className="h-8 w-8 mx-auto rounded-xl" />
          <Skeleton className="h-5 w-16 mx-auto rounded-lg" />
          <Skeleton className="h-3 w-12 mx-auto rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="card-static p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-32 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-2xl" />
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-3 w-10 rounded-md" />
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-24 rounded-2xl" />
      </div>
      <StatsSkeleton />
      <div className="space-y-4">
        <ChartSkeleton />
        <ListSkeleton count={3} />
      </div>
    </div>
  )
}
