import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiskBadge } from '../components/common/RiskBadge'
import { PageHeader } from '../components/layout/PageHeader'
import { Box, Button, SegmentedControl, type BoxTone } from '../design'
import { useIncidents } from '../hooks/useIncidents'
import type { IncidentStatus } from '../types'

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

// Open incidents get a header bar on the risk scale. Resolved ones drop back
// to paper so the page does not shout about closed cases.
const SEVERITY_TONE: Record<string, BoxTone> = {
  CRITICAL: 'critical',
  HIGH: 'coral',
  MEDIUM: 'sun',
  LOW: 'lime',
}

const TYPE_LABELS: Record<string, string> = {
  TEMPERATURE_EXCURSION: 'Temperature excursion',
  REFRIGERATION_FAILURE: 'Refrigeration failure',
  DOOR_LEFT_OPEN: 'Door left open',
  TRAFFIC_DELAY: 'Traffic delay',
  COMBINED_FAILURE: 'Combined failure',
}

function timeAgo(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ${m % 60}m ago`
}

export function Incidents() {
  const navigate = useNavigate()
  const { data: incidents = [] } = useIncidents()
  const [tab, setTab] = useState<IncidentStatus>('OPEN')

  const filtered = incidents
    .filter((i) => i.status === tab)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const openCount = incidents.filter((i) => i.status === 'OPEN').length
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        eyebrow="Operate"
        title={<>Incident <em>log</em></>}
        meta={
          <span className="font-mono">
            {openCount} open · {resolvedCount} resolved
          </span>
        }
      >
        <SegmentedControl<IncidentStatus>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'OPEN', label: `Open ${openCount}` },
            { value: 'RESOLVED', label: `Resolved ${resolvedCount}` },
          ]}
          className="shadow-level1"
        />
      </PageHeader>

      <div className="tt-canvas min-h-0 flex-1 overflow-y-auto p-4 tablet:px-5">
        {filtered.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3">
            <span
              className={`grid h-12 w-12 place-items-center rounded-md border-[3px] border-ink text-[22px] font-extrabold shadow-level1 ${
                tab === 'OPEN' ? 'bg-fill-lime text-on-fill' : 'bg-surface text-text-secondary'
              }`}
              aria-hidden
            >
              {tab === 'OPEN' ? '✓' : '○'}
            </span>
            <span className="tt-caps text-text-secondary">No {tab.toLowerCase()} incidents</span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] gap-4 pb-1">
            {filtered.map((inc, i) => {
              const isOpen = tab === 'OPEN'
              return (
                <Box
                  key={inc.id}
                  tone={isOpen ? (SEVERITY_TONE[inc.severity] ?? 'lime') : 'paper'}
                  title={
                    <span className="flex items-center gap-2">
                      {isOpen ? <span className="tt-caps">{inc.severity}</span> : <RiskBadge level={inc.severity} />}
                      <span>Truck {inc.truckId}</span>
                    </span>
                  }
                  meta={<span className="tabular-nums">{timeAgo(inc.createdAt)}</span>}
                  className={
                    isOpen && inc.severity === 'CRITICAL'
                      ? '[animation:slide-in-up_0.3s_ease-out_both,glow-critical_2s_ease-in-out_infinite]'
                      : '[animation:slide-in-up_0.3s_ease-out_both]'
                  }
                  style={{ animationDelay: `${i * 60}ms, 0ms` }}
                  bodyClassName="flex flex-col gap-3 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="tt-caps text-text-primary">
                      {TYPE_LABELS[inc.type] ?? inc.type.replace(/_/g, ' ')}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-secondary">
                      {new Date(inc.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="m-0 text-[13px] leading-relaxed text-text-secondary">{inc.message}</p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t-2 border-border pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tt-chip">Batch {inc.batchId}</span>
                      <span className="font-mono text-[11px] text-text-secondary">{inc.id}</span>
                      {!isOpen && (
                        <span className="tt-chip bg-fill-lime text-on-fill">Resolved</span>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/trucks/${inc.truckId}`)}
                      className="min-h-8! px-3! text-[13px]!"
                    >
                      View truck →
                    </Button>
                  </div>
                </Box>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
