import type { HTMLAttributes } from 'react'
import { clsx } from './clsx'

// DESIGN.md → Elevation & Depth → Surface Level 0 / Level 1
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'min-w-0 rounded-lg border border-line bg-card transition-shadow',
        'hover:border-line-strong hover:shadow-level1',
        className,
      )}
      {...props}
    />
  )
}
