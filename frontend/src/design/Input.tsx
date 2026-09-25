import type { InputHTMLAttributes } from 'react'
import { clsx, FOCUS_RING } from './clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Fixed trailing unit affordance, e.g. °C, min, QAR, kg — DESIGN.md → Form Inputs & Controls. */
  unit?: string
}

export default function Input({ unit, className, ...props }: InputProps) {
  return (
    <div className={clsx('relative', className)}>
      <input
        className={clsx(
          FOCUS_RING,
          'w-full rounded border border-line-strong bg-card px-3 py-2',
          'font-mono text-body-md tabular-nums text-navy placeholder:text-muted',
          unit && 'pr-12',
        )}
        {...props}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-label-ui text-muted">
          {unit}
        </span>
      )}
    </div>
  )
}
