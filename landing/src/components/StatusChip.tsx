// How far along a capability is. Running features are solid; designed ones
// are dashed, so nothing designed is ever mistaken for something built.

export type Status = 'live' | 'simulated' | 'designed'

export const statusOf = (label: string): Status =>
  /designed/i.test(label) ? 'designed' : /simulated/i.test(label) ? 'simulated' : 'live'

const style: Record<Status, string> = {
  live: 'border-risk-low/40 text-risk-low',
  simulated: 'border-risk-medium/40 text-risk-medium',
  designed: 'border-dashed border-text-secondary/60 text-text-secondary',
}

export default function StatusChip({ label, className = '' }: { label: string; className?: string }) {
  const s = statusOf(label)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium ${style[s]} ${className}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${s === 'designed' ? 'border border-current' : 'bg-current'}`} />
      {label}
    </span>
  )
}
