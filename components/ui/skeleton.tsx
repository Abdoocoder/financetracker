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











)
}
export function StatsSkeleton() {
return (

{[1,2,3].map(i => (




))}

)
}
export function PageSkeleton() {
return (













)
}
