import Card from './Card'
import MiniTrend from './MiniTrend'
import ProvenanceBadge from './ProvenanceBadge'
import type { ProvenanceKind, StatusTier } from './types'

interface TelemetryValueCardProps {
  zoneId: string
  provenance: ProvenanceKind
  value: string
  trend: number[]
  trendTier?: StatusTier
  safeWindowLabel: string
  qarAtRisk?: string
}

// DESIGN.md → Components → Telemetry Value Display Cards
export default function TelemetryValueCard({
  zoneId,
  provenance,
  value,
  trend,
  trendTier,
  safeWindowLabel,
  qarAtRisk,
}: TelemetryValueCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-muted">{zoneId}</span>
        <ProvenanceBadge kind={provenance} />
      </div>
      <div className="mt-2 font-mono text-telemetry-xl tabular-nums text-navy">{value}</div>
      <div className="mt-2">
        <MiniTrend data={trend} tier={trendTier} height={36} />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-label-ui text-muted">
        <span>{safeWindowLabel}</span>
        {qarAtRisk && <span className="font-mono tabular-nums text-status-warning-fg">{qarAtRisk}</span>}
      </div>
    </Card>
  )
}
