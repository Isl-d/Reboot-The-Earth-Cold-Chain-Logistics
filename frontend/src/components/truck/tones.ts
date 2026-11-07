import type { RiskLevel } from '../../types'

// QAI colour roles for risk: lime LOW, gold MEDIUM, coral HIGH, deep red
// CRITICAL. Gold appears only for MEDIUM; it is never decorative.
export type TileTone = 'paper' | 'sky' | 'lime' | 'sun' | 'coral' | 'lilac' | 'critical'

export const RISK_TONE: Record<RiskLevel, TileTone> = {
  LOW: 'lime',
  MEDIUM: 'sun',
  HIGH: 'coral',
  CRITICAL: 'critical',
}

/** Ontology boxes have no deep-red fill, so CRITICAL falls back to coral. */
export const RISK_ONTOLOGY_TONE: Record<RiskLevel, 'lime' | 'sun' | 'coral'> = {
  LOW: 'lime',
  MEDIUM: 'sun',
  HIGH: 'coral',
  CRITICAL: 'coral',
}

export const TILE_FILL: Record<TileTone, string> = {
  paper: 'bg-surface text-text-primary',
  sky: 'bg-fill-sky text-on-fill',
  lime: 'bg-fill-lime text-on-fill',
  sun: 'bg-fill-sun text-on-fill',
  coral: 'bg-fill-coral text-on-fill',
  lilac: 'bg-fill-lilac text-on-fill',
  critical: 'bg-fill-critical text-[#fbf9f3]',
}

/** Format a backend number for display, or "—" when it is missing. */
export function fmt(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'
}
