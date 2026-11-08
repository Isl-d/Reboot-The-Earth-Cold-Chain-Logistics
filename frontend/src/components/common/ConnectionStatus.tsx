interface Props {
  connected: boolean
  lastEventTime: string | null
  /** Running on mock data (VITE_USE_MOCKS): say so instead of OFFLINE. */
  demo?: boolean
}

export function ConnectionStatus({ connected, lastEventTime, demo = false }: Props) {
  if (demo) {
    return (
      <div className="flex items-center gap-2" title="Simulated data: no live backend">
        <span className="w-2 h-2 rounded-full bg-risk-medium animate-pulse" aria-hidden="true" />
        <span className="text-[11px] tracking-[0.06em] uppercase font-medium text-text-secondary">DEMO DATA</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${connected ? 'bg-risk-low animate-pulse' : 'bg-text-secondary'}`}
      />
      <span className="text-[11px] tracking-[0.06em] uppercase font-medium text-text-secondary">
        {connected ? 'LIVE' : 'OFFLINE'}
      </span>
      {lastEventTime && connected && (
        <span className="text-[11px] font-mono text-text-secondary opacity-60">
          {new Date(lastEventTime).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
