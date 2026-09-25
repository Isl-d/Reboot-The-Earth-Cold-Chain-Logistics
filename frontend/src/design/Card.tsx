import type { HTMLAttributes } from 'react'
import { clsx } from './clsx'

// DESIGN.md → card: surface tone, 1px structural border, 4px radius, no shadow.
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'min-w-0 rounded-md border border-line bg-card transition-colors',
        'hover:border-line-strong',
        className,
      )}
      {...props}
    />
  )
}
