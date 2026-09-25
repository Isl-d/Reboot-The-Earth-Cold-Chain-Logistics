import { clsx } from './clsx'

// Pulsing LIVE indicator for the top bar — plan.md "Approved extras" #1.
export default function LiveBadge({ live = true, className }: { live?: boolean; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label-code uppercase',
        live
          ? 'border-status-safe-border bg-status-safe-tint text-status-safe-fg'
          : 'border-status-offline-border bg-status-offline-tint text-status-offline-fg',
        className,
      )}
    >
      <span className="relative flex h-[6px] w-[6px]">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-safe opacity-75" />
        )}
        <span
          className={clsx('relative inline-flex h-[6px] w-[6px] rounded-full', live ? 'bg-status-safe' : 'bg-status-offline')}
        />
      </span>
      {live ? 'Live' : 'Offline'}
    </span>
  )
}
