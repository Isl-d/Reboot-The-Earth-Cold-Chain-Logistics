import type { HTMLAttributes } from 'react'
import { clsx } from '@/design/clsx'

// DESIGN.md → Layout & Spacing: 4 cols/0.75rem gap (<768px) · 8 cols/1rem
// gap (768–1279px) · 12 cols/1.5rem gap (≥1280px). Screens place their
// sections as grid items (col-span-*) inside this instead of rolling their
// own grid.
export default function PageGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'grid grid-cols-4 gap-3 tablet:grid-cols-8 tablet:gap-4 desktop:grid-cols-12 desktop:gap-6',
        className,
      )}
      {...props}
    />
  )
}
