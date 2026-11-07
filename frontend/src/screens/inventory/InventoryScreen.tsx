import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvaluateOptimization, useInventory } from '@/api/hooks'
import type { InventoryBatch } from '@/api/types'
import { ActionChip, Box, FilterChip, FilterGroup, StatusChip } from '@/design'
import { clsx, FOCUS_RING } from '@/design/clsx'
import type { OptimizationNavState } from '@/lib/navigation'
import { riskLabelFromProbability, riskTierFromProbability } from '@/lib/risk'
import { filterBySelection, useMultiSelect } from '@/lib/useMultiSelect'
import DemandBar from './DemandBar'

function uniqueValues<T>(items: T[], field: (item: T) => string): string[] {
  return [...new Set(items.map(field))].sort()
}

const ROW_EDGE = {
  safe: 'border-l-status-safe',
  warning: 'border-l-status-warning',
  critical: 'border-l-status-critical',
  offline: 'border-l-status-offline',
} as const

const TD = 'px-3 py-2.5 align-middle'
const NUM = 'whitespace-nowrap text-right font-mono tabular-nums'

function CheckList({ values, selected, onToggle, capitalize }: { values: string[]; selected: Set<string>; onToggle: (v: string) => void; capitalize?: boolean }) {
  if (values.length === 0) return <p className="text-body-sm text-text-secondary">No options yet.</p>
  return (
    <>
      {values.map((v) => (
        <label key={v} className={clsx('flex items-center gap-2 text-body-sm', capitalize && 'capitalize')}>
          <input type="checkbox" checked={selected.has(v)} onChange={() => onToggle(v)} />
          {v}
        </label>
      ))}
    </>
  )
}

export default function InventoryScreen() {
  const inventory = useInventory()
  const evaluate = useEvaluateOptimization()
  const navigate = useNavigate()
  // The mutation object is shared (one request at a time), but rows are
  // independent — evaluate.isPending alone would disable every row's
  // button while any single row's request is in flight.
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null)

  const locationFilter = useMultiSelect()
  const productFilter = useMultiSelect()
  const recommendationFilter = useMultiSelect()
  const riskFilter = useMultiSelect()

  const rows = inventory.data ?? []

  const filteredRows = useMemo(() => {
    let result = rows
    result = filterBySelection(result, (r) => r.locationId, locationFilter.selected)
    result = filterBySelection(result, (r) => r.product, productFilter.selected)
    result = filterBySelection(result, (r) => r.recommendation, recommendationFilter.selected)
    result = filterBySelection(result, (r) => riskTierFromProbability(r.spoilageProbability), riskFilter.selected)
    return result
  }, [rows, locationFilter.selected, productFilter.selected, recommendationFilter.selected, riskFilter.selected])

  const locations = uniqueValues(rows, (r) => r.locationId)
  const products = uniqueValues(rows, (r) => r.product)
  const recommendations = uniqueValues(rows, (r) => r.recommendation)
  const riskTiers = uniqueValues(rows, (r) => riskTierFromProbability(r.spoilageProbability))

  const activeChips = [
    ...[...locationFilter.selected].map((l) => ({ label: `Location: ${l}`, remove: () => locationFilter.remove(l) })),
    ...[...productFilter.selected].map((l) => ({ label: `Product: ${l}`, remove: () => productFilter.remove(l) })),
    ...[...recommendationFilter.selected].map((l) => ({ label: `Action: ${l}`, remove: () => recommendationFilter.remove(l) })),
    ...[...riskFilter.selected].map((l) => ({ label: `Risk: ${l}`, remove: () => riskFilter.remove(l) })),
  ]

  function handleEvaluate(row: InventoryBatch) {
    if (!row.truckId) return
    const truckId = row.truckId
    setPendingBatchId(row.batchId)
    evaluate.mutate(
      { truckId, batchId: row.batchId },
      {
        onSettled: () => setPendingBatchId(null),
        onSuccess: () => {
          const state: OptimizationNavState = { truckId, batchId: row.batchId, product: row.product, quantityKg: row.quantityKg }
          navigate('/optimization', { state })
        },
      },
    )
  }

  return (
    <>
      <div className="col-span-4 flex flex-col gap-3 tablet:col-span-8 desktop:col-span-3 desktop:self-start">
        <Box title="Filters" meta={activeChips.length > 0 ? `${activeChips.length} active` : 'all'} bodyClassName="p-4">
          <FilterGroup title="Location">
            <CheckList values={locations} selected={locationFilter.selected} onToggle={locationFilter.toggle} />
          </FilterGroup>
          <FilterGroup title="Product">
            <CheckList values={products} selected={productFilter.selected} onToggle={productFilter.toggle} />
          </FilterGroup>
          <FilterGroup title="Recommendation">
            <CheckList values={recommendations} selected={recommendationFilter.selected} onToggle={recommendationFilter.toggle} />
          </FilterGroup>
          <FilterGroup title="Risk">
            <CheckList values={riskTiers} selected={riskFilter.selected} onToggle={riskFilter.toggle} capitalize />
          </FilterGroup>
        </Box>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={chip.remove} />
            ))}
          </div>
        )}
      </div>

      <Box
        title="Batches at the stores"
        meta={`${filteredRows.length} of ${rows.length} batches`}
        className="col-span-4 tablet:col-span-8 desktop:col-span-9"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-body-md">
            <thead className="tt-thead">
              <tr>
                <th>Batch</th>
                <th>Product</th>
                <th>Location</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Expiry</th>
                <th>Demand</th>
                <th className="text-right">Excess</th>
                <th>Risk</th>
                <th>Action</th>
                <th>
                  <span className="sr-only">Evaluate</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const tier = riskTierFromProbability(row.spoilageProbability)
                return (
                  <tr key={row.batchId} className={clsx('border-b-2 border-l-4 border-line last:border-b-0 hover:bg-elevated', ROW_EDGE[tier])}>
                    <td className={clsx(TD, 'whitespace-nowrap font-mono font-bold')}>{row.batchId}</td>
                    <td className={TD}>{row.product}</td>
                    <td className={clsx(TD, 'font-mono')}>{row.locationId}</td>
                    <td className={clsx(TD, NUM)}>{row.quantityKg} kg</td>
                    <td className={clsx(TD, NUM)}>
                      {row.expiryDate}
                      <span className={clsx('block text-[11px]', row.daysUntilExpiry <= 0 ? 'font-bold text-risk-critical' : 'text-text-secondary')}>
                        {row.daysUntilExpiry <= 0 ? 'expired' : `${row.daysUntilExpiry}d left`}
                      </span>
                    </td>
                    <td className={TD}>
                      <DemandBar predictedDemandKg={row.predictedDemandKg} quantityKg={row.quantityKg} />
                    </td>
                    <td className={clsx(TD, NUM)}>{row.expectedExcessKg} kg</td>
                    <td className={TD} title={riskLabelFromProbability(row.spoilageProbability)}>
                      <StatusChip tier={tier} label={`${(row.spoilageProbability * 100).toFixed(0)}%`} />
                    </td>
                    <td className={TD}>
                      <ActionChip action={row.recommendation} />
                    </td>
                    <td className={clsx(TD, 'text-right')}>
                      <button
                        type="button"
                        className={clsx(
                          FOCUS_RING,
                          'tt-press whitespace-nowrap bg-surface px-3 py-1 text-body-sm font-bold disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                        disabled={!row.truckId || pendingBatchId === row.batchId}
                        title={row.truckId ? undefined : 'No truck currently associated with this batch'}
                        onClick={() => handleEvaluate(row)}
                      >
                        {pendingBatchId === row.batchId ? 'Evaluating…' : 'Evaluate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filteredRows.length === 0 && (
          <p className="p-4 text-body-sm text-text-secondary">
            {inventory.isLoading ? 'Loading…' : 'No batches match the current filters.'}
          </p>
        )}
      </Box>
    </>
  )
}
