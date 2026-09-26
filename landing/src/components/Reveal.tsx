import { useEffect, useRef, useState, type ReactNode } from 'react'

export type RevealFrom = 'below' | 'above' | 'left' | 'right' | 'zoom'

/** Fires once, the first time the element scrolls into view. */
export function useInView<T extends Element>(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return [ref, visible] as const
}

// Slides its children in the first time they scroll into view: from below by
// default, or from the side named in `from`. Reduced motion is handled in CSS
// (.reveal is static there).
export default function Reveal({
  children,
  delay = 0,
  from = 'below',
  className = '',
}: {
  children: ReactNode
  delay?: number
  from?: RevealFrom
  className?: string
}) {
  const [ref, visible] = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      data-from={from}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
