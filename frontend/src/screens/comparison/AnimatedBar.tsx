import { clsx } from '@/design/clsx'

interface AnimatedBarProps {
  /** 0-100, a backend percentage. */
  percent: number
  /** Fill class, e.g. bg-fill-coral. */
  colorClassName: string
  /** Mono label printed above the bar, already formatted by the caller. */
  label?: string
  /** Bar column height in px. */
  height?: number
  /** Value that fills the full column, so sibling bars share one scale. */
  scaleMax?: number
}

// QAI histogram bar: flat fill, 2px ink outline, rounded top, grows up from
// the ink baseline on mount and whenever the value changes (keyed on it).
export default function AnimatedBar({ percent, colorClassName, label, height = 180, scaleMax = 100 }: AnimatedBarProps) {
  // Display scaling only: the bar's share of the column.
  const clamped = scaleMax > 0 ? Math.min(100, Math.max(0, (percent / scaleMax) * 100)) : 0
  return (
    <div className="flex flex-col items-center">
      <div className="relative mt-6 flex w-full items-end justify-center border-b-[3px] border-ink" style={{ height }}>
        {/* faint scale lines at 25 / 50 / 75 % */}
        {[25, 50, 75].map((p) => (
          <span key={p} className="absolute inset-x-0 border-t-2 border-dashed border-line" style={{ bottom: `${p}%` }} aria-hidden />
        ))}
        <div
          key={clamped}
          className={clsx(
            'relative w-[46%] max-w-28 origin-bottom rounded-t-md border-2 border-b-0 border-ink motion-safe:animate-[tt-grow_0.7s_cubic-bezier(.2,.8,.2,1)_both]',
            colorClassName,
          )}
          style={{ height: `${Math.max(clamped, 1.5)}%` }}
        >
          {label && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[13px] font-bold">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
