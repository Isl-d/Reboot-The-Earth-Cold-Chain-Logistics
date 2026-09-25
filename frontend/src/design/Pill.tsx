import type { ReactNode } from 'react'
import { clsx } from './clsx'

// Shared base for every chip (DESIGN.md → Shapes: 2px radius for badges and
// chips). StatusChip, ProvenanceBadge, ActionChip, LiveBadge, and
// FilterChip all render through this instead of repeating the same markup.
export default function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border py-0.5', className)}>
      {children}
    </span>
  )
}

export function PillDot({ className }: { className?: string }) {
  return <span className={clsx('h-[6px] w-[6px] shrink-0 rounded-full', className)} aria-hidden />
}
