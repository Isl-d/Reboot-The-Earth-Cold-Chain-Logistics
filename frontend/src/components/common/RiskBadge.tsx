import type { RiskLevel } from '../../types'

// Risk scale: lime LOW, gold MEDIUM, coral HIGH, deep red CRITICAL.
const styles: Record<RiskLevel, string> = {
  LOW: 'bg-fill-lime text-on-fill',
  MEDIUM: 'bg-fill-sun text-on-fill',
  HIGH: 'bg-fill-coral text-on-fill',
  CRITICAL: 'bg-fill-critical text-[#fbf9f3] animate-pulse',
}

interface Props {
  level: RiskLevel
  score?: number
  className?: string
}

export function RiskBadge({ level, score, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border-2 border-on-fill px-2 py-px font-mono text-[11px] font-bold uppercase tracking-[0.06em] ${styles[level]} ${className}`}
    >
      {level}
      {score !== undefined && <span className="opacity-70 ml-0.5">{score}</span>}
    </span>
  )
}
