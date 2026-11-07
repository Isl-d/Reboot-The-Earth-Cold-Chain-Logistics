import type { Incident } from '../../types'
import { IncidentCard } from './IncidentCard'

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

interface Props {
  incidents: Incident[]
}

export function IncidentPanel({ incidents }: Props) {
  const open = incidents
    .filter((i) => i.status === 'OPEN')
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  if (open.length === 0) {
    return (
      <div className="flex h-full min-h-32 flex-col items-center justify-center gap-3 py-4 text-center">
        <span
          className="grid h-11 w-11 place-items-center rounded-md border-[3px] border-ink bg-fill-lime text-[20px] font-extrabold text-on-fill shadow-level1"
          aria-hidden
        >
          ✓
        </span>
        <span className="tt-caps text-text-secondary">No open incidents</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-2 pr-2">
      {open.map((inc) => (
        <IncidentCard key={inc.id} incident={inc} />
      ))}
    </div>
  )
}
