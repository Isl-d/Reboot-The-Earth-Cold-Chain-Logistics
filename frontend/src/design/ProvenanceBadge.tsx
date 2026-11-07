import { clsx } from './clsx'
import Pill from './Pill'
import { PROVENANCE_LABEL, type ProvenanceKind } from './types'

// Data provenance chips: one flat fill per kind (sky measured, paper
// calculated, lilac predicted, lime recommended, gold finance), navy text.
const VARIANT_CLASSES: Record<ProvenanceKind, string> = {
  measured: 'bg-provenance-measured-fill border-provenance-measured-border text-on-fill',
  calculated: 'bg-provenance-calculated-fill border-provenance-calculated-border text-text-primary',
  predicted: 'bg-provenance-predicted-fill border-provenance-predicted-border text-on-fill',
  recommended: 'bg-provenance-recommended-fill border-provenance-recommended-border text-on-fill',
  finance: 'bg-provenance-finance-fill border-provenance-finance-border text-on-fill',
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
   * Dot only, no label text — for dense grids where the full chip would
   * overflow. Every value still carries a provenance marker; the label is
   * available via `title`/aria.
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
        className={clsx('inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-on-fill', DOT_CLASSES[kind], className)}
      />
    )
  }
  return <Pill className={clsx('px-1.5 text-[10px]', VARIANT_CLASSES[kind], className)}>{PROVENANCE_LABEL[kind]}</Pill>
}
