import type { ReactNode } from 'react'
import { clsx } from './clsx'

// Shared base for every chip: QAI bordered chip, 2px border, 6px radius,
// mono caps. StatusChip, ProvenanceBadge, ActionChip, LiveBadge, and
// FilterChip all render through this instead of repeating the same markup.
export default function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border-2 py-px font-mono font-bold uppercase tracking-[0.06em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PillDot({ className }: { className?: string }) {
  return <span className={clsx('h-[7px] w-[7px] shrink-0 rounded-full border border-on-fill', className)} aria-hidden />
}
