import { clsx, FOCUS_RING } from './clsx'

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}

// Today / Day / Week range control.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={clsx('inline-flex overflow-hidden rounded-md border-[3px] border-ink bg-surface', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              FOCUS_RING,
              'border-r-[3px] border-ink px-3 py-1 font-mono text-label-code uppercase transition-colors last:border-r-0',
              active ? 'bg-fill-sky text-on-fill' : 'text-muted hover:bg-elevated hover:text-navy',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
