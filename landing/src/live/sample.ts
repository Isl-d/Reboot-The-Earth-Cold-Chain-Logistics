// Evenly spaced real readings (always keeps the first and newest); never
// interpolated, so every plotted value is one the backend actually stored.
export function sample(values: number[], n: number): number[] {
  if (values.length <= n) return values
  return Array.from({ length: n }, (_, i) => values[Math.round((i / (n - 1)) * (values.length - 1))])
}
