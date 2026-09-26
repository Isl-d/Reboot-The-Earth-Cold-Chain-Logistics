import Card from './Card'
import InfoTip from './InfoTip'
import MiniTrend from './MiniTrend'
import ProvenanceBadge from './ProvenanceBadge'
import type { ProvenanceKind, StatusTier } from './types'

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
   * its header. DESIGN.md still requires a marker on every value; this
   * keeps one without three overflowing, repeated labels. See
   * ProvenanceBadge's `compact` for details.
   */
  compactProvenance?: boolean
  trend?: number[]
  trendTier?: StatusTier
}

// plan.md "Decisions" → KPI cards: big mono number + provenance badge + mini trend.
export default function KpiCard({ label, value, unit, provenance, tip, compactProvenance, trend, trendTier }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-body-sm text-muted">
          {label}
          {tip && <InfoTip title={label}>{tip}</InfoTip>}
        </span>
        <ProvenanceBadge kind={provenance} compact={compactProvenance} className="shrink-0" />
      </div>
      <div className="mt-2 font-mono text-telemetry-xl tabular-nums text-navy">
        {value}
        {unit && <span className="ml-1 text-telemetry-md text-muted">{unit}</span>}
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-2">
          <MiniTrend data={trend} tier={trendTier} />
        </div>
      )}
    </Card>
  )
}
