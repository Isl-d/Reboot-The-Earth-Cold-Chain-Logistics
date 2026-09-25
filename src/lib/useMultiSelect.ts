import { useState } from 'react'

/**
 * Standard "empty selection = show everything" multi-select filter state —
 * shared by every screen with a FilterPanel checkbox group (Food-Loss
 * Analytics, Inventory) instead of each reimplementing it.
 */
export function useMultiSelect() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggle = (label: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  const remove = (label: string) => setSelected((prev) => new Set([...prev].filter((l) => l !== label)))
  return { selected, toggle, remove }
}

/** Filters items by a string field against a multi-select set; empty set = no filtering. */
export function filterBySelection<T>(items: T[], field: (item: T) => string, included: Set<string>): T[] {
  return included.size === 0 ? items : items.filter((item) => included.has(field(item)))
}
