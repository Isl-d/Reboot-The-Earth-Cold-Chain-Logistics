import type { HTMLAttributes } from 'react'
import { clsx } from '@/design/clsx'

// 4 cols (<768px) · 8 cols (768–1279px) · 12 cols (≥1280px), ported from
// Person 2's layout so the intelligence screens keep their col-span-* layout.
// The 8px gap matches the command-center panels (DESIGN.md 4px/8px rhythm).
export default function PageGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'grid grid-cols-4 gap-2 tablet:grid-cols-8 desktop:grid-cols-12',
        className,
      )}
      {...props}
    />
  )
}
