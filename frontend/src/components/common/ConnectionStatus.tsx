interface Props {
  connected: boolean
  lastEventTime: string | null
}

// Live-feed chip for the navy page band: pulsing lime dot and LIVE when the
// websocket is up, a grey dot and OFFLINE when it is not.
export function ConnectionStatus({ connected, lastEventTime }: Props) {
  return (
    <span
      className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md border-2 border-on-band/40 px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-on-band"
      title={connected ? 'Live feed connected' : 'Live feed offline'}
    >
      {connected ? (
        <span className="tt-live-dot" aria-hidden />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full bg-on-band/40" aria-hidden />
      )}
      {connected ? 'Live' : 'Offline'}
      {lastEventTime && connected && (
        <span className="border-l-2 border-on-band/30 pl-2 font-medium tabular-nums opacity-75">
          {new Date(lastEventTime).toLocaleTimeString()}
        </span>
      )}
    </span>
  )
}
