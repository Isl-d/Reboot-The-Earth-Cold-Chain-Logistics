import ProvenanceBadge from '../../design/ProvenanceBadge'
import type { ProvenanceKind } from '../../design/types'

export type StatTone = 'paper' | 'sky' | 'lime' | 'sun' | 'coral' | 'lilac'

interface Props {
  label: string
  value: string | number
  unit?: string
  /** Alarm state: critical fill and a red hard shadow. */
  highlight?: boolean
  dim?: boolean
  /** QAI stat-tile fill. Gold ('sun') only for warning or finance. */
  tone?: StatTone
  /** Provenance dot shown beside the label (every value carries a tag). */
  provenance?: ProvenanceKind
}

const TONE: Record<StatTone, string> = {
  paper: 'bg-surface text-text-primary',
  sky: 'bg-fill-sky text-on-fill',
  lime: 'bg-fill-lime text-on-fill',
  sun: 'bg-fill-sun text-on-fill',
  coral: 'bg-fill-coral text-on-fill',
  lilac: 'bg-fill-lilac text-on-fill',
}

// QAI stat tile: coloured fill, mono caps label, big mono number.
export function StatCard({ label, value, unit, highlight, dim, tone = 'paper', provenance }: Props) {
  return (
    <div
      className={`tt-box tt-box-sm flex flex-col gap-1 p-3 [animation:slide-in-up_0.4s_ease-out_both] ${
        highlight ? 'bg-fill-coral text-on-fill [animation:glow-critical_2s_ease-in-out_infinite]' : TONE[tone]
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="tt-caps">{label}</span>
        {provenance && <ProvenanceBadge kind={provenance} compact />}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-mono text-[26px] font-bold leading-none tabular-nums [animation:count-up_0.5s_ease-out_both] ${
            dim ? 'opacity-60' : ''
          }`}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-[12px] font-bold opacity-75">{unit}</span>}
      </div>
    </div>
  )
}
