import { clsx, FOCUS_RING } from './clsx'

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}

// Today / Day / Week range control — borrowed from examples 2, 3, 5 (plan.md "Approved extras").
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={clsx('inline-flex rounded border border-line-strong bg-canvas p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              FOCUS_RING,
              'rounded px-3 py-1 text-label-ui transition-colors',
              active ? 'bg-card text-navy shadow-level1' : 'text-muted hover:text-navy',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
