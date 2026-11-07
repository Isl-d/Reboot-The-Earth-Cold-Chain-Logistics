import { useNavigate } from 'react-router-dom'
import { ConnectionStatus } from '../components/common/ConnectionStatus'
import { NotificationBell } from '../components/common/NotificationBell'
import { RiskBadge } from '../components/common/RiskBadge'
import { StatCard } from '../components/common/StatCard'
import { PageHeader } from '../components/layout/PageHeader'
import { IncidentPanel } from '../components/incident/IncidentPanel'
import { LiveMap, MapLegend } from '../components/map/LiveMap'
import { SimulationControls } from '../components/simulation/SimulationControls'
import { Box, ProvenanceBadge } from '../design'
import { useIncidents } from '../hooks/useIncidents'
import { useTrucks } from '../hooks/useTrucks'
import { useWebSocket } from '../hooks/useWebSocket'
import { useFoodLossAnalytics } from '../api/hooks/useAnalytics'
import type { RiskLevel } from '../types'

// Temperature bar fill per risk level (same scale as RiskBadge).
const BAR_FILL: Record<RiskLevel, string> = {
  LOW: 'bg-fill-lime',
  MEDIUM: 'bg-fill-sun',
  HIGH: 'bg-fill-coral',
  CRITICAL: 'bg-fill-critical',
}

export function CommandCenter() {
  const navigate = useNavigate()
  const { data: trucks = [] } = useTrucks()
  const { data: incidents = [] } = useIncidents()
  const { data: foodLoss } = useFoodLossAnalytics()
  const { connected, lastEventTime } = useWebSocket()

  const atRisk = trucks.filter((t) => t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL').length
  const openIncidents = incidents.filter((i) => i.status === 'OPEN')
  const hasCritical = openIncidents.some((i) => i.severity === 'CRITICAL')
  const incidentTone = openIncidents.length === 0 ? 'lime' : hasCritical ? 'critical' : 'coral'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        eyebrow="Operate"
        title={<>Cold chain, <em>live</em></>}
        meta={<span className="font-mono tabular-nums">{new Date().toLocaleString()}</span>}
      >
        <ConnectionStatus connected={connected} lastEventTime={lastEventTime} />
        <NotificationBell incidents={incidents} />
      </PageHeader>

      {/* Scrolls on phones and tablets; on desktop the map fills the height. */}
      <div className="tt-canvas flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 tablet:px-5 lg:overflow-hidden">
        {/* ── KPI tiles ─────────────────────────────────────── */}
        <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Active trucks" value={trucks.length} tone="sky" provenance="measured" />
          <StatCard label="At risk" value={atRisk} highlight={atRisk > 0} provenance="calculated" />
          <StatCard label="Food saved" value={foodLoss ? Math.round(foodLoss.savedKg) : '-'} unit="kg" tone="lime" provenance="calculated" />
          <StatCard
            label="Loss prevented"
            value={foodLoss ? Math.round(foodLoss.estimatedFinancialLossPrevented).toLocaleString() : '-'}
            unit={foodLoss ? 'QAR' : undefined}
            provenance="calculated"
          />
        </div>

        {/* ── Map + side column ─────────────────────────────── */}
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
          <Box
            title="Live map"
            tone="sky"
            meta={
              <span className="tabular-nums">
                {trucks.length} trucks · {openIncidents.length} incidents
              </span>
            }
            className="h-[440px] tablet:h-[560px] lg:h-auto lg:min-h-0"
            bodyClassName="flex flex-col"
          >
            <div className="isolate min-h-0 flex-1">
              <LiveMap trucks={trucks} onTruckClick={(id) => navigate(`/trucks/${id}`)} />
            </div>
            <MapLegend />
          </Box>

          <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(120px,1fr)_minmax(0,auto)_auto]">
            {/* Active incidents */}
            <Box
              title="Active incidents"
              tone={incidentTone}
              meta={openIncidents.length > 0 ? `${openIncidents.length} open` : 'All clear'}
              className="max-h-[420px] lg:max-h-none lg:min-h-0"
              bodyClassName="overflow-y-auto py-3 pl-3 pr-2"
            >
              <IncidentPanel incidents={incidents} />
            </Box>

            {/* Sensor monitoring */}
            <Box
              title="Sensor monitoring"
              tone="sky"
              meta={<ProvenanceBadge kind="measured" />}
              className="lg:max-h-[300px] lg:min-h-0"
              bodyClassName="flex flex-col"
            >
              <div
                className="tt-caps grid shrink-0 grid-cols-[56px_minmax(0,1fr)_62px_92px] items-center gap-3 bg-band px-3.5 py-1.5 text-on-band"
                aria-hidden
              >
                <span>Truck</span>
                <span>Cargo temp</span>
                <span className="text-right">°C</span>
                <span className="text-right">Risk</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {trucks.length === 0 && (
                  <div className="tt-caps px-3.5 py-6 text-center text-text-secondary">Waiting for sensors</div>
                )}
                {trucks.map((truck) => {
                  const tempPct = Math.min(100, Math.max(0, (truck.temperatureC / 12) * 100))
                  return (
                    <button
                      key={truck.id}
                      type="button"
                      onClick={() => navigate(`/trucks/${truck.id}`)}
                      className="grid w-full grid-cols-[56px_minmax(0,1fr)_62px_92px] items-center gap-3 border-b-2 border-border px-3.5 py-2 text-left outline-none transition-colors last:border-b-0 hover:bg-elevated focus-visible:bg-elevated"
                      aria-label={`${truck.id}, ${truck.temperatureC.toFixed(1)} degrees, ${truck.riskLevel} risk`}
                    >
                      <span className="font-mono text-[13px] font-bold text-text-primary">{truck.id}</span>
                      <span className="h-3.5 overflow-hidden rounded-[4px] border-2 border-ink bg-elevated">
                        <span
                          className={`block h-full border-r-2 border-ink transition-[width] duration-700 ease-out ${BAR_FILL[truck.riskLevel]}`}
                          style={{ width: `${tempPct}%` }}
                        />
                      </span>
                      <span className="text-right font-mono text-[13px] font-bold tabular-nums text-text-primary">
                        {truck.temperatureC.toFixed(1)}
                      </span>
                      <span className="text-right">
                        <RiskBadge level={truck.riskLevel} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </Box>

            {/* Simulation controls */}
            <SimulationControls trucks={trucks} />
          </div>
        </div>
      </div>
    </div>
  )
}
