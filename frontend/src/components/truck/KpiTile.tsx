import type { ReactNode } from 'react'
import { clsx } from '../../design/clsx'
import { TILE_FILL, type TileTone } from './tones'

interface Props {
  label: string
  value: string
  unit?: string
  tone?: TileTone
  /** Provenance badge (or chip) for the value. */
  provenance: ReactNode
  /** Mono sub-line under the number, e.g. the safe range. */
  sub?: ReactNode
  className?: string
}

// QAI stat tile: coloured fill, mono caps label, big mono number, provenance
// top right. Adds the deep-red CRITICAL fill the shared KpiCard does not have.
export default function KpiTile({ label, value, unit, tone = 'paper', provenance, sub, className }: Props) {
  return (
    <div className={clsx('tt-box flex flex-col gap-1.5 p-3 [animation:slide-in-up_0.35s_ease-out_both]', TILE_FILL[tone], className)}>
      {/* Phones: badge above the label so a 2-up tile never squeezes either. */}
      <div className="flex flex-col-reverse items-start gap-1 tablet:flex-row tablet:justify-between tablet:gap-2">
        <span className="tt-caps leading-tight">{label}</span>
        <span className="shrink-0">{provenance}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1.5 font-mono tabular-nums">
        <span className="text-[26px] font-bold leading-none tracking-[-0.02em] tablet:text-[34px]">{value}</span>
        {unit && <span className="text-[13px] font-bold opacity-75">{unit}</span>}
      </div>
      {sub && <div className="font-mono text-[11px] font-bold leading-snug opacity-80">{sub}</div>}
    </div>
  )
}
