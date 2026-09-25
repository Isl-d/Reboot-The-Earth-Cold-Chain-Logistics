/** React Router `state` contract for screens that navigate to Optimization with a specific truck/batch to show. */
export interface OptimizationNavState {
  truckId: string
  batchId: string
  /** Snapshot for display only — Optimization has no other way to know this batch's details when it isn't the truck's default cargo. */
  product: string
  quantityKg: number
}
