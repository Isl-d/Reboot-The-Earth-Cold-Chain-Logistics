// A small badge that says where a value came from. CLAUDE.md: every displayed
// value carries a provenance tag, and synthetic data is never shown as measured.

type Tag =
  | 'MEASURED'
  | 'CALCULATED'
  | 'PREDICTED'
  | 'OPTIMIZED'
  | 'AI-EXPLAINED'
  | 'SYNTHETIC'
  | 'SIMULATED'
  | 'CITED'
  | 'ILLUSTRATIVE'
  | 'AI-GENERATED'

const palette: Record<Tag, { dot: string; fg: string }> = {
  MEASURED: { dot: 'var(--color-provenance-measured-dot)', fg: 'var(--color-provenance-measured-fg)' },
  CALCULATED: { dot: 'var(--color-provenance-calculated-dot)', fg: 'var(--color-provenance-calculated-fg)' },
  PREDICTED: { dot: 'var(--color-provenance-predicted-dot)', fg: 'var(--color-provenance-predicted-fg)' },
  OPTIMIZED: { dot: 'var(--color-provenance-recommended-dot)', fg: 'var(--color-provenance-recommended-fg)' },
  'AI-EXPLAINED': { dot: 'var(--color-primary)', fg: 'var(--color-primary)' },
  SYNTHETIC: { dot: 'var(--color-provenance-finance-dot)', fg: 'var(--color-provenance-finance-fg)' },
  SIMULATED: { dot: 'var(--color-provenance-finance-dot)', fg: 'var(--color-provenance-finance-fg)' },
  CITED: { dot: 'var(--color-text-secondary)', fg: 'var(--color-text-secondary)' },
  ILLUSTRATIVE: { dot: 'var(--color-text-secondary)', fg: 'var(--color-text-secondary)' },
  'AI-GENERATED': { dot: 'var(--color-text-secondary)', fg: 'var(--color-text-secondary)' },
}

export default function ProvenanceTag({ tag, className = '' }: { tag: Tag; className?: string }) {
  const { dot, fg } = palette[tag]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-border/70 bg-base/60 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.06em] backdrop-blur-sm ${className}`}
      style={{ color: fg }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: dot }} />
      {tag}
    </span>
  )
}

export type { Tag as ProvenanceTagName }
