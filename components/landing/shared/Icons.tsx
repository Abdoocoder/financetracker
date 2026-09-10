'use client'

import { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const defaults: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function TrophyIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M8 21h8m-4-4v4m-4-8a4 4 0 0 1-4-4V4h16v5a4 4 0 0 1-4 4" />
      <path d="M4 4H2v3a2 2 0 0 0 2 2m16-5h2v3a2 2 0 0 1-2 2" />
    </svg>
  )
}

export function CardIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

export function HandshakeIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M11 17l-2 2-4-4 5-5 3 3" />
      <path d="M14 7l3-3 4 4-3 3" />
      <path d="M3 7l4-4 4 4" />
      <path d="M7 21l4-4" />
    </svg>
  )
}

export function TargetIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function TrendingUpIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

export function CoinsIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="M16.71 13.88l.7.71-2.82 2.82" />
    </svg>
  )
}

export function FileTextIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

export function CalculatorIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="8" y1="18" x2="8" y2="18.01" />
      <line x1="12" y1="18" x2="16" y2="18" />
    </svg>
  )
}

export function MosqueIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M12 2v4" />
      <path d="M6 8v6a6 6 0 0 0 12 0V8" />
      <path d="M6 8h12" />
      <path d="M9 14v4" />
      <path d="M15 14v4" />
      <path d="M3 8h3" />
      <path d="M18 8h3" />
    </svg>
  )
}

export function BotIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="16" cy="16" r="1" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function GamepadIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <circle cx="18" cy="11" r="1" fill="currentColor" />
      <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    </svg>
  )
}

export function BookIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

export function MapIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export function SmartphoneIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

export function PenIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function BarChartIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}

export function RocketIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

export function StarIcon(props: IconProps) {
  const { size, ...rest } = props
  return (
    <svg {...defaults} width={size} height={size} {...rest}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
    </svg>
  )
}
