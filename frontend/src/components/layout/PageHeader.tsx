import type { ReactNode } from 'react'

/**
 * The 44px Tactical Slate topbar every page shares, so command-center and
 * intelligence routes line up: same height, gutter, title style and divider.
 * `leading` sits before the title (e.g. a back link), `meta` after it,
 * `children` on the right.
 */
export function PageHeader({
  title,
  leading,
  meta,
  children,
}: {
  title: ReactNode
  leading?: ReactNode
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-border bg-base px-4">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        {leading && <span className="h-3.5 w-px bg-border" aria-hidden="true" />}
        <h1 className="m-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-text-primary">{title}</h1>
        {meta && <span className="h-3.5 w-px bg-border" aria-hidden="true" />}
        {meta}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  )
}
