import { useEffect, useState } from 'react'
import { clsx } from '@/design/clsx'

interface AnimatedBarProps {
  percent: number
  colorClassName: string
  trackClassName?: string
}

// Animates from 0 to the target width on mount/change — plan.md "Decisions"
// → Scenario Comparison: "animated loss bars".
export default function AnimatedBar({ percent, colorClassName, trackClassName }: AnimatedBarProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setWidth(0)
    const id = requestAnimationFrame(() => setWidth(Math.min(100, Math.max(0, percent))))
    return () => cancelAnimationFrame(id)
  }, [percent])

  return (
    <div className={clsx('h-3 w-full overflow-hidden rounded-full', trackClassName ?? 'bg-canvas')}>
      <div className={clsx('h-full rounded-full transition-all duration-700 ease-out', colorClassName)} style={{ width: `${width}%` }} />
    </div>
  )
}
