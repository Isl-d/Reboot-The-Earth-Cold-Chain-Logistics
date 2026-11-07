import { useState, type ReactNode } from 'react'
import { clsx, FOCUS_RING } from './clsx'
import Pill from './Pill'

// Collapsible filter side panel, modelled on Emerson's fleet dashboard.

interface FilterGroupProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export function FilterGroup({ title, children, defaultOpen = true }: FilterGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b-2 border-line py-3 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(FOCUS_RING, 'flex w-full items-center justify-between text-label-ui uppercase text-muted')}
      >
        {title}
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

export function FilterPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('tt-box tt-box-sm p-4', className)}>{children}</div>
  )
}

export function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <Pill className="border-ink bg-fill-sky px-2 text-label-code text-on-fill">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className={clsx(FOCUS_RING, 'rounded-sm leading-none hover:text-navy')}
      >
        ×
      </button>
    </Pill>
  )
}
