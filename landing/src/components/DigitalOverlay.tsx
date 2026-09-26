// The "digital twin" treatment laid over the AI footage: fine scanlines, a
// slow scan beam and HUD corner brackets. The brand tint is baked into the
// clips themselves (a CSS blend over video repaints every frame). Pure decoration; it
// never carries a reading, and nothing here claims to be a camera feed.
export default function DigitalOverlay({ brackets = true, className = '' }: { brackets?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="scanlines absolute inset-0" />
      <div className="scan-beam absolute inset-x-0 top-0 h-56" />
      {brackets && (
        <div className="absolute inset-x-3 top-[4.75rem] bottom-3 sm:inset-x-4 sm:bottom-4">
          <span className="hud-corner top-0 left-0 border-t border-l" />
          <span className="hud-corner top-0 right-0 border-t border-r" />
          <span className="hud-corner bottom-0 left-0 border-b border-l" />
          <span className="hud-corner right-0 bottom-0 border-r border-b" />
        </div>
      )}
    </div>
  )
}
