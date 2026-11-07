import { clsx } from './clsx'
import InfoTip from './InfoTip'
import MiniTrend from './MiniTrend'
import ProvenanceBadge from './ProvenanceBadge'
import type { ProvenanceKind, StatusTier } from './types'

export type KpiTone = 'paper' | 'sky' | 'lime' | 'sun' | 'coral' | 'lilac'

interface KpiCardProps {
  label: string
  value: string
  unit?: string
  provenance: ProvenanceKind
  /** Hover explanation of what this value is and how it is produced. */
  tip?: string
  /**
   * Dot-only badge instead of the full pill — for a KPI grouped with
   * others inside a section that already states the provenance once in
   * its header. Every value still carries a marker.
   */
  compactProvenance?: boolean
  trend?: number[]
  trendTier?: StatusTier
  /** QAI stat-tile fill. Paper by default; gold ('sun') only for warning or finance. */
  tone?: KpiTone
}

const TONE: Record<KpiTone, string> = {
  paper: 'bg-surface text-text-primary',
  sky: 'bg-fill-sky text-on-fill',
  lime: 'bg-fill-lime text-on-fill',
  sun: 'bg-fill-sun text-on-fill',
  coral: 'bg-fill-coral text-on-fill',
  lilac: 'bg-fill-lilac text-on-fill',
}

// QAI stat tile: mono caps label, big mono number, provenance badge.
export default function KpiCard({ label, value, unit, provenance, tip, compactProvenance, trend, trendTier, tone = 'paper' }: KpiCardProps) {
  const filled = tone !== 'paper'
  return (
    <div className={clsx('tt-box tt-box-sm p-3', TONE[tone])}>
      <div className="flex items-start justify-between gap-2">
        <span className="tt-caps flex items-center gap-1.5">
          {label}
          {tip && <InfoTip title={label}>{tip}</InfoTip>}
        </span>
        <ProvenanceBadge kind={provenance} compact={compactProvenance} className="shrink-0" />
      </div>
      <div
        className={clsx(
          'mt-1.5 break-words font-mono tabular-nums',
          value.length > 10 ? 'text-telemetry-md' : 'text-telemetry-xl',
        )}
      >
        {value}
        {unit && <span className={clsx('ml-1 text-telemetry-md', filled ? 'opacity-75' : 'text-muted')}>{unit}</span>}
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-2">
          <MiniTrend data={trend} tier={trendTier} />
        </div>
      )}
    </div>
  )
}
