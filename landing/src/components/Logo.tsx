import { brand } from '@/content/copy'

// The Thermal Trace mark, the same glyph as public/favicon.svg and the
// dashboard's BrandMark (frontend/src/components/layout/BrandMark.tsx). This
// page imports nothing from frontend/, so the path is duplicated by hand.
// Brand rules: docs/brand/README.md.
export default function Logo({ size = 28, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2.4}
        strokeLinecap="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="0.5" y="0.5" width="31" height="31" rx="5.5" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1} />
        <path d="M16 5v22M6.5 10.5l19 11M6.5 21.5l19-11M13 7l3 3 3-3M13 25l3-3 3 3" />
      </svg>
      {wordmark && <span className="font-semibold tracking-tight">{brand.name}</span>}
    </span>
  )
}
