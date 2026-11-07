import type { ReactNode } from 'react'

/**
 * A hover/focus tooltip that explains what a card or value is. Pure CSS (no JS
 * state, no dependency), so it works anywhere and costs nothing.
 */
export default function InfoTip({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`group relative inline-flex align-middle ${className ?? ''}`}>
      <span
        aria-hidden
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border-2 border-current text-[10px] font-bold leading-none opacity-70"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-72 max-w-[90vw] -translate-x-1/2 whitespace-normal break-words tt-box tt-box-sm p-3 text-left text-body-sm font-normal normal-case tracking-normal text-navy group-hover:block group-focus-within:block"
      >
        {title && <span className="mb-1 block text-label-ui uppercase text-muted">{title}</span>}
        {children}
      </span>
    </span>
  )
}