import type { StatusTier } from '@/design'

/**
 * Buckets the backend's own spoilageProbability into a status tier for the
 * Risk chip — a presentation-only classification (like any Safe/Warning/
 * Critical chip in DESIGN.md), not a recomputation of the probability
 * itself. The number always comes straight from the backend.
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
