import type { ReactNode } from 'react'

/**
 * The navy page band every page shares (the QAI hero, compacted for a
 * working screen): mono caps eyebrow, bold title, then meta and controls.
 * Wrap one word of `title` in <em> for the maroon highlight.
 * `leading` sits before the title (e.g. a back link), `meta` under it,
 * `children` on the right.
 */
export function PageHeader({
  title,
  eyebrow = 'Thermal Trace',
  leading,
  meta,
  children,
}: {
  title: ReactNode
  /** Mono caps line above the title, e.g. "Operate" or "Analyse". */
  eyebrow?: ReactNode
  leading?: ReactNode
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b-[3px] border-ink bg-band px-4 py-3 text-on-band tablet:px-5">
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          <span className="tt-caps block text-fill-sky">{eyebrow}</span>
          <h1 className="tt-title m-0 truncate text-[24px] font-extrabold leading-[1.1] tracking-[-0.02em] tablet:text-[28px]">
            {title}
          </h1>
          {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] opacity-85">{meta}</div>}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
