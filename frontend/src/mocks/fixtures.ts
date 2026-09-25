/*
  Static reference data for the mock backend — several trucks, batches, and
  Qatar warehouses, per plan.md "Decisions" → Data before backend. This is
  demo-only fixture data; the real backend owns the actual fleet/inventory.
*/

export interface TruckFixture {
  id: string
  label: string
  batchId: string
}

export interface BatchFixture {
  id: string
  product: string
  quantityKg: number
}

export interface WarehouseFixture {
  id: string
  label: string
  capacityKg: number
  /** Baseline transport cost (QAR) and ETA (min) before scenario-driven variance. */
  baseTransportCost: number
  baseEtaMinutes: number
  temperatureCompatible: boolean
}

export interface StoreFixture {
  id: string
  label: string
}

export const TRUCKS: TruckFixture[] = [
  { id: 'T101', label: 'T-101 — Doha Industrial Route', batchId: 'CHK-1029' },
  { id: 'T102', label: 'T-102 — Al Wakrah Route', batchId: 'BEF-2031' },
  { id: 'T103', label: 'T-103 — Lusail Route', batchId: 'FSH-3042' },
]

export const BATCHES: BatchFixture[] = [
  { id: 'CHK-1029', product: 'Fresh Chicken', quantityKg: 500 },
  { id: 'BEF-2031', product: 'Fresh Beef', quantityKg: 320 },
  { id: 'FSH-3042', product: 'Fresh Fish', quantityKg: 180 },
  { id: 'DRY-4051', product: 'Dairy — Milk', quantityKg: 600 },
  { id: 'VEG-5062', product: 'Mixed Vegetables', quantityKg: 420 },
]

export const WAREHOUSES: WarehouseFixture[] = [
  { id: 'WH01', label: 'WH01 — Doha North', capacityKg: 1200, baseTransportCost: 143, baseEtaMinutes: 18, temperatureCompatible: true },
  { id: 'WH02', label: 'WH02 — Al Wakrah', capacityKg: 400, baseTransportCost: 121, baseEtaMinutes: 27, temperatureCompatible: true },
  { id: 'WH03', label: 'WH03 — Industrial Area', capacityKg: 900, baseTransportCost: 98, baseEtaMinutes: 34, temperatureCompatible: true },
  { id: 'WH04', label: 'WH04 — Al Rayyan (ambient)', capacityKg: 1500, baseTransportCost: 76, baseEtaMinutes: 41, temperatureCompatible: false },
]

export const STORES: StoreFixture[] = [
  { id: 'STORE01', label: 'Al Meera — West Bay' },
  { id: 'STORE02', label: 'Lulu Hypermarket — Al Wakrah' },
  { id: 'STORE03', label: 'Carrefour — Al Rayyan' },
]

export function findTruck(truckId: string): TruckFixture | undefined {
  return TRUCKS.find((t) => t.id === truckId)
}

export function findBatch(batchId: string): BatchFixture | undefined {
  return BATCHES.find((b) => b.id === batchId)
}
