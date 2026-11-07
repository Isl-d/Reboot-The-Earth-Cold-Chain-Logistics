import type { SelectHTMLAttributes } from 'react'
import { clsx, FOCUS_RING } from './clsx'

interface Option {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: Option[]
}

export default function Select({ options, className, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        FOCUS_RING,
        'min-h-10 w-full rounded-md border-[3px] border-ink bg-surface px-3 py-1.5 font-bold',
        'text-body-md text-navy',
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
