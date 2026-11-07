// The Thermal Trace mark, the same glyph as landing/public/favicon.svg (landing
// imports nothing from here, so the path is duplicated, not shared). Rendered
// as the QAI logo tile: maroon fill, 3px ink frame, hard offset shadow.
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-md border-[3px] border-ink bg-fill-maroon shadow-level1 ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="#fbf9f3"
        strokeWidth={3}
        strokeLinecap="round"
      >
        <path d="M16 5v22M6.5 10.5l19 11M6.5 21.5l19-11M13 7l3 3 3-3M13 25l3-3 3 3" />
      </svg>
    </span>
  )
}
