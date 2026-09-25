// Shared vocabulary for the design primitives — mirrors DESIGN.md's
// "Telemetry Status Semantics" and "Data Provenance Badge Semantics".

export type StatusTier = 'safe' | 'warning' | 'critical' | 'offline'

export type ProvenanceKind = 'measured' | 'calculated' | 'predicted' | 'recommended' | 'finance'

export const PROVENANCE_LABEL: Record<ProvenanceKind, string> = {
  measured: 'Measured',
  calculated: 'Calculated',
  predicted: 'Predicted',
  recommended: 'Recommended',
  finance: 'Finance-Validated',
}

// The 5 recommendation actions from docs/PERSON_2_FRONTEND_INTELLIGENCE.md §5.
export type SpecAction = 'CONTINUE' | 'TRANSFER' | 'DISCOUNT' | 'PRIORITIZE_SALE' | 'REDISTRIBUTE'

// Any other action the backend may send (decision-engine actions from
// docs/PIPELINE.md) renders with a generic style — see ActionChip.
export type BackendAction = SpecAction | (string & {})
