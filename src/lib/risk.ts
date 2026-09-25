import type { StatusTier } from '@/design'

/**
 * Buckets a backend-supplied probability (spoilageProbability) into a status
 * tier — a presentation-only classification (like any Safe/Warning/Critical
 * chip in DESIGN.md), not a recomputation of the probability itself. Shared
 * across screens (Mathematical Model, Inventory) rather than living under
 * one screen folder and being cross-imported by another.
 */
export function riskTierFromProbability(spoilageProbability: number): StatusTier {
  if (spoilageProbability >= 0.4) return 'critical'
  if (spoilageProbability >= 0.15) return 'warning'
  return 'safe'
}

export function riskLabelFromProbability(spoilageProbability: number): string {
  if (spoilageProbability >= 0.4) return 'High Risk'
  if (spoilageProbability >= 0.15) return 'Elevated Risk'
  return 'Low Risk'
}
