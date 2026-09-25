import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Candidate, type FoodLoss, type TruckItem } from './api'

// Polls the command center's backend and hands the landing page one snapshot.
// status 'offline' means every section shows its scripted fallback instead.

const POLL_MS = 5000
const TRACE_WINDOW_MIN = 10

export interface Focus {
  truckId: string
  product: string
  quantityKg: number
  safeMaxC: number
  routeName?: string
  /** Stored readings for the last few minutes, oldest first. */
  temps: number[]
  latestC: number | null
  action: string | null
  targetId: string | null
  candidates: Candidate[]
  selectedId: string | null
  foodSavedKg: number | null
  qarPrevented: number | null
}

export interface LiveSnapshot {
  status: 'connecting' | 'live' | 'offline'
  trucks: TruckItem[]
  openIncidents: number
  foodLoss: FoodLoss | null
  focus: Focus | null
  updatedAt: Date | null
}

const initial: LiveSnapshot = {
  status: 'connecting',
  trucks: [],
  openIncidents: 0,
  foodLoss: null,
  focus: null,
  updatedAt: null,
}

const LiveContext = createContext<LiveSnapshot>(initial)

export const useLive = () => useContext(LiveContext)

// The truck the page tells the story about: the one in trouble, else T102.
function pickFocus(trucks: TruckItem[]): TruckItem | undefined {
  return (
    trucks.find((t) => t.activeIncident && t.batchId) ??
    trucks.find((t) => t.id === 'T102') ??
    trucks.find((t) => t.batchId)
  )
}

async function loadFocus(t: TruckItem, foodLoss: FoodLoss | null): Promise<Focus> {
  const until = t.lastUpdated ? new Date(t.lastUpdated) : new Date()
  const from = new Date(until.getTime() - TRACE_WINDOW_MIN * 60_000).toISOString()
  const [detail, readings, opt] = await Promise.all([
    api.truck(t.id),
    api.telemetry(t.id, from).catch(() => []),
    t.batchId ? api.optimization(t.batchId).catch(() => null) : Promise.resolve(null),
  ])
  const batchLoss = foodLoss?.batches.find((b) => b.batchId === t.batchId)
  const temps = readings.map((r) => r.temperatureC).filter((c): c is number => c !== null)
  return {
    truckId: t.id,
    product: detail.batch?.product ?? t.product,
    quantityKg: detail.batch?.quantityKg ?? t.quantityKg,
    safeMaxC: detail.batch?.safeMaxTempC ?? 4,
    routeName: detail.truck.routeName,
    temps,
    latestC: detail.truck.temperatureC ?? temps.at(-1) ?? null,
    action: detail.recommendation?.action ?? null,
    targetId: detail.recommendation?.destinationId ?? opt?.optimization.selectedWarehouseId ?? null,
    candidates: opt?.optimization.candidates ?? [],
    selectedId: opt?.optimization.selectedWarehouseId ?? null,
    foodSavedKg: batchLoss?.foodSavedKg ?? null,
    qarPrevented: batchLoss?.financialLossPrevented ?? null,
  }
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<LiveSnapshot>(initial)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const [trucks, foodLoss, incidents] = await Promise.all([
          api.trucks(),
          api.foodLoss().catch(() => null),
          api.incidents().catch(() => []),
        ])
        const t = pickFocus(trucks)
        const focus = t ? await loadFocus(t, foodLoss).catch(() => null) : null
        if (!cancelled) {
          setSnap({
            status: 'live',
            trucks,
            openIncidents: incidents.filter((i) => i.status === 'OPEN').length,
            foodLoss,
            focus,
            updatedAt: new Date(),
          })
        }
      } catch {
        if (!cancelled) setSnap((s) => ({ ...s, status: 'offline' }))
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS)
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return <LiveContext.Provider value={snap}>{children}</LiveContext.Provider>
}
