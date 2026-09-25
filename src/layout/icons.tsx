/*
  Small inline stroke icons — one per screen plus the collapse chevron.
  No icon library dependency (not part of the approved stack); each is a
  minimal 20x20 SVG using currentColor so it inherits the nav's text color.
*/
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function SimulationIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M8.3 7.2 L13 10 L8.3 12.8 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ModelIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="4" cy="10" r="1.6" />
      <circle cx="10" cy="4.5" r="1.6" />
      <circle cx="10" cy="15.5" r="1.6" />
      <circle cx="16" cy="10" r="1.6" />
      <path d="M5.4 9.3 L8.7 5.6 M5.4 10.7 L8.7 14.4 M11.3 5.6 L14.6 9.3 M11.3 14.4 L14.6 10.7" />
    </svg>
  )
}

export function OptimizationIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="7.5" />
      <circle cx="10" cy="10" r="4" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 16.5V3.5M3.5 16.5H16.5" />
      <rect x="6" y="10.5" width="2.2" height="6" fill="currentColor" stroke="none" />
      <rect x="9.9" y="7" width="2.2" height="9.5" fill="currentColor" stroke="none" />
      <rect x="13.8" y="12.5" width="2.2" height="4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function InventoryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6.5 10 3l6.5 3.5v7L10 17l-6.5-3.5z" />
      <path d="M3.5 6.5 10 10l6.5-3.5M10 10v7" />
    </svg>
  )
}

export function ComparisonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4 3.5 7.5 7 11" />
      <path d="M13 9 16.5 12.5 13 16" />
      <path d="M3.5 7.5h9M7 12.5h9.5" />
    </svg>
  )
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 5.5v11l4.5-2 4 2 4.5-2v-11l-4.5 2-4-2-4.5 2z" />
      <path d="M8 4.5v11M12 6.5v11" />
    </svg>
  )
}

export function ChevronIcon({ direction = 'left', ...props }: IconProps & { direction?: 'left' | 'right' }) {
  return (
    <svg {...base} {...props}>
      <path d={direction === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
    </svg>
  )
}
