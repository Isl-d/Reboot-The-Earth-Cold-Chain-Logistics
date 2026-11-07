import { clsx } from './clsx'
import Pill from './Pill'
import type { StatusTier } from './types'

// Telemetry status semantics: lime safe, gold warning, coral critical.
const LABEL: Record<StatusTier, string> = {
  safe: 'Safe',
  warning: 'Warning',
  critical: 'Critical',
  offline: 'Offline',
}

// Kept as a fully static map — a template-built class name would be
// invisible to Tailwind's JIT scanner.
const CLASSES: Record<StatusTier, string> = {
  safe: 'bg-status-safe-tint border-status-safe-border text-on-fill',
  warning: 'bg-status-warning-tint border-status-warning-border text-on-fill',
  critical: 'bg-status-critical-tint border-status-critical-border text-on-fill',
  offline: 'bg-status-offline-tint border-status-offline-border text-status-offline-fg',
}

interface StatusChipProps {
  tier: StatusTier
  /** Override the default tier label, e.g. "Excursion Breach". */
  label?: string
  className?: string
}

export default function StatusChip({ tier, label, className }: StatusChipProps) {
  return <Pill className={clsx('px-2 text-label-code', CLASSES[tier], className)}>{label ?? LABEL[tier]}</Pill>
}
