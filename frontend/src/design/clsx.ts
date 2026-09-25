// Minimal classnames joiner — avoids pulling in a dependency for one function.
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

// DESIGN.md → "Elevation & Depth" → Thermal Focus Indication. Shared so every
// focusable primitive (Button, Input, Select, Modal's close button, etc.)
// gets the exact same ring instead of repeating the utility pair.
export const FOCUS_RING = 'outline-none focus-visible:shadow-focus-halo'
