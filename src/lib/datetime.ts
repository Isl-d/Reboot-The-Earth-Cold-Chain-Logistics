/*
  Generic date/duration formatting shared across screens — not tied to
  Simulation specifically, so it lives outside any one screen folder (a
  screen importing from another screen's folder is a hidden coupling; both
  Simulation and Mathematical Model use these for their telemetry charts).
*/

/** mm:ss from a millisecond duration — display formatting only, no domain math. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
