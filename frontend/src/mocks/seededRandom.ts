/*
  Deterministic pseudo-random numbers keyed by a string (e.g. a truck id or
  "truckId:warehouseId" pair), so mock values stay stable across repeated
  polls instead of jumping on every render — no dependency needed for this.
*/

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

// mulberry32 — small, fast, good-enough distribution for demo data.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable pseudo-random number in [0, 1) for the given key. */
export function seededRandom(key: string): number {
  return mulberry32(hashString(key))()
}

/** A stable pseudo-random number in [min, max) for the given key. */
export function seededRange(key: string, min: number, max: number): number {
  return min + seededRandom(key) * (max - min)
}
