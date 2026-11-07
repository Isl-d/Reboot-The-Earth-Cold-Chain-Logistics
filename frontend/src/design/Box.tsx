import type { HTMLAttributes, ReactNode } from 'react'
import { clsx } from './clsx'

export type BoxTone = 'paper' | 'sky' | 'lime' | 'sun' | 'coral' | 'lilac' | 'maroon' | 'critical' | 'ink'

interface BoxProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Bold header-bar title. Omit for a plain framed box. */
  title?: ReactNode
  /** Right side of the header bar: mono caps meta, chips, controls. */
  meta?: ReactNode
  /** Header-bar fill. Gold ('sun') is for warning/finance only. */
  tone?: BoxTone
  /** Smaller 3px shadow, for dense rows of boxes. */
  small?: boolean
  bodyClassName?: string
}

// The QAI box: paper, 3px ink frame, hard offset shadow, optional coloured
// header bar with an ink rule under it. Classes live in index.css (.tt-box,
// .tt-hd, .tt-tone-*) so inline-styled screens can use the same look.
export default function Box({ title, meta, tone = 'paper', small, className, bodyClassName, children, ...props }: BoxProps) {
  return (
    <section className={clsx('tt-box flex flex-col', small && 'tt-box-sm', className)} {...props}>
      {(title || meta) && (
        <div className={clsx('tt-hd', `tt-tone-${tone}`)}>
          <span className="min-w-0">{title}</span>
          {meta && <span className="tt-caps flex items-center gap-2">{meta}</span>}
        </div>
      )}
      <div className={clsx('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}
