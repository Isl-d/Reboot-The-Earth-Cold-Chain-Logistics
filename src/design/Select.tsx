import type { SelectHTMLAttributes } from 'react'
import { clsx } from './clsx'

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
        'focus-halo w-full rounded border border-line-strong bg-surface px-3 py-2',
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
