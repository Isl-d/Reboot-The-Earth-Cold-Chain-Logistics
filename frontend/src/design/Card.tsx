import type { HTMLAttributes } from 'react'
import { clsx } from './clsx'

// QAI card: paper, 3px ink frame, 6px radius, hard 3px offset shadow.
// Use <Box> when the card needs a header bar.
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('tt-box tt-box-sm overflow-visible', className)} {...props} />
}
