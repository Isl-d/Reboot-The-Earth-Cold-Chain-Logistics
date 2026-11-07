import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiskBadge } from '../components/common/RiskBadge'
import { PageHeader } from '../components/layout/PageHeader'
import { Box, ProvenanceBadge } from '../design'
import { useTrucks } from '../hooks/useTrucks'
import type { RiskLevel, TruckSummary } from '../types'

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

// Temperature text and filter dots follow the risk scale.
const RISK_TEXT: Record<RiskLevel, string> = {
  LOW: 'text-risk-low',
  MEDIUM: 'text-risk-medium',
  HIGH: 'text-risk-high',
  CRITICAL: 'text-risk-critical',
}
const RISK_DOT: Record<RiskLevel, string> = {
  LOW: 'bg-fill-lime',
  MEDIUM: 'bg-fill-sun',
  HIGH: 'bg-fill-coral',
  CRITICAL: 'bg-fill-critical',
}

const FILTERS: (RiskLevel | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const COLS = ['Truck', 'Name', 'Temp', 'Humidity', 'Speed', 'Door', 'Refrig', 'Risk', 'Incident']

function DoorState({ open }: { open: boolean }) {
  return open ? (
    <span className="font-mono text-[12px] font-bold text-risk-critical">OPEN</span>
  ) : (
    <span className="font-mono text-[12px] text-text-secondary">CLOSED</span>
  )
}

function RefrigState({ on }: { on: boolean }) {
  return on ? (
    <span className="font-mono text-[12px] font-bold text-risk-low">ON</span>
  ) : (
    <span className="font-mono text-[12px] font-bold text-risk-critical">OFF</span>
  )
}

function IncidentState({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex animate-pulse items-center gap-1.5 whitespace-nowrap rounded-md border-2 border-on-fill bg-fill-critical px-2 py-px font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#fbf9f3]">
      Active
    </span>
  ) : (
    <span className="font-mono text-[12px] text-text-secondary opacity-60">None</span>
  )
}

export function Fleet() {
  const navigate = useNavigate()
  const { data: trucks = [] } = useTrucks()
  const [filter, setFilter] = useState<RiskLevel | 'ALL'>('ALL')

  const visible = trucks
    .filter((t) => filter === 'ALL' || t.riskLevel === filter)
    .sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel])

  const open = (t: TruckSummary) => navigate(`/trucks/${t.id}`)
  const onRowKey = (e: KeyboardEvent, t: TruckSummary) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open(t)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        eyebrow="Operate"
        title={<>The <em>fleet</em></>}
        meta={
          <span className="font-mono">
            {visible.length} of {trucks.length} trucks
          </span>
        }
      >
        <div className="flex max-w-[calc(100vw-2rem)] flex-wrap gap-2" role="group" aria-label="Filter by risk">
          {FILTERS.map((lvl) => {
            const active = filter === lvl
            const count = lvl === 'ALL' ? trucks.length : trucks.filter((t) => t.riskLevel === lvl).length
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilter(lvl)}
                aria-pressed={active}
                className={`tt-press inline-flex min-h-8 items-center gap-1.5 px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] outline-none focus-visible:shadow-focus-halo ${
                  active ? 'bg-fill-sky text-on-fill' : 'bg-surface text-text-primary'
                }`}
              >
                {lvl !== 'ALL' && (
                  <span className={`inline-block h-2.5 w-2.5 rounded-full border-2 border-ink ${RISK_DOT[lvl]}`} aria-hidden />
                )}
                {lvl}
                <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </PageHeader>

      <div className="tt-canvas min-h-0 flex-1 overflow-y-auto p-4 tablet:px-5">
        <Box
          title="Live telemetry"
          tone="sky"
          meta={
            <>
              <span className="hidden tablet:inline">Sorted by risk</span>
              <ProvenanceBadge kind="measured" />
            </>
          }
        >
          {visible.length === 0 ? (
            <div className="tt-caps flex h-40 items-center justify-center text-text-secondary">No trucks match filter</div>
          ) : (
            <>
              {/* Table from tablet up. */}
              <div className="hidden overflow-x-auto tablet:block">
                <table className="w-full border-collapse">
                  <thead className="tt-thead">
                    <tr>
                      {COLS.map((c) => (
                        <th key={c} className="whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((truck, i) => (
                      <tr
                        key={truck.id}
                        tabIndex={0}
                        onClick={() => open(truck)}
                        onKeyDown={(e) => onRowKey(e, truck)}
                        aria-label={`Open truck ${truck.id}`}
                        className="cursor-pointer border-b-2 border-border outline-none transition-colors last:border-b-0 hover:bg-elevated focus-visible:bg-elevated [&>td]:px-3 [&>td]:py-3"
                        style={{ animation: `slide-in-up 0.25s ease-out ${i * 40}ms both` }}
                      >
                        <td className="font-mono text-[14px] font-bold text-text-primary">{truck.id}</td>
                        <td className="max-w-[260px] truncate text-[13px] text-text-secondary">{truck.name}</td>
                        <td className={`font-mono text-[14px] font-bold tabular-nums ${RISK_TEXT[truck.riskLevel]}`}>
                          {truck.temperatureC.toFixed(1)}°C
                        </td>
                        <td className="font-mono text-[13px] tabular-nums text-text-primary">{truck.humidityPct}%</td>
                        <td className="whitespace-nowrap font-mono text-[13px] tabular-nums text-text-primary">
                          {truck.speedKmh} km/h
                        </td>
                        <td><DoorState open={truck.doorOpen} /></td>
                        <td><RefrigState on={truck.refrigerationOn} /></td>
                        <td><RiskBadge level={truck.riskLevel} score={truck.riskScore} /></td>
                        <td><IncidentState active={truck.activeIncident} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stacked rows on phones. */}
              <div className="tablet:hidden">
                {visible.map((truck) => (
                  <button
                    key={truck.id}
                    type="button"
                    onClick={() => open(truck)}
                    className="block w-full border-b-2 border-border px-3.5 py-3 text-left outline-none transition-colors last:border-b-0 hover:bg-elevated focus-visible:bg-elevated"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-[15px] font-bold text-text-primary">{truck.id}</span>
                        <span className="ml-2 text-[12px] text-text-secondary">{truck.name}</span>
                      </span>
                      <RiskBadge level={truck.riskLevel} score={truck.riskScore} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5">
                      <div>
                        <div className="tt-caps text-[10px] text-text-secondary">Temp</div>
                        <div className={`font-mono text-[14px] font-bold ${RISK_TEXT[truck.riskLevel]}`}>
                          {truck.temperatureC.toFixed(1)}°C
                        </div>
                      </div>
                      <div>
                        <div className="tt-caps text-[10px] text-text-secondary">Humidity</div>
                        <div className="font-mono text-[13px] text-text-primary">{truck.humidityPct}%</div>
                      </div>
                      <div>
                        <div className="tt-caps text-[10px] text-text-secondary">Speed</div>
                        <div className="font-mono text-[13px] text-text-primary">{truck.speedKmh} km/h</div>
                      </div>
                      <div>
                        <div className="tt-caps text-[10px] text-text-secondary">Door</div>
                        <DoorState open={truck.doorOpen} />
                      </div>
                      <div>
                        <div className="tt-caps text-[10px] text-text-secondary">Refrig</div>
                        <RefrigState on={truck.refrigerationOn} />
                      </div>
                      <div>
                        <div className="tt-caps text-[10px] text-text-secondary">Incident</div>
                        <IncidentState active={truck.activeIncident} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </Box>
      </div>
    </div>
  )
}
