import { useEffect, useRef, useState } from 'react'
import type { Incident } from '../../types'
import { RiskBadge } from './RiskBadge'

function timeAgo(ts: string) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

interface Props {
  incidents: Incident[]
}

// Bell on the page band: a pressable paper square with a count tab, and a
// QAI box dropdown listing the open incidents.
export function NotificationBell({ incidents }: Props) {
  const open = incidents.filter((i) => i.status === 'OPEN')
  const hasCritical = open.some((i) => i.severity === 'CRITICAL')
  const [showPanel, setShowPanel] = useState(false)
  const [ringing, setRinging] = useState(false)
  const prevCount = useRef(open.length)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open.length > prevCount.current) {
      setRinging(true)
      setTimeout(() => setRinging(false), 700)
    }
    prevCount.current = open.length
  }, [open.length])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setShowPanel((v) => !v)}
        className="tt-press relative flex h-9 w-9 items-center justify-center bg-surface text-text-primary outline-none focus-visible:shadow-focus-halo"
        title="Notifications"
        aria-label={`Notifications, ${open.length} open incidents`}
        aria-expanded={showPanel}
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-[18px] w-[18px] ${ringing ? '[animation:ring_0.6s_ease-in-out]' : ''}`}
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
        </svg>

        {open.length > 0 && (
          <span
            className={`absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-md border-2 border-ink px-1 font-mono text-[10px] font-bold leading-none ${
              hasCritical ? 'animate-pulse bg-fill-critical text-[#fbf9f3]' : 'bg-fill-coral text-on-fill'
            }`}
          >
            {open.length}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="tt-box absolute right-0 top-12 z-[1050] w-[min(20rem,calc(100vw-2rem))] [animation:slide-in-up_0.2s_ease-out_both]">
          <div className={`tt-hd ${open.length === 0 ? 'tt-tone-lime' : hasCritical ? 'tt-tone-critical' : 'tt-tone-coral'}`}>
            <span>Active incidents</span>
            <span className="tt-caps">{open.length === 0 ? 'All clear' : `${open.length} open`}</span>
          </div>

          {open.length === 0 ? (
            <div className="p-4 text-center text-[13px] text-text-secondary">No open incidents</div>
          ) : (
            <div className="max-h-72 overflow-auto">
              {open.map((inc) => (
                <div
                  key={inc.id}
                  className="border-b-2 border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-elevated"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={inc.severity} />
                      <span className="font-mono text-[12px] font-bold text-text-primary">{inc.truckId}</span>
                    </div>
                    <span className="font-mono text-[10px] text-text-secondary">{timeAgo(inc.createdAt)}</span>
                  </div>
                  <p className="m-0 line-clamp-2 text-[12px] leading-snug text-text-secondary">{inc.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
