import Card from './Card'
import MiniTrend from './MiniTrend'
import ProvenanceBadge from './ProvenanceBadge'
import type { ProvenanceKind, StatusTier } from './types'

interface KpiCardProps {
  label: string
  value: string
  unit?: string
  /**
   * Omit when this card sits inside a section that already carries one
   * ProvenanceBadge for the whole group (e.g. several KPIs under one
   * "Calculated" card header) — repeating it on every cramped mini-card
   * both overflows and states the same thing three times.
   */
  provenance?: ProvenanceKind
  trend?: number[]
  trendTier?: StatusTier
}

// plan.md "Decisions" → KPI cards: big mono number + provenance badge + mini trend.
export default function KpiCard({ label, value, unit, provenance, trend, trendTier }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-body-sm text-muted">{label}</span>
        {provenance && <ProvenanceBadge kind={provenance} className="shrink-0" />}
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
