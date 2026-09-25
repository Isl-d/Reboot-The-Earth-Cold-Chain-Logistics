import { clsx } from './clsx'
import Pill, { PillDot } from './Pill'
import type { StatusTier } from './types'

// DESIGN.md → Colors → Telemetry Status Semantics
const LABEL: Record<StatusTier, string> = {
  safe: 'Safe',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
}

const CLASSES: Record<StatusTier, string> = {
  safe: 'bg-status-safe-tint border-status-safe-border text-status-safe-fg',
  warning: 'bg-status-warning-tint border-status-warning-border text-status-warning-fg',
  critical: 'bg-status-critical-tint border-status-critical-border text-status-critical-fg',
  offline: 'bg-status-offline-tint border-status-offline-border text-status-offline-fg',
}

// Dot color kept as a fully static map — a template-built class name
// (e.g. `bg-status-${tier}`) would be invisible to Tailwind's JIT scanner.
const DOT_CLASSES: Record<StatusTier, string> = {
  safe: 'bg-status-safe',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  offline: 'bg-status-offline',
}

interface StatusChipProps {
  tier: StatusTier
  /** Override the default tier label, e.g. "Excursion Breach". */
  label?: string
  className?: string
}

export default function StatusChip({ tier, label, className }: StatusChipProps) {
  return (
    <Pill className={clsx('px-2.5 text-label-ui', CLASSES[tier], className)}>
      <PillDot className={DOT_CLASSES[tier]} />
      {label ?? LABEL[tier]}
    </Pill>
  )
}
