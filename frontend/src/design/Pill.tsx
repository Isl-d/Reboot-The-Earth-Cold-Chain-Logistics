import type { ReactNode } from 'react'
import { clsx } from './clsx'

// Shared base for every pill-shaped chip (DESIGN.md → Shapes: "status tags,
// telemetry chips, and data provenance badges strictly utilize the pill
// shape"). StatusChip, ProvenanceBadge, ActionChip, LiveBadge, and
// FilterChip all render through this instead of repeating the same
// `rounded-full border` markup.
export default function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-0.5', className)}>
      {children}
    </span>
  )
}

export function PillDot({ className }: { className?: string }) {
  return <span className={clsx('h-[6px] w-[6px] shrink-0 rounded-full', className)} aria-hidden />
}
