import { useState } from 'react'
import type { Incident } from '../../types'

// Header-bar fill follows the risk scale: lime LOW, gold MEDIUM, coral HIGH,
// deep red CRITICAL.
const SEVERITY_TONE: Record<string, string> = {
  CRITICAL: 'tt-tone-critical',
  HIGH: 'tt-tone-coral',
  MEDIUM: 'tt-tone-sun',
  LOW: 'tt-tone-lime',
}

function timeAgo(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ${m % 60}m ago`
}

interface Props { incident: Incident; reasoning?: string }

// Compact incident box for the command-center panel: severity-toned header
// bar, then the type, the message and the incident id.
export function IncidentCard({ incident, reasoning }: Props) {
  const [expanded, setExpanded] = useState(false)
  const tone = SEVERITY_TONE[incident.severity] ?? SEVERITY_TONE.LOW
  const critical = incident.severity === 'CRITICAL'

  return (
    <article
      className={`tt-box tt-box-sm ${
        critical
          ? '[animation:slide-in-up_0.3s_ease-out_both,glow-critical_2s_ease-in-out_infinite]'
          : '[animation:slide-in-up_0.3s_ease-out_both]'
      }`}
    >
      <div className={`tt-hd px-3 py-1.5 text-[13px] ${tone}`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="tt-caps">{incident.severity}</span>
          <span className="truncate">Truck {incident.truckId}</span>
        </span>
        <span className="tt-caps opacity-80">{timeAgo(incident.createdAt)}</span>
      </div>

      <div className="space-y-1.5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="tt-caps text-text-primary">{incident.type.replace(/_/g, ' ')}</span>
          <span className="font-mono text-[10px] text-text-secondary">{incident.id}</span>
        </div>
        <p className="m-0 text-[12px] leading-relaxed text-text-secondary">{incident.message}</p>

        {reasoning && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="tt-caps flex items-center gap-1 text-primary hover:underline"
          >
            {expanded ? '▾' : '▸'} View reasoning
          </button>
        )}

        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: expanded && reasoning ? 220 : 0 }}
        >
          {reasoning && (
            <div className="mt-1 overflow-hidden rounded-md border-2 border-ink">
              <div className="tt-caps border-b-2 border-ink bg-fill-lilac px-2.5 py-1 text-on-fill">
                AI reasoning
              </div>
              <p className="m-0 bg-surface px-2.5 py-2 text-[12px] leading-relaxed text-text-primary">{reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
