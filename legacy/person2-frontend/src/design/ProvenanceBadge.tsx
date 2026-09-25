import { clsx } from './clsx'
import Pill, { PillDot } from './Pill'
import { PROVENANCE_LABEL, type ProvenanceKind } from './types'

// DESIGN.md → Components → Data Provenance Badges
const VARIANT_CLASSES: Record<ProvenanceKind, string> = {
  measured: 'bg-provenance-measured-fill border-provenance-measured-border text-provenance-measured-fg',
  calculated: 'bg-provenance-calculated-fill border-provenance-calculated-border text-provenance-calculated-fg',
  predicted: 'bg-provenance-predicted-fill border-provenance-predicted-border text-provenance-predicted-fg',
  recommended: 'bg-provenance-recommended-fill border-provenance-recommended-border text-provenance-recommended-fg',
  finance: 'bg-provenance-finance-fill border-provenance-finance-border text-provenance-finance-fg',
}

const DOT_CLASSES: Record<ProvenanceKind, string> = {
  measured: 'bg-provenance-measured-dot',
  calculated: 'bg-provenance-calculated-dot',
  predicted: 'bg-provenance-predicted-dot',
  recommended: 'bg-provenance-recommended-dot',
  finance: 'bg-provenance-finance-dot',
}

interface ProvenanceBadgeProps {
  kind: ProvenanceKind
  className?: string
  /**
   * Dot only, no label text — for dense grids (e.g. several KPI mini-cards
   * in one row) where the full pill would overflow. DESIGN.md requires
   * every value to carry a provenance marker for audit integrity; this
   * keeps that marker without repeating the same label three times in a
   * few square inches. The label is still available via `title`/aria.
   */
  compact?: boolean
}

export default function ProvenanceBadge({ kind, className, compact }: ProvenanceBadgeProps) {
  if (compact) {
    return (
      <span
        role="img"
        aria-label={`${PROVENANCE_LABEL[kind]} value`}
        title={PROVENANCE_LABEL[kind]}
        className={clsx('inline-block h-2 w-2 shrink-0 rounded-full', DOT_CLASSES[kind], className)}
      />
    )
  }
  return (
    <Pill className={clsx('px-2 text-label-code uppercase', VARIANT_CLASSES[kind], className)}>
      <PillDot className={DOT_CLASSES[kind]} />
      {PROVENANCE_LABEL[kind]}
    </Pill>
  )
}
