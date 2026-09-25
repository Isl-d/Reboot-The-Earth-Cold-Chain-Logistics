// The Thermal Trace mark, the same glyph as landing/public/favicon.svg (landing
// imports nothing from here, so the path is duplicated, not shared). Drawn
// inline in theme tokens so it follows dark/light mode; the favicon file keeps
// the fixed dark tile for browser tabs.
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="6" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1} />
      <path d="M16 5v22M6.5 10.5l19 11M6.5 21.5l19-11M13 7l3 3 3-3M13 25l3-3 3 3" />
    </svg>
  )
}
