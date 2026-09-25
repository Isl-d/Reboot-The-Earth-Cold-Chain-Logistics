import { clsx } from './clsx'
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
}

export default function ProvenanceBadge({ kind, className }: ProvenanceBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5',
        'text-label-code uppercase',
        VARIANT_CLASSES[kind],
        className,
      )}
    >
      <span className={clsx('h-[6px] w-[6px] rounded-full', DOT_CLASSES[kind])} aria-hidden />
      {PROVENANCE_LABEL[kind]}
    </span>
  )
}
