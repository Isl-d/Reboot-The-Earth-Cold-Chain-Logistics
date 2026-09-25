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
        'w-full rounded-sm border border-line bg-elevated px-3 py-2 focus:border-sky',
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
