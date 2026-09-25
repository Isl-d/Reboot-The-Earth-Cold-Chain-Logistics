import { useState, type ReactNode } from 'react'
import { clsx, FOCUS_RING } from './clsx'
import Pill from './Pill'

// Collapsible filter side panel — plan.md "Approved extras" #3, borrowed from example 4 (Emerson).

interface FilterGroupProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export function FilterGroup({ title, children, defaultOpen = true }: FilterGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line py-3 first:pt-0 last:border-b-0">
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
    <div className={clsx('rounded-lg border border-line bg-surface p-4', className)}>{children}</div>
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
    <Pill className="border-sky-tint bg-sky-tint px-2.5 text-label-ui text-[#0284C7]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className={clsx(FOCUS_RING, 'rounded-full leading-none hover:text-navy')}
      >
        ×
      </button>
    </Pill>
  )
}
